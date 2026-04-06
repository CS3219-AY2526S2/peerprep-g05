import dotenv from "dotenv";
dotenv.config();
import { v4 as uuid } from "uuid";

import { postgres } from "../../infrastructure/postgres/client.js";
import {
    cancelWaitingMatch,
    createMatch,
    expireMatch,
    getExpiredProposedMatches,
    getStaleWaitingMatches,
    insertMatchEvent,
    getMatchesNeedingRelaxation,
} from "../../domain/match/matchRepository.js";
import { insertOutboxEvent } from "../../domain/match/outboxRepository.js";

async function startTimeoutWorker(timeout_duration, relax_mins) {

    // ── Poll: PROPOSED matches whose proposal_expiry has passed ──────────────
    setInterval(async () => {
        try {
            console.log("Checking for expired proposed matches...");
            const expired = await getExpiredProposedMatches();
            console.log("Found", expired.length, "matches to expire");

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

                    // Case 1: only userA accepted → requeue userA, notify userB
                    // Case 2: only userB accepted → requeue userB, notify userA
                    // Case 3: neither accepted   → notify both, requeue nobody
                    // Case 4: both accepted      → status = CONFIRMED, never reaches here
                    const timeoutUsers = [];
                    const requeueUsers = [];

                    if (match.accepted_by_a && !match.accepted_by_b) {
                        requeueUsers.push(match.user_id_a);
                        timeoutUsers.push(match.user_id_b);
                    } else if (match.accepted_by_b && !match.accepted_by_a) {
                        requeueUsers.push(match.user_id_b);
                        timeoutUsers.push(match.user_id_a);
                    } else {
                        timeoutUsers.push(match.user_id_a, match.user_id_b);
                    }

                    for (const userId of timeoutUsers) {
                        await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.timeout", {
                            match_id: match.match_id,
                            user_id:  userId,
                        });
                    }

                    for (const userId of requeueUsers) {
                        const newMatchId = uuid();
                        await createMatch(client, newMatchId, userId, match.topic, match.difficulty);

                        await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.enter", {
                            event_id:   uuid(),
                            match_id:   newMatchId,
                            user_id:    userId,
                            topic:      match.topic,
                            difficulty: match.difficulty,
                        });

                        await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.waiting", {
                            user_id:  userId,
                            match_id: newMatchId,
                        });
                    }

                    await client.query("COMMIT");
                    console.log(
                        requeueUsers.length === 0
                            ? `Match ${match.match_id} expired — no users requeued`
                            : `Match ${match.match_id} expired — requeued: ${requeueUsers.join(", ")}`
                    );

                } catch (err) {
                    await client.query("ROLLBACK");
                    console.error(`Error expiring match ${match.match_id}:`, err);
                } finally {
                    client.release();
                }
            }
        } catch (err) {
            console.error("Proposed-expiry poll error:", err);
        }
    }, 5000);

    // ── Poll: WAITING matches that have been sitting too long ─────────────────
    setInterval(async () => {
        try {
            const stale = await getStaleWaitingMatches(timeout_duration);

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

                    // Notify the user their search timed out
                    await insertOutboxEvent(client, process.env.MATCH_EVENTS_EXCHANGE, "match.timeout", {
                        match_id: match.match_id,
                        user_id:  match.user_id_a,
                    });

                    // Tell the match worker to evict this user from the Redis queue
                    await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.leave", {
                        event_id:   uuid(),
                        match_id:   match.match_id,
                        user_id:    match.user_id_a,
                        topic:      match.topic,
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
            console.error("Waiting-timeout poll error:", err);
        }
    }, 5000);

    // ── Poll: WAITING matches that should have their difficulty relaxed ────────
    setInterval(async () => {
        try {
            // getMatchesNeedingRelaxation opens its own connection internally —
            // it must NOT receive a shared client, to avoid holding a connection
            // across the entire loop and starving the pool.
            const toRelax = await getMatchesNeedingRelaxation(relax_mins);

            for (const match of toRelax) {
                const client = await postgres.connect();
                try {
                    await client.query("BEGIN");

                    const cancelled = await cancelWaitingMatch(client, match.match_id);
                    if (!cancelled) {
                        await client.query("ROLLBACK");
                        continue;
                    }

                    await insertOutboxEvent(client, process.env.MATCH_EXCHANGE, "match.requeue", {
                        event_id:   uuid(),
                        match_id:   match.match_id,
                        user_id:    match.user_id_a,
                        topic:      match.topic,
                        difficulty: "ANY",
                    });

                    await client.query("COMMIT");
                    console.log(`[Relax] ${match.user_id_a} re-entering queue with difficulty ANY`);

                } catch (err) {
                    await client.query("ROLLBACK");
                    console.error(`[Relax] Error relaxing match ${match.match_id}:`, err);
                } finally {
                    client.release();
                }
            }
        } catch (err) {
            console.error("Relaxation poll error:", err);
        }
    }, 10000);

    console.log("Timeout worker started.");
}

const timeout_duration = process.env.WAITING_TIMEOUT_MINS || 5;
const relax_mins       = process.env.RELAX_MINS || 0.5;
startTimeoutWorker(timeout_duration, relax_mins);