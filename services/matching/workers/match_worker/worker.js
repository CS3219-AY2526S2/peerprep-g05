import dotenv from "dotenv";
import { v4 as uuid, v5 as uuidv5 } from "uuid";

import { createChannel } from "../../infrastructure/rabbitmq/client.js";
import { acquireLock, releaseLock } from "../../infrastructure/redis/lock.js";
import { postgres } from "../../infrastructure/postgres/client.js";
import { redis } from "../../infrastructure/redis/client.js";
import {
    createMatch,
    cancelMatch,
    insertMatchEvent,
    proposeMatch,
    redirectMatch,
} from "../../domain/match/matchRepository.js";
import { insertOutboxEvent } from "../../domain/match/outboxRepository.js";

dotenv.config();

const REQUEUE_NAMESPACE = "b7e2d4a1-1234-5678-abcd-000000000001";

function isCompatible(diffA, diffB) {
    return diffA === "ANY" || diffB === "ANY" || diffA === diffB;
}

// ─── Worker bootstrap ────────────────────────────────────────────────────────

async function startWorker() {
    const channel = await createChannel();
    await channel.prefetch(1);

    await channel.assertExchange(process.env.MATCH_EXCHANGE, "topic", { durable: true });

    const queue = await channel.assertQueue("match.worker.queue", { durable: true });

    await channel.bindQueue(queue.queue, process.env.MATCH_EXCHANGE, "match.enter");
    await channel.bindQueue(queue.queue, process.env.MATCH_EXCHANGE, "match.requeue");
    await channel.bindQueue(queue.queue, process.env.MATCH_EXCHANGE, "match.leave");

    channel.consume(queue.queue, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        console.log("Received event:", event);

        try {
            if (routingKey === "match.enter")   await handleMatchEnter(event);
            if (routingKey === "match.requeue") await handleMatchRequeue(event);
            if (routingKey === "match.leave")   await handleMatchLeave(event);
            channel.ack(msg);
        } catch (err) {
            console.error(`Error handling ${routingKey}:`, err);
            if (err.message === "LOCK_BUSY") {
                channel.nack(msg, false, true);  // requeue — lock contention, retry
            } else {
                channel.nack(msg, false, false); // dead-letter — unrecoverable
            }
        }
    });

    console.log("Match worker started.");
}

// ─── match.enter ─────────────────────────────────────────────────────────────

async function handleMatchEnter(event) {
    const { match_id, user_id, topic, difficulty } = event;

    const processedKey = `processed_event:${event.event_id}`;
    if (await redis.get(processedKey)) {
        console.log(`Skipping duplicate event ${event.event_id}`);
        return;
    }

    const queueKey = `match_queue:${topic}`;
    const lockKey  = `match_lock:${topic}`;

    const lock = await acquireLock(redis, lockKey, 30);
    if (!lock) throw new Error("LOCK_BUSY");

    try {
        // Double-check inside the lock to guard against concurrent workers
        if (await redis.get(processedKey)) {
            console.log(`Event ${event.event_id} already processed by another worker`);
            return;
        }

        // Evict any stale entries for this user (e.g. old difficulty before relaxation)
        const existing = await redis.lrange(queueKey, 0, -1);
        for (const entry of existing) {
            if (JSON.parse(entry).user_id === user_id) {
                await redis.lrem(queueKey, 0, entry);
                console.log(`Evicted stale queue entry for ${user_id}`);
            }
        }

        // Push the fresh entry
        await redis.rpush(queueKey, JSON.stringify({ user_id, match_id, difficulty }));

        // Drain as many compatible pairs as possible
        while (true) {
            const raw = await redis.lrange(queueKey, 0, -1);
            if (raw.length < 2) break;

            const users = raw.map(u => JSON.parse(u));
            const head  = users[0];

            const partnerIdx = users.findIndex(
                (u, i) => i > 0 && isCompatible(head.difficulty, u.difficulty)
            );

            if (partnerIdx === -1) {
                console.log(`No compatible partner for ${head.user_id} (${head.difficulty})`);
                break;
            }

            const userA = head;
            const userB = users[partnerIdx];

            // Remove both from Redis before any DB work
            await redis.lrem(queueKey, 1, raw[0]);
            await redis.lrem(queueKey, 1, raw[partnerIdx]);

            const client = await postgres.connect();
            try {
                await client.query("BEGIN");

                // proposeMatch: transitions userA's match WAITING → PROPOSED
                const proposed = await proposeMatch(client, userA, userB, 0.45);
                if (!proposed) {
                    // userA's match_id is stale (already cancelled/expired)
                    await client.query("ROLLBACK");
                    await redis.rpush(queueKey, raw[partnerIdx]); // userB is still valid

                    console.log(`Stale userA ${userA.user_id} — requeueing via outbox`);
                    continue;
                }

                // redirectMatch: transitions userB's match WAITING → REDIRECTED
                const redirected = await redirectMatch(client, userB, userA);
                if (!redirected) {
                    // userB's match_id is stale
                    await client.query("ROLLBACK");
                    await redis.rpush(queueKey, raw[0]); // userA is still valid

                    console.log(`Stale userB ${userB.user_id} — requeueing via outbox`);
                    continue;
                }

                await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.proposed", {
                    match_id:   userA.match_id,
                    user_id_a:  userA.user_id,
                    user_id_b:  userB.user_id,
                });

                await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.redirected", {
                    match_id:      userB.match_id,
                    user_id_b:     userB.user_id,
                    redirected_to: userA.match_id,
                });

                await client.query("COMMIT");
                console.log(`Matched ${userA.user_id} (${userA.difficulty}) ↔ ${userB.user_id} (${userB.difficulty})`);

            } catch (err) {
                await client.query("ROLLBACK");
                // Restore both users to the front of the queue so they aren't lost
                await redis.lpush(queueKey, raw[partnerIdx]);
                await redis.lpush(queueKey, raw[0]);
                throw err;
            } finally {
                client.release();
            }
        }

        await redis.set(processedKey, "1", "EX", 3600);

    } finally {
        await releaseLock(redis, lockKey);
    }
}

