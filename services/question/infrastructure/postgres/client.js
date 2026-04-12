import pg from "pg";
const { Pool } = pg;

const CURATED_EXECUTION_SEED = [
    {
        title: "Two Sum",
        language: "python",
        functionName: "two_sum",
        boilerplateCode: [
            "def two_sum(nums, target):",
            "    # Return indices of two values that sum to target.",
            "    pass",
        ].join("\n"),
        testCases: [
            { caseLabel: "basic pair", input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1] },
            { caseLabel: "unordered pair", input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2] },
            { caseLabel: "duplicate values", input: { nums: [3, 3], target: 6 }, expectedOutput: [0, 1] },
        ],
    },
    {
        title: "Valid Parentheses",
        language: "python",
        functionName: "is_valid",
        boilerplateCode: [
            "def is_valid(s):",
            "    # Return True if s has valid bracket ordering.",
            "    pass",
        ].join("\n"),
        testCases: [
            { caseLabel: "simple valid", input: { s: "()" }, expectedOutput: true },
            { caseLabel: "multi valid", input: { s: "()[]{}" }, expectedOutput: true },
            { caseLabel: "mis-ordered", input: { s: "([)]" }, expectedOutput: false },
        ],
    },
    {
        title: "Best Time to Buy and Sell Stock",
        language: "python",
        functionName: "max_profit",
        boilerplateCode: [
            "def max_profit(prices):",
            "    # Return max single-transaction profit.",
            "    pass",
        ].join("\n"),
        testCases: [
            { caseLabel: "classic gain", input: { prices: [7, 1, 5, 3, 6, 4] }, expectedOutput: 5 },
            { caseLabel: "no gain", input: { prices: [7, 6, 4, 3, 1] }, expectedOutput: 0 },
            { caseLabel: "late gain", input: { prices: [2, 1, 2, 1, 0, 1, 2] }, expectedOutput: 2 },
        ],
    },
    {
        title: "Maximum Subarray",
        language: "python",
        functionName: "max_sub_array",
        boilerplateCode: [
            "def max_sub_array(nums):",
            "    # Return the largest possible subarray sum.",
            "    pass",
        ].join("\n"),
        testCases: [
            { caseLabel: "mixed values", input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, expectedOutput: 6 },
            { caseLabel: "single value", input: { nums: [1] }, expectedOutput: 1 },
            { caseLabel: "all positive", input: { nums: [5, 4, -1, 7, 8] }, expectedOutput: 23 },
        ],
    },
    {
        title: "Climbing Stairs",
        language: "python",
        functionName: "climb_stairs",
        boilerplateCode: [
            "def climb_stairs(n):",
            "    # Return number of distinct ways to reach step n.",
            "    pass",
        ].join("\n"),
        testCases: [
            { caseLabel: "small", input: { n: 2 }, expectedOutput: 2 },
            { caseLabel: "medium", input: { n: 3 }, expectedOutput: 3 },
            { caseLabel: "larger", input: { n: 5 }, expectedOutput: 8 },
        ],
    },
    {
        title: "Valid Anagram",
        language: "python",
        functionName: "is_anagram",
        boilerplateCode: [
            "def is_anagram(s, t):",
            "    # Return True if t is an anagram of s.",
            "    pass",
        ].join("\n"),
        testCases: [
            { caseLabel: "positive", input: { s: "anagram", t: "nagaram" }, expectedOutput: true },
            { caseLabel: "negative", input: { s: "rat", t: "car" }, expectedOutput: false },
            { caseLabel: "empty", input: { s: "", t: "" }, expectedOutput: true },
        ],
    },
];

// Keep one shared pool instance for the service.
export const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "questions_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    max: parseInt(process.env.POSTGRES_POOL_MAX, 10) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

