import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

import { postgres } from "../../infrastructure/postgres/client.js";
import { createChannel } from "../../infrastructure/rabbitmq/client.js";

async function startTimeoutWorker() {
    const channel = await createChannel();

    setInterval(async () => {
        const expired = await postgres.query(`
            SELECT *
            FROM matches
            WHERE status = 'PROPOSED'
            AND proposal_expiry < NOW()
        `);

        for (const match of expired.rows) {

            await postgres.query("BEGIN");

            const result = await postgres.query(`
                UPDATE matches
                SET status = 'EXPIRED'
                WHERE match_id = $1
                AND status = 'PROPOSED'
                RETURNING *
            `, [match.match_id]);

            if (result.rowCount === 0) {
                await postgres.query("ROLLBACK");
                continue;
            }

            await postgres.query(`
                INSERT INTO match_events (event_id, match_id, event_type, payload)
                VALUES ($1, $2, 'MATCH_TIMED_OUT', $3)
            `, [uuid(), match.match_id, JSON.stringify({})]);

            const requeueUsers = [];

            if (match.accepted_by_a) {
                requeueUsers.push(match.user_id_a);
            }
            if (match.accepted_by_b) {
                requeueUsers.push(match.user_id_b);
            }

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

            //Requeue
            for (const session of newSessions) {
                channel.publish(
                    process.env.MATCH_EXCHANGE,
                    "match.enter",
                    Buffer.from(JSON.stringify({
                        match_id: session.newMatchId,
                        user_id: session.user,
                        topic: match.topic,
                        difficulty: match.difficulty
                    }))
                );
            }
        }

    }, 5000);
}

startTimeoutWorker();