// ─── match.leave ─────────────────────────────────────────────────────────────

async function handleMatchLeave(event) {
    const { user_id, topic, difficulty, match_id } = event;

    const queueKey = `match_queue:${topic}`;
    const lockKey  = `match_lock:${topic}`;

    const lock = await acquireLock(redis, lockKey, 10);
    if (!lock) throw new Error("LOCK_BUSY");

    try {
        // Remove any Redis queue entries for this user
        const raw = await redis.lrange(queueKey, 0, -1);
        for (const entry of raw) {
            if (JSON.parse(entry).user_id === user_id) {
                await redis.lrem(queueKey, 0, entry);
                console.log(`Removed ${user_id} from queue ${queueKey}`);
            }
        }

        const client = await postgres.connect();
        try {
            await client.query("BEGIN");

            const cancelled = await cancelMatch(client, match_id);
            if (!cancelled) {
                await client.query("ROLLBACK");
                console.log(`No WAITING match to cancel for ${user_id} (match ${match_id})`);
                return;
            }

            await insertMatchEvent(client, uuid(), match_id, "MATCH_CANCELLED", { user_id });
            await client.query("COMMIT");
            console.log(`User ${user_id} left matchmaking (topic=${topic}, difficulty=${difficulty})`);

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

    } finally {
        await releaseLock(redis, lockKey);
    }
}

// ─── match.requeue ───────────────────────────────────────────────────────────

async function handleMatchRequeue(event) {
    const { event_id, user_id, topic, difficulty } = event;

    const processedKey = `processed_event:${event_id}`;
    if (await redis.get(processedKey)) {
        console.log(`Skipping duplicate requeue event ${event_id}`);
        return;
    }

    // Deterministic IDs ensure exactly-once semantics on retry
    const newMatchId    = uuidv5(event_id, REQUEUE_NAMESPACE);
    const enterEventId  = uuidv5(`enter:${event_id}`, REQUEUE_NAMESPACE);

    const client = await postgres.connect();
    try {
        await client.query("BEGIN");

        await createMatch(client, newMatchId, user_id, topic, difficulty);

        await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.enter", {
            event_id:   enterEventId,
            match_id:   newMatchId,
            user_id,
            topic,
            difficulty,
        });

        await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.waiting", {
            user_id,
            match_id: newMatchId,
        });

        await client.query("COMMIT");
        await redis.set(processedKey, "1", "EX", 3600);
        console.log(`User ${user_id} requeued with new match_id ${newMatchId} (difficulty=${difficulty})`);

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


startWorker();