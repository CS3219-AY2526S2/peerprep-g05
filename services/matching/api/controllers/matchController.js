import { v4 as uuid } from "uuid";
import { postgres } from "../../infrastructure/postgres/client.js";

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

//Update the state of the match to CONFIRMED when a user accepts the match (for now)
export async function acceptMatch(req, res) {

    const { match_id } = req.params;

    await postgres.query(
        `
        UPDATE matches
        SET status='CONFIRMED',
            updated_at=NOW()
        WHERE match_id=$1
        `,
        [match_id]
    );

    res.sendStatus(200);
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