import { v4 as uuid } from "uuid";
import { postgres } from "../../infrastructure/postgres/client.js";
import { releaseLock, acquireLock } from "../../infrastructure/redis/lock.js";
import { redis } from "../../infrastructure/redis/client.js";

export async function enterMatchmaking(req, res) {

    try {

        const { user_id, topic, difficulty } = req.body;

        const match_id = uuid();

        await postgres.query(
            `
            INSERT INTO matches
            (match_id, user_id_a, topic, difficulty, status)
            VALUES ($1,$2,$3,$4,$5)
            `,
            [
                match_id,
                user_id,
                topic,
                difficulty,
                "WAITING"
            ]
        );

        global.rabbitChannel.publish(
            process.env.MATCH_EXCHANGE,
            "match.enter",
            Buffer.from(JSON.stringify({
                event_id: uuid(),
                match_id,
                user_id,
                topic,
                difficulty
            })),
            { persistent: true }
        );

        res.json({ match_id });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Error");
    }
}

//Update the state of the match to CONFIRMED when both users accept the match (for now)
export async function acceptMatch(req, res) {

    const { match_id } = req.params;
    const { user_id } = req.body;

    const lockKey = `match_lock:${match_id}`;
    const lock = await acquireLock(redis, lockKey, 5);

    if (!lock) return res.status(409).json({ error: "Locked" });

    try {
        await postgres.query("BEGIN");

        const { rows } = await postgres.query(
            `SELECT * FROM matches WHERE match_id = $1`, [match_id]
        );

        if (rows.length == 0) {
            await postgres.query("ROLLBACK");
            return res.status(404).json({ error: "Not Found" });
        }

        const match = rows[0];

        if (match.status !== "PROPOSED" || new Date(match.proposal_expiry) < new Date()) {
            await postgres.query("ROLLBACK");
            return res.status(400).json({ error: "Proposal Expired" });
        }

        if (user_id === match.user_id_a) {
            await postgres.query(
                `UPDATE matches SET accepted_by_a = TRUE
                WHERE match_id = $1 AND status = 'PROPOSED'`, [match_id]
            );
            console.log(`${user_id} accepted match ${match_id}`);
        } else if (user_id === match.user_id_b) {
            await postgres.query(
                `UPDATE matches SET accepted_by_b = TRUE WHERE match_id = $1
                AND status = 'PROPOSED'`, [match_id]
            );
            console.log(`${user_id} accepted match ${match_id}`);
        } else {
            await postgres.query("ROLLBACK");
            return res.status(403).json({ error: "Not Participant" });
        }

        const { rows: updated } = await postgres.query(
            `SELECT accepted_by_a, accepted_by_b
             FROM matches
             WHERE match_id = $1`,
            [match_id]
        );

        if (updated[0].accepted_by_a && updated[0].accepted_by_b) {
            await postgres.query(
                `UPDATE matches
                 SET status = 'CONFIRMED'
                 WHERE match_id = $1
                 AND status = 'PROPOSED'`,
                [match_id]
            );
        }

        await postgres.query("COMMIT");

        res.json({ success: true });  

    } catch (err) {
        await postgres.query("ROLLBACK");
        throw err;
    } finally {
        await releaseLock(redis, lockKey)
    }
}

//Update the state of the match to REJECTED when a user rejects the match (for now)
export async function declineMatch(req, res) {

    const { match_id } = req.params;

    await postgres.query(
        `
        UPDATE matches
        SET status='CANCELLED',
            updated_at=NOW()
        WHERE match_id=$1
        `,
        [match_id]
    );

    res.sendStatus(200);
}

//Get the status of the match (WAITING, CONFIRMED, CANCELLED)
export async function getMatchStatus(req, res) {

    const { match_id } = req.params;

    const result = await postgres.query(
        `SELECT * FROM matches WHERE match_id=$1`,
        [match_id]
    );

    res.json(result.rows[0]);
}