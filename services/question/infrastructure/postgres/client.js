import pg from "pg";
const { Pool } = pg;

export const postgres = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "questions_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    max: parseInt(process.env.POSTGRES_POOL_MAX, 10) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

// Initialize database schema
export async function initDatabase() {
    const client = await postgres.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                categories TEXT[] NOT NULL,
                complexity VARCHAR(20) NOT NULL CHECK (complexity IN ('Easy', 'Medium', 'Hard')),
                companies TEXT[] NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS test_cases (
                id SERIAL PRIMARY KEY,
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                input TEXT NOT NULL,
                expected_output TEXT NOT NULL,
                is_public BOOLEAN NOT NULL DEFAULT true,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Unique lower-case title to prevent duplicates
            CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_title_unique
                ON questions (LOWER(title));

            CREATE INDEX IF NOT EXISTS idx_questions_complexity
                ON questions(complexity);

            CREATE INDEX IF NOT EXISTS idx_questions_categories
                ON questions USING GIN(categories);

            CREATE INDEX IF NOT EXISTS idx_questions_companies
                ON questions USING GIN(companies);

            CREATE INDEX IF NOT EXISTS idx_test_cases_question_id
                ON test_cases(question_id);
        `);
        console.log("Database schema initialized");
    } finally {
        client.release();
    }
}
