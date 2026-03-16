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
                await handleMatchEnter(event);
            }
            if (routingKey === "match.requeue") {
                await handleMatchRequeue(event, channel);
            }
            if (routingKey === "match.leave") {
                await handleMatchLeave(event);
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

async function handleMatchEnter(event) {
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
            const users = await redis.lrange(queueKey, 0, 1);
            if (users.length < 2) break;

            const userA = JSON.parse(users[0]);
            const userB = JSON.parse(users[1]);

            if (userA.user_id === userB.user_id) {
                await redis.lpop(queueKey);
                console.log(`Removed duplicate entry for ${userA.user_id}`);
                continue;
            }

            await redis.ltrim(queueKey, 2, -1);

            await postgres.query("BEGIN");
            try {

                const proposed = await proposeMatch(userA, userB, 10);
                if (!proposed) {
                    await postgres.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    console.log("Stale matches for userA, requeuing userB");
                    continue;
                }
                const redirected = await redirectMatch(userB, userA);
                if (!redirected) {
                    await postgres.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    await redis.lpush(queueKey, JSON.stringify(userA));
                    console.log("Stale match for userB, requeuing both users");
                    continue;
                }
                // const updateA = await postgres.query(
                //     `UPDATE matches
                //      SET user_id_b = $1,
                //          status = 'PROPOSED',
                //          proposal_expiry = NOW() + INTERVAL '5 minute',
                //          updated_at = NOW()
                //      WHERE match_id = $2 AND status = 'WAITING'
                //      RETURNING *`,
                //     [userB.user_id, userA.match_id]
                // );

                // if (updateA.rowCount === 0) {
                //     await postgres.query("ROLLBACK");
                //     await redis.lpush(queueKey, JSON.stringify(userB));
                //     console.log("Stale matches detected, skipping pair");
                //     continue;
                // }

                // const updateB = await postgres.query(
                //     `UPDATE matches
                //      SET status = 'REDIRECTED',
                //          redirected_to = $1,
                //          updated_at = NOW()
                //      WHERE match_id = $2 AND status = 'WAITING'
                //      RETURNING *`,
                //     [userA.match_id, userB.match_id]
                // );

                // if (updateB.rowCount === 0) {
                //     await postgres.query("ROLLBACK");
                //     await redis.lpush(queueKey, JSON.stringify(userB));
                //     await redis.lpush(queueKey, JSON.stringify(userA));
                //     console.log(`userB ${userB.user_id} stale, requeueing userA ${userA.user_id}`);
                //     continue;      
                // }

                // await postgres.query(
                //     `INSERT INTO match_events (event_id, match_id, event_type, payload)
                //      VALUES ($1, $2, 'MATCH_PROPOSED', $3)`,
                //     [
                //         uuid(),
                //         userA.match_id,
                //         JSON.stringify({
                //             userA: { user_id: userA.user_id, match_id: userA.match_id },
                //             userB: { user_id: userB.user_id, match_id: userB.match_id }
                //         })
                //     ]
                // );

                await postgres.query("COMMIT");
                console.log(`Matched ${userA.user_id} ↔ ${userB.user_id}`);

            } catch (err) {
                await postgres.query("ROLLBACK");
                await redis.lpush(queueKey, JSON.stringify(userB));
                await redis.lpush(queueKey, JSON.stringify(userA));
                throw err;
            }
        }

        await redis.set(processedKey, "1", "EX", 3600);

    } finally {
        await releaseLock(redis, lockKey);
    }
}

async function handleMatchLeave(event) {
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

        await postgres.query("BEGIN");
        try {
            const cancelled = await cancelMatch(match_id);
            if (!cancelled) {
                await postgres.query("ROLLBACK");
                console.log(`No WAITING match to cancel for user ${user_id}`);
                return;
            }

            await insertMatchEvent(uuid(), match_id, "MATCH_LEFT", { user_id });
            // const { rowCount } = await postgres.query(
            //     `UPDATE matches
            //      SET status = 'CANCELLED',
            //          updated_at = NOW()
            //      WHERE match_id = $1 AND status = 'WAITING'`,
            //     [match_id]
            // );

            // if (rowCount === 0) {
            //     await postgres.query("ROLLBACK");
            //     console.log(`No WAITING match to cancel for user ${user_id}`);
            //     return;
            // }

            // await postgres.query(
            //     `INSERT INTO match_events (event_id, match_id, event_type, payload)
            //      VALUES ($1, $2, 'MATCH_LEFT', $3)`,
            //     [uuid(), match_id, JSON.stringify({ user_id })]
            // );

            await postgres.query("COMMIT");
            console.log(`User ${user_id} left matchmaking for topic ${topic}, difficulty ${difficulty}`);

        } catch (err) {
            await postgres.query("ROLLBACK");
            throw err;
        }

    } finally {
        await releaseLock(redis, lockKey);
    }
}

async function handleMatchRequeue(event, channel) {
    const { user_id, topic, difficulty } = event;
    const newMatchId = uuid();

    await postgres.query("BEGIN");
    try {
        await createMatch(newMatchId, user_id, topic, difficulty);

        await publishEvent(channel, "match.enter", {
            event_id: uuid(),
            match_id: newMatchId,
            user_id,
            topic,
            difficulty
        });

        await postgres.query("COMMIT");
        console.log(`User ${user_id} requeued with new match_id ${newMatchId}`);

    } catch (err) {
        await postgres.query("ROLLBACK");
        throw err;
    }
}


startWorker();