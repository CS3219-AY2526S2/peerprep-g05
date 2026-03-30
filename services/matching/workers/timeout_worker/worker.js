import dotenv from "dotenv";
dotenv.config();
import { v4 as uuid } from "uuid";

import { postgres } from "../../infrastructure/postgres/client.js";
import { createChannel } from "../../infrastructure/rabbitmq/client.js";
import {
    cancelWaitingMatch,
    createMatch,
    expireMatch,
    getExpiredProposedMatches,
    getStaleWaitingMatches,
    insertMatchEvent
} from "../../domain/match/matchRepository.js";
import { insertOutboxEvent } from "../../domain/match/outboxRepository.js";

async function startTimeoutWorker(timeout_duration) {
    const channel = await createChannel();

    // ── Poll: PROPOSED matches whose proposal_expiry has passed ──────
    setInterval(async () => {
        try {
            const expired = await getExpiredProposedMatches();

            for (const match of expired) {
                const client = await postgres.connect();
                try {
                    await client.query("BEGIN");

                    const result = await expireMatch(client, match.match_id);
                    if (!result) {
                        await client.query("ROLLBACK");
                        continue;
                    }

                    await insertMatchEvent(client, uuid(), match.match_id, "MATCH_TIMED_OUT", {});

                    // Case 1: only one user accepted → requeue them, notify the other
                    // Case 2: neither accepted → notify both, requeue nobody
                    // Case 3: both accepted → never reaches here (status = CONFIRMED)
                    const timeoutUsers  = [];
                    const requeueUsers  = [];

                    if (match.accepted_by_a && !match.accepted_by_b) {
                        requeueUsers.push(match.user_id_a);
                        timeoutUsers.push(match.user_id_b);
                    } else if (match.accepted_by_b && !match.accepted_by_a) {
                        requeueUsers.push(match.user_id_b);
                        timeoutUsers.push(match.user_id_a);
                    } else {
                        timeoutUsers.push(match.user_id_a, match.user_id_b);
                    }

                    // Notify timed-out users (no requeue)
                    for (const userId of timeoutUsers) {
                        await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.timeout", {
                            match_id: match.match_id,
                            user_id: userId,
                        });
                    }

                    // Create new matches and outbox events for requeued users
                    for (const userId of requeueUsers) {
                        const newMatchId = uuid();
                        await createMatch(client, newMatchId, userId, match.topic, match.difficulty);

                        await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.enter", {
                            event_id: uuid(),
                            match_id: newMatchId,
                            user_id: userId,
                            topic: match.topic,
                            difficulty: match.difficulty,
                        });

                        await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.waiting", {
                            user_id: userId,
                            match_id: newMatchId,
                        });
                    }

                    await client.query("COMMIT");

                    if (requeueUsers.length === 0) {
                        console.log(`Match ${match.match_id} expired — no users requeued`);
                    } else {
                        console.log(`Match ${match.match_id} expired — requeued: ${requeueUsers.join(", ")}`);
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

    // ── Poll: WAITING matches that have been sitting too long ─────────
    setInterval(async () => {
        try {
            const stale = await getStaleWaitingMatches(1);

            for (const match of stale) {
                const client = await postgres.connect();
                try {
                    await client.query("BEGIN");

                    const cancelled = await cancelWaitingMatch(client, match.match_id);
                    if (!cancelled) {
                        await client.query("ROLLBACK");
                        continue;
                    }

                    await insertMatchEvent(client, uuid(), match.match_id, "MATCH_WAITING_TIMEOUT", {
                        user_id: match.user_id_a,
                    });

                    // Notify user their queue search timed out
                    await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.timeout", {
                        match_id: match.match_id,
                        user_id: match.user_id_a,
                    });

                    // Drive the match worker to clean up Redis queue state
                    await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.leave", {
                        event_id: uuid(),
                        match_id: match.match_id,
                        user_id: match.user_id_a,
                        topic: match.topic,
                        difficulty: match.difficulty,
                    });

                    await client.query("COMMIT");
                    console.log(`WAITING match ${match.match_id} timed out for user ${match.user_id_a} after ${timeout_duration} mins`);

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