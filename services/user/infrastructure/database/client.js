import pg from "pg";
import config from "../../config/index.js";

const { Pool } = pg;

const pool = new Pool({
    connectionString: config.database.url,
});

/**
 * Postgres client wrapper — exposes the pool and convenience helpers.
 */
export const postgres = {
    async connect() {
        const client = await pool.connect();
        console.log("[db] PostgreSQL connected");
        client.release();
        return pool;
    },

    query(text, params) {
        return pool.query(text, params);
    },

    pool,
};
