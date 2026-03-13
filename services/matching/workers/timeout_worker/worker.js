import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

import { postgres } from "../../infrastructure/postgres/client.js";
import { createChannel } from "../../infrastructure/rabbitmq/client.js";

dotenv.config();

async function startTimeoutWorker(timeout_duration) {
    const channel = await createChannel();
    const WAITING_TIMEOUT = timeout_duration;

    setInterval(async () => {
        try {
            const expired = await postgres.query(`
                SELECT *
                FROM matches
                WHERE status = 'PROPOSED'
                AND proposal_expiry < NOW()
            `);

            for (const match of expired.rows) {
                await postgres.query("BEGIN");
                try {
                    // Atomically claim this match for expiry
                    const result = await postgres.query(`
                        UPDATE matches
                        SET status = 'EXPIRED', updated_at = NOW()
                        WHERE match_id = $1 AND status = 'PROPOSED'
                        RETURNING *
                    `, [match.match_id]);

                    // Another worker already handled this
                    if (result.rowCount === 0) {
                        await postgres.query("ROLLBACK");
                        continue;
                    }

                    await postgres.query(`
                        INSERT INTO match_events (event_id, match_id, event_type, payload)
                        VALUES ($1, $2, 'MATCH_TIMED_OUT', $3)
                    `, [uuid(), match.match_id, JSON.stringify({})]);

                    // Case 1: only one user accepted → requeue them
                    // Case 2: neither accepted → requeue nobody
                    // Case 3: both accepted → should never reach here (would be CONFIRMED)
                    const requeueUsers = [];
                    if (match.accepted_by_a && !match.accepted_by_b) {
                        requeueUsers.push(match.user_id_a);
                    } else if (match.accepted_by_b && !match.accepted_by_a) {
                        requeueUsers.push(match.user_id_b);
                    }
                    // If neither accepted, requeueUsers stays empty

                    const newSessions = [];
                    for (const user of requeueUsers) {
                        const newMatchId = uuid();
                        await postgres.query(`
                            INSERT INTO matches (match_id, user_id_a, topic, difficulty, status)
                            VALUES ($1, $2, $3, $4, 'WAITING')
                        `, [newMatchId, user, match.topic, match.difficulty]);
                        newSessions.push({ user, newMatchId });
                    }

                    await postgres.query("COMMIT");

                    // Publish requeue events after commit
                    for (const session of newSessions) {
                        channel.publish(
                            process.env.MATCH_EXCHANGE,
                            "match.enter",
                            Buffer.from(JSON.stringify({
                                event_id: uuid(), // required for idempotency
                                match_id: session.newMatchId,
                                user_id: session.user,
                                topic: match.topic,
                                difficulty: match.difficulty
                            }))
                        );
                        console.log(`Requeued ${session.user} after timeout on match ${match.match_id}`);
                    }

                    if (requeueUsers.length === 0) {
                        console.log(`Match ${match.match_id} expired — no users requeued`);
                    }

                } catch (err) {
                    await postgres.query("ROLLBACK");
                    console.error(`Error expiring match ${match.match_id}:`, err);
                }
            }

        } catch (err) {
            console.error("Timeout worker poll error:", err);
        }

    }, 5000);

    setInterval(async () => {
        try {
            const stale = await postgres.query(`
                SELECT *
                FROM matches
                WHERE status = 'WAITING'
                AND created_at < NOW() - INTERVAL '${WAITING_TIMEOUT} minutes'
            `);

            for (const match of stale.rows) {
                await postgres.query("BEGIN");
                try {
                    const result = await postgres.query(`
                        UPDATE matches
                        SET status = 'CANCELLED', updated_at = NOW()
                        WHERE match_id = $1 AND status = 'WAITING'
                        RETURNING *
                    `, [match.match_id]);

                    if (result.rowCount === 0) {
                        await postgres.query("ROLLBACK");
                        continue;
                    }

                    await postgres.query(`
                        INSERT INTO match_events (event_id, match_id, event_type, payload)
                        VALUES ($1, $2, 'MATCH_WAITING_TIMEOUT', $3)
                    `, [uuid(), match.match_id, JSON.stringify({ user_id: match.user_id_a })]);

                    await postgres.query("COMMIT");

                    channel.publish(
                        process.env.MATCH_EXCHANGE,
                        "match.leave",
                        Buffer.from(JSON.stringify({
                            event_id: uuid(),
                            match_id: match.match_id,
                            user_id: match.user_id_a,
                            topic: match.topic,
                            difficulty: match.difficulty
                        }))
                    );

                    console.log(`WAITING match ${match.match_id} timed out for user ${match.user_id_a} after ${WAITING_TIMEOUT} mins`);

                } catch (err) {
                    await postgres.query("ROLLBACK");
                    console.error(`Error timing out WAITING match ${match.match_id}:`, err);
                }
            }

        } catch (err) {
            console.error("Waiting timeout poll error:", err);
        }

    }, 5000);
}

const timeout_duration = process.env.WAITING_TIMEOUT_MINS || 5;
startTimeoutWorker(timeout_duration);