async function seedExecutionProfiles(client) {
    for (const seed of CURATED_EXECUTION_SEED) {
        const questionResult = await client.query(
            "SELECT id FROM questions WHERE LOWER(title) = LOWER($1) LIMIT 1",
            [seed.title]
        );

        if (questionResult.rows.length === 0) {
            continue;
        }

        const questionId = questionResult.rows[0].id;

        const profileResult = await client.query(
            `INSERT INTO question_execution_profiles (question_id, language, function_name, boilerplate_code)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (question_id, language) DO NOTHING
             RETURNING id`,
            [questionId, seed.language, seed.functionName, seed.boilerplateCode]
        );

        let profileId = profileResult.rows[0]?.id;

        if (!profileId) {
            const existingProfile = await client.query(
                `SELECT id
                 FROM question_execution_profiles
                 WHERE question_id = $1 AND language = $2
                 LIMIT 1`,
                [questionId, seed.language]
            );
            profileId = existingProfile.rows[0]?.id;
        }

        if (!profileId) {
            continue;
        }

        for (let index = 0; index < seed.testCases.length; index += 1) {
            const testCase = seed.testCases[index];
            await client.query(
                `INSERT INTO question_execution_cases
                    (profile_id, case_label, input_payload, expected_output, order_index)
                 VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
                 ON CONFLICT (profile_id, order_index) DO NOTHING`,
                [
                    profileId,
                    testCase.caseLabel,
                    JSON.stringify(testCase.input),
                    JSON.stringify(testCase.expectedOutput),
                    index,
                ]
            );
        }
    }
}

/** Creates the service tables and seeds curated execution profiles when possible. */
export async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                topics TEXT[] NOT NULL,
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

            CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_title_unique
                ON questions (LOWER(title));

            CREATE INDEX IF NOT EXISTS idx_questions_complexity
                ON questions(complexity);

            CREATE INDEX IF NOT EXISTS idx_questions_companies
                ON questions USING GIN(companies);

            CREATE INDEX IF NOT EXISTS idx_test_cases_question_id
                ON test_cases(question_id);

            CREATE TABLE IF NOT EXISTS question_locks (
                question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
                locked_by   VARCHAR(255) NOT NULL,
                locked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS question_completions (
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                user_id UUID NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
                attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                PRIMARY KEY (question_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS question_execution_profiles (
                id SERIAL PRIMARY KEY,
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                language VARCHAR(32) NOT NULL DEFAULT 'python',
                function_name VARCHAR(120) NOT NULL,
                boilerplate_code TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(question_id, language)
            );

            CREATE TABLE IF NOT EXISTS question_execution_cases (
                id SERIAL PRIMARY KEY,
                profile_id INTEGER NOT NULL REFERENCES question_execution_profiles(id) ON DELETE CASCADE,
                case_label VARCHAR(120),
                input_payload JSONB NOT NULL,
                expected_output JSONB NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(profile_id, order_index)
            );

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'questions' AND column_name = 'categories'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'questions' AND column_name = 'topics'
                ) THEN
                    ALTER TABLE questions RENAME COLUMN categories TO topics;
                END IF;
            END $$;

            ALTER TABLE question_completions
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';

            ALTER TABLE question_completions
                ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

            ALTER TABLE question_completions
                ALTER COLUMN completed_at DROP NOT NULL;

            ALTER TABLE question_completions
                ALTER COLUMN completed_at DROP DEFAULT;

            ALTER TABLE question_completions
                DROP CONSTRAINT IF EXISTS question_completions_status_check;

            ALTER TABLE question_completions
                ADD CONSTRAINT question_completions_status_check
                CHECK (status IN ('ATTEMPTED', 'COMPLETED'));

            UPDATE question_completions
            SET status = 'COMPLETED'
            WHERE status IS NULL;

            UPDATE question_completions
            SET attempted_at = COALESCE(attempted_at, completed_at, CURRENT_TIMESTAMP);

            UPDATE question_completions
            SET completed_at = COALESCE(completed_at, attempted_at)
            WHERE status = 'COMPLETED' AND completed_at IS NULL;

            DROP INDEX IF EXISTS idx_questions_categories;

            CREATE INDEX IF NOT EXISTS idx_questions_topics
                ON questions USING GIN(topics);

            CREATE INDEX IF NOT EXISTS idx_question_completions_user_id
                ON question_completions(user_id);

            CREATE INDEX IF NOT EXISTS idx_question_completions_status
                ON question_completions(status);

            CREATE INDEX IF NOT EXISTS idx_question_execution_profiles_question_id
                ON question_execution_profiles(question_id);

            CREATE INDEX IF NOT EXISTS idx_question_execution_profiles_language
                ON question_execution_profiles(language);

            CREATE INDEX IF NOT EXISTS idx_question_execution_cases_profile_id
                ON question_execution_cases(profile_id);
        `);

        await seedExecutionProfiles(client);

        console.log("Database schema initialized");
    } finally {
        client.release();
    }
}
