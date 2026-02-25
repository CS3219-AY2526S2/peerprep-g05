import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

import { createChannel } from "../../infrastructure/rabbitmq/client.js";
import { acquireLock, releaseLock } from "../../infrastructure/redis/lock.js";
import { redis } from "../../infrastructure/redis/client.js";
import { postgres } from "../../infrastructure/postgres/client.js";

dotenv.config();

async function startWorker() {

    const channel = await createChannel();

    console.log("MATCH_EXCHANGE:", process.env.MATCH_EXCHANGE);
    console.log("RABBITMQ_URL:", process.env.RABBITMQ_URL);

    await channel.assertExchange(
        process.env.MATCH_EXCHANGE,
        "topic",
        { durable: true }
    );

    const queue = await channel.assertQueue("match.worker.queue", {
        durable: true
    });

    await channel.bindQueue(
        queue.queue,
        process.env.MATCH_EXCHANGE,
        "match.enter"
    );

    channel.consume(queue.queue, async msg => {

        if (!msg) return;

        const event = JSON.parse(msg.content.toString());

        try {
            await handleMatchEnter(event);
            channel.ack(msg);
        } catch (err) {
            console.error("Worker Error:", err);
            channel.nack(msg, false, true); // Reject message without requeue
        }
        console.log("Received event:", event);
    });
}

async function handleMatchEnter(event) {
    const { match_id, user_id, topic, difficulty } = event;

    const queueKey = `match_queue:${topic}:${difficulty}`;
    const lockKey = `match_lock:${topic}:${difficulty}`;

    //Acquire Distributed Lock
    const lock = await acquireLock(redis, lockKey, 5);

    if (!lock) {
        console.log("Another worker is processing this queue. Skipping...");
        return;
    }

    try {
        //Check for waiting users
        const waitingUser = await redis.lpop(queueKey);

        if (!waitingUser) {
            //Nobody waiting -> Add self to queue
            await redis.rpush(queueKey, JSON.stringify({user_id, match_id}));
            console.log(`User ${user_id} added to queue ${queueKey}`);
            return;
        }

        //someone waiting -> pair with them and create match
        const parsed = JSON.parse(waitingUser);

        //Use existing match_id of first user
        const existingMatchId = parsed.match_id;

        await postgres.query("BEGIN");
        try {
            const proposalExpiry = new Date(Date.now() + 15000); // 15s timeout

            await postgres.query(
                `UPDATE matches
                 SET user_id_b = $1, status = $2, proposal_expiry = $3
                 WHERE match_id = $4`,
                [user_id, "PROPOSED", proposalExpiry, existingMatchId]
            );

            //Logging Event
                        await postgres.query(
                `INSERT INTO match_events (event_id, match_id, event_type, payload)
                 VALUES ($1,$2,$3,$4)`,
                [
                    uuid(),
                    existingMatchId,
                    "MATCH_PROPOSED",
                    JSON.stringify({ userA: parsed, userB: { user_id, match_id } })
                ]
            );

            await postgres.query("COMMIT");
            console.log(`Match proposed between ${parsed.user_id} and ${user_id} on topic ${topic} with difficulty ${difficulty}`);

        } catch (err) {
            await postgres.query("ROLLBACK");
            throw err;
        }

    } finally {
        await releaseLock(redis, lockKey);
    }
}


startWorker();