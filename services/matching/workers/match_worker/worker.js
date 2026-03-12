import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

import { createChannel } from "../../infrastructure/rabbitmq/client.js";
import { acquireLock, releaseLock } from "../../infrastructure/redis/lock.js";
import { redis } from "../../infrastructure/redis/client.js";
import { postgres } from "../../infrastructure/postgres/client.js";

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
                const proposalExpiry = new Date(Date.now() + PROPOSAL_TIMEOUT_MS);

                const updateA = await postgres.query(
                    `UPDATE matches
                     SET user_id_b = $1,
                         status = 'PROPOSED',
                         proposal_expiry = NOW() + INTERVAL '5 minute',
                         updated_at = NOW()
                     WHERE match_id = $2 AND status = 'WAITING'
                     RETURNING *`,
                    [userB.user_id, userA.match_id]
                );

                if (updateA.rowCount === 0) {
                    await postgres.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    console.log("Stale matches detected, skipping pair");
                    continue;
                }

                const updateB = await postgres.query(
                    `UPDATE matches
                     SET status = 'REDIRECTED',
                         redirected_to = $1,
                         updated_at = NOW()
                     WHERE match_id = $2 AND status = 'WAITING'
                     RETURNING *`,
                    [userA.match_id, userB.match_id]
                );

                if (updateB.rowCount === 0) {
                    await postgres.query("ROLLBACK");
                    await redis.lpush(queueKey, JSON.stringify(userB));
                    await redis.lpush(queueKey, JSON.stringify(userA));
                    console.log(`userB ${userB.user_id} stale, requeueing userA ${userA.user_id}`);
                    continue;      
                }

                await postgres.query(
                    `INSERT INTO match_events (event_id, match_id, event_type, payload)
                     VALUES ($1, $2, 'MATCH_PROPOSED', $3)`,
                    [
                        uuid(),
                        userA.match_id,
                        JSON.stringify({
                            userA: { user_id: userA.user_id, match_id: userA.match_id },
                            userB: { user_id: userB.user_id, match_id: userB.match_id }
                        })
                    ]
                );

                await postgres.query("COMMIT");
                console.log(`Matched ${userA.user_id} ↔ ${userB.user_id}`);

            } catch (err) {
                await postgres.query("ROLLBACK");
                await redis.lpush(queueKey, JSON.stringify(userB));
                await redis.lpush(queueKey, JSON.stringify(userA));
                throw err;
            }
        }

        // ✅ Only mark as processed after successful handling
        await redis.set(processedKey, "1", "EX", 3600);

    } finally {
        await releaseLock(redis, lockKey);
    }
}

async function handleMatchRequeue(event, channel) {
    const { user_id, topic, difficulty } = event;
    const newMatchId = uuid();

    await postgres.query("BEGIN");
    try {
        await postgres.query(
            `INSERT INTO matches (match_id, user_id_a, topic, difficulty, status)
            VALUES ($1, $2, $3, $4, 'WAITING')`, [newMatchId, user_id, topic, difficulty]
        );

        channel.publish(
            process.env.MATCH_EXCHANGE,
            "match.enter",
            Buffer.from(JSON.stringify({
                event_id: uuid(),
                match_id: newMatchId,
                user_id,
                topic,
                difficulty
            })),
            { persistent: true }
        );

        await postgres.query("COMMIT");
        console.log(`User ${user_id} requeued with new match_id ${newMatchId}`);

    } catch (err) {
        await postgres.query("ROLLBACK");
        throw err;
    }
}


startWorker();