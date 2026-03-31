import dotenv from "dotenv";
import { v4 as uuid, v5 as uuidv5 } from "uuid";

import { createChannel } from "../../infrastructure/rabbitmq/client.js";
import { acquireLock, releaseLock } from "../../infrastructure/redis/lock.js";
import { postgres } from "../../infrastructure/postgres/client.js";
import { publishEvent } from "../../infrastructure/rabbitmq/client.js";
import { redis } from "../../infrastructure/redis/client.js";
import {
    createMatch,
    cancelMatch,
    insertMatchEvent,
    proposeMatch,
    redirectMatch
} from "../../domain/match/matchRepository.js";
import { insertOutboxEvent } from "../../domain/match/outboxRepository.js";

dotenv.config();

const REQUEUE_NAMESPACE = "b7e2d4a1-1234-5678-abcd-000000000001";

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
            if (routingKey === "match.enter")   await handleMatchEnter(event, channel);
            if (routingKey === "match.requeue") await handleMatchRequeue(event, channel);
            if (routingKey === "match.leave")   await handleMatchLeave(event, channel);
            channel.ack(msg);
        } catch (err) {
            if (err.message === "LOCK_BUSY") {
                channel.nack(msg, false, true);  // requeue
            } else {
                channel.nack(msg, false, false); // dead-letter
            }
        }
    });
}

async function handleMatchEnter(event, channel) {
    const { match_id, user_id, topic, difficulty } = event;

    const processedKey = `processed_event:${event.event_id}`;
    if (await redis.get(processedKey)) return;

    const queueKey = `match_queue:${topic}:${difficulty}`;
    const lockKey  = `match_lock:${topic}:${difficulty}`;

    const lock = await acquireLock(redis, lockKey, 30);
    if (!lock) throw new Error("LOCK_BUSY");

    try {
        if (await redis.get(processedKey)) return;

        await redis.rpush(queueKey, JSON.stringify({ user_id, match_id }));

        while (true) {
            const users = await redis.lrange(queueKey, 0, -1);
            if (users.length < 2) break;

            const userA = JSON.parse(users[0]);
            const userB = JSON.parse(users[1]);

            if (userA.user_id === userB.user_id) {
                await redis.lpop(queueKey);
                console.log(`Removed duplicate entry for ${userA.user_id}`);
                continue;
            }

            await redis.ltrim(queueKey, 2, -1);

            const client = await postgres.connect();
            try {
                await client.query("BEGIN");

                const proposed = await proposeMatch(client, userA, userB, 0.5);
                if (!proposed) {
                    await client.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    await redis.lpush(queueKey, JSON.stringify(userA));
                    console.log("Stale match for userA, requeuing both");
                    continue;
                }

                const redirected = await redirectMatch(client, userB, userA);
                if (!redirected) {
                    await client.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    await redis.lpush(queueKey, JSON.stringify(userA));
                    console.log("Stale match for userB, requeuing both");
                    continue;
                }

                // Write notifications inside the transaction
                await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.proposed", {
                    match_id: userA.match_id,
                    user_id_a: userA.user_id,
                    user_id_b: userB.user_id,
                });

                await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.redirected", {
                    match_id: userB.match_id,
                    user_id_b: userB.user_id,
                    redirected_to: userA.match_id,
                });

                await client.query("COMMIT");
                console.log(`Matched ${userA.user_id} ↔ ${userB.user_id}`);

            } catch (err) {
                await client.query("ROLLBACK");
                await redis.lpush(queueKey, JSON.stringify(userB));
                await redis.lpush(queueKey, JSON.stringify(userA));
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

async function handleMatchLeave(event, channel) {
    const { user_id, topic, difficulty, match_id } = event;

    const queueKey = `match_queue:${topic}:${difficulty}`;
    const lockKey  = `match_lock:${topic}:${difficulty}`;

    const lock = await acquireLock(redis, lockKey, 10);
    if (!lock) throw new Error("LOCK_BUSY");

    try {
        const usersInQueue = await redis.lrange(queueKey, 0, -1);
        for (const u of usersInQueue) {
            const parsed = JSON.parse(u);
            if (parsed.user_id === user_id) {
                await redis.lrem(queueKey, 0, u);
                console.log(`Removed ${user_id} from queue ${queueKey}`);
            }
        }

        const client = await postgres.connect();
        try {
            await client.query("BEGIN");

            const cancelled = await cancelMatch(client, match_id);
            if (!cancelled) {
                await client.query("ROLLBACK");
                console.log(`No WAITING match to cancel for user ${user_id}`);
                return;
            }

            await insertMatchEvent(client, uuid(), match_id, "MATCH_CANCELLED", { user_id });

            // No WS notification needed for leave — user initiated it
            await client.query("COMMIT");
            console.log(`User ${user_id} left matchmaking for topic ${topic}, difficulty ${difficulty}`);

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

async function handleMatchRequeue(event, channel) {
    const { event_id, user_id, topic, difficulty } = event;

    const processedKey = `processed_event:${event_id}`;
    if (await redis.get(processedKey)) return;

    // Deterministic ID — same event_id always produces same newMatchId
    const newMatchId = uuidv5(event_id, REQUEUE_NAMESPACE);

    const client = await postgres.connect();
    try {
        await client.query("BEGIN");

        await createMatch(client, newMatchId, user_id, topic, difficulty);

        // Write both outbox events inside the transaction
        await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.enter", {
            event_id: uuidv5(`enter:${event_id}`, REQUEUE_NAMESPACE), // deterministic
            match_id: newMatchId,
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
        console.log(`User ${user_id} requeued with new match_id ${newMatchId}`);

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

startWorker();