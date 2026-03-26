import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

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

dotenv.config();

const PROPOSAL_TIMEOUT_MS = 5 * 60 * 1000; // 1 minute

async function startWorker() {
    const channel = await createChannel();

    // Assert Exchange
    await channel.assertExchange(process.env.MATCH_EXCHANGE, "topic", { durable: true });

    //Assert queue for worker
    const queue = await channel.assertQueue("match.worker.queue", { durable: true });

    //Bind both match.enter and requeue to the same queue
    await channel.bindQueue(queue.queue, process.env.MATCH_EXCHANGE, "match.enter");
    await channel.bindQueue(queue.queue, process.env.MATCH_EXCHANGE, "match.requeue");
    await channel.bindQueue(queue.queue, process.env.MATCH_EXCHANGE, "match.leave");

    channel.consume(queue.queue, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        console.log("Received event:", event);

        try {
            if (routingKey === "match.enter") {
                await handleMatchEnter(event, channel);
            }
            if (routingKey === "match.requeue") {
                await handleMatchRequeue(event, channel);
            }
            if (routingKey === "match.leave") {
                await handleMatchLeave(event, channel);
            }
            channel.ack(msg);
        } catch (err) {
            if (err.message === "LOCK_BUSY") {
                channel.nack(msg, false, true); // requeue
            } else {
                channel.nack(msg, false, false); // dead-letter
            }
        }
    });
}

async function handleMatchEnter(event, channel) {
    const { match_id, user_id, topic, difficulty } = event;

    // Check but DON'T set yet
    const processedKey = `processed_event:${event.event_id}`;
    const alreadyProcessed = await redis.get(processedKey);
    if (alreadyProcessed) return;

    const queueKey = `match_queue:${topic}:${difficulty}`;
    const lockKey = `match_lock:${topic}:${difficulty}`;

    const lock = await acquireLock(redis, lockKey, 30);
    if (!lock) throw new Error("LOCK_BUSY");

    try {
        // Check again inside lock to prevent race condition
        const doubleCheck = await redis.get(processedKey);
        if (doubleCheck) return;

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
                console.log(proposed);
                if (!proposed) {
                    await client.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    console.log("Stale matches for userA, requeuing userB");
                    continue;
                }
                
                const redirected = await redirectMatch(client, userB, userA);
                console.log(redirected);
                if (!redirected) {
                    await client.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    await redis.lpush(queueKey, JSON.stringify(userA));
                    console.log("Stale match for userB, requeuing both users");
                    continue;
                }

                await client.query("COMMIT");

                console.log(userA);
                console.log(userB);
                //Notify userA: Proposed
                publishEvent(channel, "match.proposed", {
                    match_id: userA.match_id,
                    user_id_a: userA.user_id,
                    user_id_b: userB.user_id,
                }, process.env.MATCH_EVENTS_EXCHANGE);

                //Notify userB: redirected
                publishEvent(channel, "match.redirected", {
                    match_id: userB.match_id,
                    user_id_b: userB.user_id,
                    redirected_to: userA.match_id
                }, process.env.MATCH_EVENTS_EXCHANGE);

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
    const lockKey = `match_lock:${topic}:${difficulty}`;
    const lock = await acquireLock(redis, lockKey, 10);
    if (!lock) throw new Error("LOCK_BUSY");

    try {
        // Remove user from Redis queue
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
    const { user_id, topic, difficulty } = event;
    const newMatchId = uuid();

    const client = await postgres.connect();
    try {
        await client.query("BEGIN");
        await createMatch(client, newMatchId, user_id, topic, difficulty);

        await client.query("COMMIT");

        await publishEvent(channel, "match.enter", {
            event_id: uuid(),
            match_id: newMatchId,
            user_id,
            topic,
            difficulty
        });

        console.log("Publishing requeue to socket...")
        await publishEvent(channel, "match.waiting", {
            user_id,
            match_id: newMatchId
        }, process.env.MATCH_EVENTS_EXCHANGE);

        console.log(`User ${user_id} requeued with new match_id ${newMatchId}`);

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


startWorker();