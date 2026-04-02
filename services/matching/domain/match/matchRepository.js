import { postgres } from "../../infrastructure/postgres/client.js";
import { v4 as uuid } from "uuid";

export async function findActiveMatch(client,user_id) {
    const { rows } = await client.query(
        `SELECT match_id, status FROM matches
         WHERE (user_id_a = $1 OR user_id_b = $1)
         AND status IN ('WAITING', 'PROPOSED', 'REDIRECTED')
         AND NOT (status = 'REDIRECTED' AND user_id_b IS NULL)
         LIMIT 1`,
        [user_id]
    );
    return rows[0] || null;
}

export async function findMatchById(client, match_id) {
    const { rows } = await client.query(
        `SELECT * FROM matches WHERE match_id = $1`,
        [match_id]
    );
    return rows[0] || null;
}

export async function findWaitingMatch(client, user_id, topic, difficulty) {
    const { rows } = await client.query(
        `SELECT * FROM matches
         WHERE user_id_a = $1 AND topic = $2 AND difficulty = $3 AND status = 'WAITING'`,
        [user_id, topic, difficulty]
    );
    return rows[0] || null;
}

export async function createMatch(client, match_id, user_id, topic, difficulty) {
    await client.query(
        `INSERT INTO matches (match_id, user_id_a, topic, difficulty, status)
         VALUES ($1, $2, $3, $4, 'WAITING')`,
        [match_id, user_id, topic, difficulty]
    );
}

export async function updateMatchAcceptedByA(client, match_id) {
    await client.query(
        `UPDATE matches SET accepted_by_a = TRUE, updated_at = NOW()
         WHERE match_id = $1 AND status = 'PROPOSED'`,
        [match_id]
    );
}

export async function updateMatchAcceptedByB(client, match_id) {
    await client.query(
        `UPDATE matches SET accepted_by_b = TRUE, updated_at = NOW()
         WHERE match_id = $1 AND status = 'PROPOSED'`,
        [match_id]
    );
}

export async function confirmMatch(client, match_id) {
    await client.query(
        `UPDATE matches SET status = 'CONFIRMED', updated_at = NOW()
         WHERE match_id = $1 AND status = 'PROPOSED'`,
        [match_id]
    );
}

export async function cancelMatch(client, match_id) {
    const { rowCount } = await client.query(
        `UPDATE matches SET status = 'CANCELLED', updated_at = NOW()
         WHERE match_id = $1`,
        [match_id]
    );
    return rowCount > 0;
}

export async function getAcceptanceStatus(client, match_id) {
    const { rows } = await client.query(
        `SELECT accepted_by_a, accepted_by_b FROM matches WHERE match_id = $1`,
        [match_id]
    );
    return rows[0] || null;
}

export async function insertMatchEvent(client, event_id, match_id, event_type, payload) {
    await client.query(
        `INSERT INTO match_events (event_id, match_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        [event_id, match_id, event_type, JSON.stringify(payload)]
    );
}

export async function proposeMatch(client, userA, userB, interval) {
    const { rowCount } = await client.query(
        `UPDATE matches
         SET user_id_b = $1,
             status = 'PROPOSED',
             proposal_expiry = NOW() + INTERVAL '${interval} minutes',
             updated_at = NOW()
         WHERE match_id = $2 AND status = 'WAITING'`,
        [userB.user_id, userA.match_id]
    );
    if (rowCount === 0) return false;

    await insertMatchEvent(client, uuid(), userA.match_id, "MATCH_PROPOSED", {
        userA: { user_id: userA.user_id, match_id: userA.match_id },
        userB: { user_id: userB.user_id, match_id: userB.match_id }
    });

    return true;
}

export async function redirectMatch(client, userB, userA) {
    const { rowCount } = await client.query(
        `UPDATE matches
         SET status = 'REDIRECTED',
             redirected_to = $1,
             updated_at = NOW()
         WHERE match_id = $2 AND status = 'WAITING'`,
        [userA.match_id, userB.match_id]
    );
    return rowCount > 0;
}

export async function expireMatch(client, match_id) {
    const { rowCount } = await client.query(
        `UPDATE matches SET status = 'EXPIRED', updated_at = NOW()
        WHERE match_id = $1 AND status = 'PROPOSED' RETURNING *`,
        [match_id]
    );
    return rowCount > 0;
}

export async function cancelWaitingMatch(client, match_id) {
    const { rowCount } = await client.query(
        `UPDATE matches SET status = 'CANCELLED', updated_at = NOW()
        WHERE match_id = $1 AND status = 'WAITING' RETURNING *`,
        [match_id]
    );
    return rowCount > 0;
}

export async function getExpiredProposedMatches() {
    const { rows } = await postgres.query(
        `SELECT * FROM matches WHERE status = 'PROPOSED' AND proposal_expiry < NOW()`
    );
    return rows;
}

export async function getStaleWaitingMatches(timeout_mins) {
    const { rows } = await postgres.query(
        `SELECT * FROM matches WHERE status = 'WAITING' 
        AND created_at < NOW() - INTERVAL '${timeout_mins} minutes'`
    );
    return rows;
}

export async function getMatchesNeedingRelaxation(relax_mins) {
    const { rows } = await postgres.query(
        `SELECT * FROM matches
         WHERE status = 'WAITING'
           AND difficulty != 'ANY'
           AND created_at < NOW() - ($1 * INTERVAL '1 minute')`,
        [relax_mins]
    );
    return rows;
}