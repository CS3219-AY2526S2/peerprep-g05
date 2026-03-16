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

        await createMatch(match_id, user_id, topic, difficulty);

        publishEvent(global.rabbitChannel, "match.enter", {
            event_id: uuid(),
            match_id,
            user_id,
            topic,
            difficulty
        });
        
        // global.rabbitChannel.publish(
        //     process.env.MATCH_EXCHANGE,
        //     "match.enter",
        //     Buffer.from(JSON.stringify({
        //         event_id: uuid(),
        //         match_id,
        //         user_id,
        //         topic,
        //         difficulty
        //     })),
        //     { persistent: true }
        // );

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

        try {
            await postgres.query("BEGIN");

            const proposed = await findMatchById(proposedMatchId);
            if (!proposed) {
                await postgres.query("ROLLBACK");
                return res.status(404).json({ error: "Proposed match not found" });
            }

            if (proposed.status !== "PROPOSED") {
                await postgres.query("ROLLBACK");
                return res.status(400).json({ error: "Match is no longer open for acceptance" });
            }

            if (new Date(match.proposal_expiry) < new Date()) {
                await postgres.query("ROLLBACK");
                return res.status(400).json({ error: "Proposal has expired" });
            }

            // Determine which side this user is on
            if (user_id === proposed.user_id_a) {
                await updateMatchAcceptedByA(proposedMatchId);
                console.log(`${user_id} (user_a) accepted match ${proposedMatchId}`);
            } else if (user_id === proposed.user_id_b) {
                await updateMatchAcceptedByB(proposedMatchId);
                console.log(`${user_id} (user_b) accepted match ${proposedMatchId}`);
            } else {
                await postgres.query("ROLLBACK");
                return res.status(403).json({ error: "Not a participant" });
            }

            const acceptance = await getAcceptanceStatus(proposedMatchId);

            if (acceptance.accepted_by_a && acceptance.accepted_by_b) {
                await confirmMatch(proposedMatchId);
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

        const match = await findMatchById(match_id);
        if (!match) {
            await postgres.query("ROLLBACK");
            return res.status(404).json({ error: "Match Not Found" });
        }

        if (![match.user_id_a, match.user_id_b].includes(user_id)) {
            await postgres.query("ROLLBACK");
            return res.status(403).json({ error: "Not a participant" });
        }
        
        //Check if match can be declined (aka in PROPOSED state)
        if (match.status !== "PROPOSED") {
            await postgres.query("ROLLBACK");
            return res.status(400).json({ error: "Match is not declinable" });
        }

        await cancelMatch(match_id);
        await insertMatchEvent(uuid(), match_id, "MATCH_DECLINED", { declined_by: user_id });

        await postgres.query("COMMIT");
        res.json({ success: true, message: "Match Declined" });

        //Requeue User who accepted
        const otherUserId = match.user_id_a === user_id ? match.user_id_b : match.user_id_a;

        if (otherUserId) {
            publishEvent(global.rabbitChannel, "match.requeue", {
                event_id: uuid(),
                match_id,
                user_id: otherUserId,
                topic: match.topic,
                difficulty: match.difficulty
            });
            // global.rabbitChannel.publish(
            //     process.env.MATCH_EXCHANGE,
            //     "match.requeue",
            //     Buffer.from(JSON.stringify({
            //         event_id: uuid(),
            //         match_id,
            //         user_id: otherUserId,
            //         topic: match.topic,
            //         difficulty: match.difficulty
            //     })),
            //     { persistent: true }
            // );
            console.log(`Requeue event published for user ${otherUserId}`);
        }

    } catch (err) {
        await postgres.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
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
            return res.status(404).json({ error: "No waiting match found for user" });
        }

        publishEvent(global.rabbitChannel, "match.leave", {
            event_id: uuid(),
            match_id: match.match_id,
            user_id,
            topic,
            difficulty
        });
        // global.rabbitChannel.publish(
        //     process.env.MATCH_EXCHANGE,
        //     "match.leave",
        //     Buffer.from(JSON.stringify({
        //         event_id: uuid(),
        //         match_id: match.match_id,
        //         user_id,
        //         topic,
        //         difficulty
        //     })),
        //     { persistent: true }
        // );

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