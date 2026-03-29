import { v4 as uuid } from "uuid";
import { postgres } from "../../infrastructure/postgres/client.js";
import { publishEvent } from "../../infrastructure/rabbitmq/client.js";
import { releaseLock, acquireLock } from "../../infrastructure/redis/lock.js";
import { redis } from "../../infrastructure/redis/client.js";
import { findMatchById, findWaitingMatch, createMatch,
    updateMatchAcceptedByA, updateMatchAcceptedByB, confirmMatch,
    cancelMatch, getAcceptanceStatus, insertMatchEvent
 } from "../../domain/match/matchRepository.js";

export async function enterMatchmaking(req, res) {

    try {

        const { user_id, topic, difficulty } = req.body;

        const match_id = uuid();

        const client = await postgres.connect();
        try {
            await client.query("BEGIN");
            await createMatch(client, match_id, user_id, topic, difficulty);
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        await publishEvent(global.rabbitChannel, "match.enter", {
            event_id: uuid(),
            match_id,
            user_id,
            topic,
            difficulty
        });

        await publishEvent(global.rabbitChannel, "match.waiting", {
            user_id,
            match_id
        }, process.env.MATCH_EVENTS_EXCHANGE);

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

        const match = await findMatchById(match_id);
        if (!match) return res.status(404).json({ error: "Match Not Found" });

        // Follow redirect if needed
        let proposedMatchId = match_id;
        if (match.status === "REDIRECTED") {
            proposedMatchId = match.redirected_to;
        }

        const lockKey = `match_lock:${proposedMatchId}`;
        const lock = await acquireLock(redis, lockKey, 5);
        if (!lock) return res.status(409).json({ error: "Locked" });

        const client = await postgres.connect();

        try {
            await client.query("BEGIN");

            const proposed = await findMatchById(proposedMatchId);
            if (!proposed) {
                await client.query("ROLLBACK");
                return res.status(404).json({ error: "Proposed match not found" });
            }

            if (proposed.status !== "PROPOSED") {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Match is no longer open for acceptance" });
            }

            if (new Date(proposed.proposal_expiry) < new Date()) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Proposal has expired" });
            }

            // Determine which side this user is on
            if (user_id === proposed.user_id_a) {
                await updateMatchAcceptedByA(client, proposedMatchId);
                console.log(`${user_id} (user_a) accepted match ${proposedMatchId}`);
            } else if (user_id === proposed.user_id_b) {
                await updateMatchAcceptedByB(client, proposedMatchId);
                console.log(`${user_id} (user_b) accepted match ${proposedMatchId}`);
            } else {
                await client.query("ROLLBACK");
                return res.status(403).json({ error: "Not a participant" });
            }

            const acceptance = await getAcceptanceStatus(proposedMatchId);
            const bothAccepted = acceptance.accepted_by_a && acceptance.accepted_by_b;

            if (bothAccepted) {
                await confirmMatch(proposedMatchId);
                console.log(`Match ${proposedMatchId} CONFIRMED`);
            }

            await client.query("COMMIT");

            await publishEvent(global.rabbitChannel, "match.accepted", {
                user_id,
                match_id: proposedMatchId
            }, process.env.MATCH_EVENTS_EXCHANGE);

            if (bothAccepted) {
                await publishEvent(global.rabbitChannel, "match.confirmed", {
                    match_id: proposedMatchId,
                    user_id_a: proposed.user_id_a,
                    user_id_b: proposed.user_id_b,
                    topic: proposed.topic,
                    difficulty: proposed.difficulty
                }, process.env.MATCH_EVENTS_EXCHANGE);
            }

            res.json({ success: true, match_id: proposedMatchId });

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
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
    const client = await postgres.connect();
    try {
        await client.query("BEGIN");

        const match = await findMatchById(match_id);
        if (!match) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Match Not Found" });
        }

        if (![match.user_id_a, match.user_id_b].includes(user_id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Not a participant" });
        }
        
        //Check if match can be declined (aka in PROPOSED state)
        if (match.status !== "PROPOSED") {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Match is not declinable" });
        }

        await cancelMatch(client, match_id);
        await insertMatchEvent(client, uuid(), match_id, "MATCH_DECLINED", { declined_by: user_id });

        //Requeue User who accepted
        const otherUserId = match.user_id_a === user_id ? match.user_id_b : match.user_id_a;

        await client.query("COMMIT");
        res.json({ success: true, message: "Match Declined" });

        await publishEvent(global.rabbitChannel, "match.declined", {
            match_id,
            declined_by: user_id,
            other_user: otherUserId
        }, process.env.MATCH_EVENTS_EXCHANGE);
        

        if (otherUserId) {
            publishEvent(global.rabbitChannel, "match.requeue", {
                event_id: uuid(),
                match_id,
                user_id: otherUserId,
                topic: match.topic,
                difficulty: match.difficulty
            });
        }

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
}

export async function leaveMatch(req, res) {
    const { user_id, topic, difficulty } = req.body;

    if (!user_id || !topic || !difficulty) {
        return res.status(400).json({ error: "user_id, topic and difficulty are required" });
    }

    try {
        const match = await findWaitingMatch(user_id, topic, difficulty);
        if (!match) {
            return res.status(404).json({ error: "No Waiting match found for user" });
        }


        await publishEvent(global.rabbitChannel, "match.leave", {
            event_id: uuid(),
            match_id: match.match_id,
            user_id,
            topic,
            difficulty
        });

        await publishEvent(global.rabbitChannel, "match.cancelled", {
            match_id: match.match_id,
            user_id
        }, process.env.MATCH_EVENTS_EXCHANGE);

        return res.status(200).json({ message: "Left matchmaking queue successfully" });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
    
}


//Get the status of the match (WAITING, CONFIRMED, CANCELLED)
export async function getMatchStatus(req, res) {

    const { match_id } = req.params;

    const match = await findMatchById(match_id);
    res.json(match);
}