import dotenv from "dotenv";
import { v4 as uuid } from "uuid";

import { postgres } from "../../infrastructure/postgres/client.js";
import { createChannel, publishEvent } from "../../infrastructure/rabbitmq/client.js";
import { 
    cancelWaitingMatch, 
    createMatch,
    expireMatch,
    getExpiredProposedMatches, 
    getStaleWaitingMatches, 
    insertMatchEvent } from "../../domain/match/matchRepository.js";

dotenv.config();

async function startTimeoutWorker(timeout_duration) {
    const channel = await createChannel();
    const WAITING_TIMEOUT = timeout_duration;

    setInterval(async () => {
        try {
            const expired = await getExpiredProposedMatches();

            for (const match of expired) {
                const client = await postgres.connect();
                
                try {
                    await client.query("BEGIN");
                    // Atomically claim this match for expiry
                    const result = await expireMatch(match.match_id);
                    if (!result) {
                        await client.query("ROLLBACK");
                        continue;
                    }

                    await insertMatchEvent(client, uuid(), match.match_id, "MATCH_TIMED_OUT", {});

                    // Case 1: only one user accepted → requeue them
                    // Case 2: neither accepted → requeue nobody
                    // Case 3: both accepted → should never reach here (would be CONFIRMED)
                    const timeoutUsers = [];

                    const requeueUsers = [];
                    if (match.accepted_by_a && !match.accepted_by_b) {
                        requeueUsers.push(match.user_id_a);
                        timeoutUsers.push(match.user_id_b);
                    } else if (match.accepted_by_b && !match.accepted_by_a) {
                        requeueUsers.push(match.user_id_b);
                        timeoutUsers.push(match.user_id_a);
                    } else if (!match.accepted_by_a && !match.accepted_by_b) {
                        timeoutUsers.push(match.user_id_a, match.user_id_b);
                    }
                    // If neither accepted, requeueUsers stays empty

                    const newSessions = [];
                    for (const user of requeueUsers) {
                        const newMatchId = uuid();
                        await createMatch(client, newMatchId, user, match.topic, match.difficulty);
                        newSessions.push({ user, newMatchId });
                    }

                    await client.query("COMMIT");
                    
                    for (const userId of timeoutUsers) {
                        console.log(userId)
                        await publishEvent(channel, "match.timeout", {
                            match_id: match.match_id,
                            user_id: userId
                        }, process.env.MATCH_EVENTS_EXCHANGE);
                    }
                    
                    // Publish requeue events after commit
                    for (const session of newSessions) {
                        await publishEvent(channel, "match.enter", {
                            event_id: uuid(),
                            match_id: session.newMatchId,
                            user_id: session.user,
                            topic: match.topic,
                            difficulty: match.difficulty
                        });
                        await publishEvent(channel, "match.waiting", {
                            user_id: session.user,
                            match_id: session.newMatchId
                        }, process.env.MATCH_EVENTS_EXCHANGE);

                        console.log(`Requeued ${session.user} after timeout on match ${match.match_id}`);
                    }

                    if (requeueUsers.length === 0) {
                        console.log(`Match ${match.match_id} expired — no users requeued`);
                    }

                } catch (err) {
                    await client.query("ROLLBACK");
                    console.error(`Error expiring match ${match.match_id}:`, err);
                } finally {
                    client.release();
                }
            }

        } catch (err) {
            console.error("Timeout worker poll error:", err);
        }

    }, 5000);

    setInterval(async () => {
        try {
            const stale = await getStaleWaitingMatches(timeout_duration);

            for (const match of stale) {
                const client = await postgres.connect();
                try {
                    await client.query("BEGIN");
                    const cancelled = await cancelWaitingMatch(match.match_id);
                    if (!cancelled) {
                        await client.query("ROLLBACK");
                        continue;
                    }

                    await insertMatchEvent(client, uuid(), match.match_id, "MATCH_WAITING_TIMEOUT", {
                        user_id: match.user_id_a
                    });

                    await client.query("COMMIT");

                    await publishEvent(channel, "match.timeout", {
                        match_id: match.match_id,
                        user_id_a: match.user_id_a,
                        user_id_b: match.user_id_b
                    }, process.env.MATCH_EVENTS_EXCHANGE);
                    
                    await publishEvent(channel, "match.leave", {
                        event_id: uuid(),
                        match_id: match.match_id,
                        user_id: match.user_id_a,
                        topic: match.topic,
                        difficulty: match.difficulty
                    })

                    console.log(`WAITING match ${match.match_id} timed out for user ${match.user_id_a} after ${WAITING_TIMEOUT} mins`);

                } catch (err) {
                    await client.query("ROLLBACK");
                    console.error(`Error timing out WAITING match ${match.match_id}:`, err);
                } finally {
                    client.release();
                }
            }

        } catch (err) {
            console.error("Waiting timeout poll error:", err);
        }

    }, 5000);
}

const timeout_duration = process.env.WAITING_TIMEOUT_MINS;
startTimeoutWorker(timeout_duration);