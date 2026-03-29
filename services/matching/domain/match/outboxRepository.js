// outboxRepository.js
import { postgres } from "../../infrastructure/postgres/client.js"; // ← missing

export async function insertOutboxEvent(client, exchange, routingKey, payload) {
    await client.query(
        `INSERT INTO outbox (exchange, routing_key, payload)
         VALUES ($1, $2, $3)`,
        [exchange, routingKey, JSON.stringify(payload)]
    );
}

export async function getPendingOutboxEvents() {
    const { rows } = await postgres.query(  // ← uses bare postgres (no client)
        `SELECT * FROM outbox
         WHERE published_at IS NULL
         ORDER BY created_at
         LIMIT 50`
    );
    return rows;
}

export async function markOutboxEventPublished(id) {
    await postgres.query(  // ← uses bare postgres (no client)
        `UPDATE outbox SET published_at = NOW() WHERE id = $1`,
        [id]
    );
}