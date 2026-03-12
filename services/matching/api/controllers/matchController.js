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

    try {
        // Resolve REDIRECTED match to its PROPOSED match
        const { rows } = await postgres.query(
            `SELECT * FROM matches WHERE match_id = $1`, [match_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Match Not Found" });
        }

        // Follow redirect if needed
        let proposedMatchId = match_id;
        if (rows[0].status === "REDIRECTED") {
            proposedMatchId = rows[0].redirected_to;
        }

        const lockKey = `match_lock:${proposedMatchId}`;
        const lock = await acquireLock(redis, lockKey, 5);
        if (!lock) return res.status(409).json({ error: "Locked" });

        try {
            await postgres.query("BEGIN");

            const { rows: proposed } = await postgres.query(
                `SELECT * FROM matches WHERE match_id = $1`, [proposedMatchId]
            );

            if (proposed.length === 0) {
                await postgres.query("ROLLBACK");
                return res.status(404).json({ error: "Proposed match not found" });
            }

            const match = proposed[0];

            if (match.status !== "PROPOSED") {
                await postgres.query("ROLLBACK");
                return res.status(400).json({ error: "Match is no longer open for acceptance" });
            }

            if (new Date(match.proposal_expiry) < new Date()) {
                await postgres.query("ROLLBACK");
                return res.status(400).json({ error: "Proposal has expired" });
            }

            // Determine which side this user is on
            if (user_id === match.user_id_a) {
                await postgres.query(
                    `UPDATE matches SET accepted_by_a = TRUE, updated_at = NOW()
                     WHERE match_id = $1 AND status = 'PROPOSED'`,
                    [proposedMatchId]
                );
                console.log(`${user_id} (user_a) accepted match ${proposedMatchId}`);
            } else if (user_id === match.user_id_b) {
                await postgres.query(
                    `UPDATE matches SET accepted_by_b = TRUE, updated_at = NOW()
                     WHERE match_id = $1 AND status = 'PROPOSED'`,
                    [proposedMatchId]
                );
                console.log(`${user_id} (user_b) accepted match ${proposedMatchId}`);
            } else {
                await postgres.query("ROLLBACK");
                return res.status(403).json({ error: "Not a participant" });
            }

            // Check if both have now accepted
            const { rows: updated } = await postgres.query(
                `SELECT accepted_by_a, accepted_by_b FROM matches WHERE match_id = $1`,
                [proposedMatchId]
            );

            if (updated[0].accepted_by_a && updated[0].accepted_by_b) {
                await postgres.query(
                    `UPDATE matches SET status = 'CONFIRMED', updated_at = NOW()
                     WHERE match_id = $1 AND status = 'PROPOSED'`,
                    [proposedMatchId]
                );
                console.log(`Match ${proposedMatchId} CONFIRMED`);
            }

            await postgres.query("COMMIT");
            res.json({ success: true, match_id: proposedMatchId });

        } catch (err) {
            await postgres.query("ROLLBACK");
            throw err;
        } finally {
            await releaseLock(redis, lockKey);
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Error");
    }
}


export async function declineMatch(req, res) {

    const { match_id } = req.params;
    const { user_id } = req.body;

    try {
        await postgres.query("BEGIN");

        const { rows } = await postgres.query(
            `SELECT * FROM matches WHERE match_id = $1`,
            [match_id]
        );

        if (rows.length === 0) {
            await postgres.query("ROLLBACK");
            return res.status(404).json({ error: "Match not found" });
        }

        const match = rows[0];

        if (![match.user_id_a, match.user_id_b].includes(user_id)) {
            await postgres.query("ROLLBACK");
            return res.status(403).json({ error: "Not a participant" });
        }
        
        //Check if match can be declined (aka in PROPOSED state)
        if (match.status !== "PROPOSED") {
            await postgres.query("ROLLBACK");
            return res.status(400).json({ error: "Match is not declinable" });
        }

        //Update match status to "CANCELLED"
        await postgres.query(
            `UPDATE matches SET status = 'CANCELLED', updated_at = NOW()
            WHERE match_id = $1`, [match_id]
        );

        //Log Decline event:
        await postgres.query(
            `INSERT INTO match_events (event_id, match_id, event_type, payload)
            VALUES ($1, $2, 'MATCH_DECLINED', $3)`,
            [uuid(), match_id, JSON.stringify({ declined_by: user_id })]
        );

        await postgres.query("COMMIT");
        res.json({ success: true, message: "Match Declined" });

        //Requeue User who accepted
        const otherUserId = match.user_id_a === user_id ? match.user_id_b : match.user_id_a;

        if (otherUserId) {
            global.rabbitChannel.publish(
                process.env.MATCH_EXCHANGE,
                "match.requeue",
                Buffer.from(JSON.stringify({
                    event_id: uuid(),
                    match_id,
                    user_id: otherUserId,
                    topic: match.topic,
                    difficulty: match.difficulty
                })),
                { persistent: true }
            );
            console.log(`Requeue event published for user ${otherUserId}`);
        }

        res.sendStatus(200);

    } catch (err) {
        await postgres.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function cancelMatch(req, res) {
    const { user_id, topic, difficulty } = req.body;

    if (!user_id || !topic || !difficulty) {
        return res.status(400).json({ error: "user_id, topic and difficulty are required" });
    }

    try {
        const { rows } = await postgres.query(
            `SELECT * FROM matches
            WHERE user_id_a = $1 AND topic = $2 AND difficulty = $3 AND status = 'WAITING'`,
            [user_id, topic, difficulty]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "No waiting match found for user"});
        }

        const match = rows[0];

        global.rabbitChannel.publish(
            process.env.MATCH_EXCHANGE,
            "match.leave",
            Buffer.from(JSON.stringify({
                event_id: uuid(),
                match_id: match.match_id,
                user_id,
                topic,
                difficulty
            })),
            { persistent: true }
        );

        return res.status(200).json({ message: "Left matchmaking queue successfully" });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
    
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