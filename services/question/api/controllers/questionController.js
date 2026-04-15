import { pool } from "../../infrastructure/postgres/client.js";
import {
    fetchRequesterProfile,
    isPrivilegedRequester,
} from "../utils/requesterAuth.js";

const VALID_COMPLEXITIES = ["Easy", "Medium", "Hard"];
const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 10000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const PRIVILEGED_ROLES = new Set(["ADMIN", "MASTER_ADMIN"]);
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || "http://localhost:3001/api/v1";
const PROGRESS_STATUSES = new Set(["COMPLETED", "ATTEMPTED", "INCOMPLETE"]);

/**
 * Build an absolute pagination URL while preserving existing query filters.
 * @param {import('express').Request} req
 * @param {number} page
 * @param {number} limit
 * @returns {string}
 */
function buildPageLink(req, page, limit) {
    const host = req.get("host");
    const protocol = req.protocol || "http";
    const url = new URL(req.originalUrl || req.baseUrl || req.path, `${protocol}://${host}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    return url.toString();
}

/**
 * @param {Array} params - Query parameter array (mutated in-place).
 * @param {{ complexity?: string, topic?: string, company?: string, search?: string }} filters
 * @returns {string} SQL WHERE clause or empty string.
 */
function buildFilterClause(params, { complexity, topic, company, search }) {
    const conditions = [];

    if (complexity) {
        params.push(complexity);
        conditions.push(`complexity = $${params.length}`);
    }

    if (topic) {
        params.push(topic);
        conditions.push(`$${params.length} = ANY(topics)`);
    }

    if (company) {
        params.push(company);
        conditions.push(`$${params.length} = ANY(companies)`);
    }

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    return conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
}

/**
 * @param {{ title?: string, description?: string, topics?: string[], complexity?: string, companies?: string[] }} body
 * @param {boolean} requireAll - If true, all core fields are mandatory.
 * @returns {string[]} Validation error messages.
 */
function validateQuestionBody({ title, description, topics, complexity, companies }, requireAll = true) {
    const errors = [];

    if (requireAll && (!title || !description || !topics || !complexity)) {
        return ["Missing required fields: title, description, topics, complexity"];
    }

    if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
            errors.push("title must be a non-empty string");
        } else if (title.length > TITLE_MAX_LENGTH) {
            errors.push(`title must be at most ${TITLE_MAX_LENGTH} characters`);
        }
    }

    if (description !== undefined) {
        if (typeof description !== "string" || description.trim().length === 0) {
            errors.push("description must be a non-empty string");
        } else if (description.length > DESCRIPTION_MAX_LENGTH) {
            errors.push(`description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
        }
    }

    if (topics !== undefined) {
        if (!Array.isArray(topics) || topics.length === 0) {
            errors.push("topics must be a non-empty array of strings");
        } else if (!topics.every(c => typeof c === "string" && c.trim().length > 0)) {
            errors.push("each topic must be a non-empty string");
        }
    }

    if (complexity !== undefined && !VALID_COMPLEXITIES.includes(complexity)) {
        errors.push("complexity must be Easy, Medium, or Hard");
    }

    if (companies !== undefined) {
        if (!Array.isArray(companies)) {
            errors.push("companies must be an array of strings");
        } else if (!companies.every(c => typeof c === "string" && c.trim().length > 0)) {
            errors.push("each company must be a non-empty string");
        }
    }

    return errors;
}

/**
 * @param {Array<{ input: string, expected_output: string, is_public?: boolean }>} testCases
 * @returns {string[]} Validation error messages.
 */
function validateTestCases(testCases) {
    const errors = [];
    if (!Array.isArray(testCases)) {
        return ["test_cases must be an array"];
    }
    testCases.forEach((tc, i) => {
        if (typeof tc.input !== "string") errors.push(`test_cases[${i}].input must be a string`);
        if (typeof tc.expected_output !== "string") errors.push(`test_cases[${i}].expected_output must be a string`);
        if (tc.is_public !== undefined && typeof tc.is_public !== "boolean") {
            errors.push(`test_cases[${i}].is_public must be a boolean`);
        }
    });
    return errors;
}

/**
 * @param {number[]} questionIds
 * @param {boolean} [includePrivate=false]
 * @returns {Promise<Object.<number, Array>>} Map of questionId → test-case rows.
 */
async function fetchTestCases(questionIds, includePrivate = false) {
    if (questionIds.length === 0) return {};
    const privacyFilter = includePrivate ? "" : " AND is_public = true";
    const result = await pool.query(
        `SELECT * FROM test_cases WHERE question_id = ANY($1)${privacyFilter} ORDER BY order_index, id`,
        [questionIds]
    );
    const map = {};
    for (const row of result.rows) {
        (map[row.question_id] ||= []).push(row);
    }
    return map;
}

async function questionExists(questionId) {
    const exists = await pool.query("SELECT 1 FROM questions WHERE id = $1", [questionId]);
    return exists.rows.length > 0;
}

function normalizeProgressStatus(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return PROGRESS_STATUSES.has(normalized) ? normalized : null;
}

/** GET / — paginated list with optional filters and text search. */
export async function getAllQuestions(req, res, next) {
    try {
        const { complexity, topic, company, search } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
        const offset = (page - 1) * limit;

        const countParams = [];
        const whereClause = buildFilterClause(countParams, { complexity, topic, company, search });

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM questions ${whereClause}`,
            countParams
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const dataParams = [...countParams];
        dataParams.push(limit, offset);
        const result = await pool.query(
            `SELECT * FROM questions ${whereClause} ORDER BY id DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
            dataParams
        );

        const questionIds = result.rows.map(q => q.id);
        const testCaseMap = await fetchTestCases(questionIds, false);
        const data = result.rows.map(q => ({
            ...q,
            test_cases: testCaseMap[q.id] || [],
        }));

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                links: {
                    self: buildPageLink(req, page, limit),
                    next: hasNext ? buildPageLink(req, page + 1, limit) : null,
                    prev: hasPrev ? buildPageLink(req, page - 1, limit) : null,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/** GET /:id — fetch a single question with its test cases. */
export async function getQuestionById(req, res, next) {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM questions WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }

        const includePrivateRequested = req.query.include_private === "true";
        const includePrivate = includePrivateRequested ? await isPrivilegedRequester(req) : false;
        const testCaseMap = await fetchTestCases([parseInt(id)], includePrivate);

        res.json({
            success: true,
            data: { ...result.rows[0], test_cases: testCaseMap[id] || [] },
        });
    } catch (error) {
        next(error);
    }
}

/** GET /random — return one question matching optional filters. */
export async function getRandomQuestion(req, res, next) {
    try {
        const { complexity, topic, company } = req.query;

        const params = [];
        const whereClause = buildFilterClause(params, { complexity, topic, company });

        const result = await pool.query(
            `SELECT * FROM questions ${whereClause} ORDER BY RANDOM() LIMIT 1`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "No questions found matching criteria" });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
}

/** POST / — create a new question (with optional test cases). */
export async function createQuestion(req, res, next) {
    try {
        const { title, description, topics, complexity, companies, test_cases } = req.body;

        const errors = validateQuestionBody({ title, description, topics, complexity, companies }, true);
        if (test_cases !== undefined) {
            errors.push(...validateTestCases(test_cases));
        }
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const dup = await pool.query(
            "SELECT id FROM questions WHERE LOWER(title) = LOWER($1)",
            [title.trim()]
        );
        if (dup.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: `A question with the title "${title}" already exists (id: ${dup.rows[0].id})`,
            });
        }

        const result = await pool.query(
            `WITH id_lock AS (
                 SELECT pg_advisory_xact_lock(2147483001)
             ),
             next_id AS (
                 SELECT gs AS id
                 FROM generate_series(
                     1,
                     COALESCE((SELECT MAX(id) FROM questions), 0) + 1
                 ) AS gs
                 WHERE NOT EXISTS (
                     SELECT 1 FROM questions q WHERE q.id = gs
                 )
                 ORDER BY gs
                 LIMIT 1
             ),
             inserted AS (
                 INSERT INTO questions (id, title, description, topics, complexity, companies)
                 SELECT next_id.id, $1, $2, $3, $4, $5
                 FROM next_id
                 RETURNING *
             ),
             sync_sequence AS (
                 SELECT setval(
                     pg_get_serial_sequence('questions', 'id'),
                     (SELECT MAX(id) FROM questions),
                     true
                 )
             )
             SELECT * FROM inserted`,
            [title.trim(), description.trim(), topics, complexity, companies || []]
        );

        const question = result.rows[0];

        let insertedTestCases = [];
        if (test_cases && test_cases.length > 0) {
            const values = [];
            const placeholders = test_cases.map((tc, i) => {
                const offset = i * 4;
                values.push(question.id, tc.input, tc.expected_output, tc.is_public ?? true);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ${i})`;
            });
            const tcResult = await pool.query(
                `INSERT INTO test_cases (question_id, input, expected_output, is_public, order_index)
                 VALUES ${placeholders.join(", ")}
                 RETURNING *`,
                values
            );
            insertedTestCases = tcResult.rows;
        }

        res.status(201).json({ success: true, data: { ...question, test_cases: insertedTestCases } });
    } catch (error) {
        next(error);
    }
}

/** PUT /:id — update an existing question (partial updates allowed). */
export async function updateQuestion(req, res, next) {
    try {
        const { id } = req.params;
        const payload = req.body || {};
        const lockHolder = req.get("x-lock-holder") || payload.locked_by;
        const { title, description, topics, complexity, companies, test_cases } = payload;

        if (!title && !description && !topics && !complexity && !companies && !test_cases) {
            return res.status(400).json({ success: false, error: "Provide at least one field to update" });
        }

        const errors = validateQuestionBody({ title, description, topics, complexity, companies }, false);
        if (test_cases !== undefined) {
            errors.push(...validateTestCases(test_cases));
        }
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const existing = await pool.query("SELECT id FROM questions WHERE id = $1", [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }

        if (!lockHolder || typeof lockHolder !== "string" || lockHolder.trim().length === 0) {
            return res.status(400).json({ success: false, error: "x-lock-holder header (or locked_by) is required" });
        }

        const lockResult = await pool.query(
            "SELECT locked_by FROM question_locks WHERE question_id = $1",
            [id]
        );

        if (lockResult.rows.length === 0) {
            return res.status(409).json({
                success: false,
                error: "Question is not locked for editing. Acquire lock before saving.",
            });
        }

        if (lockResult.rows[0].locked_by !== lockHolder.trim()) {
            return res.status(409).json({
                success: false,
                error: `Question is currently being edited by ${lockResult.rows[0].locked_by}`,
            });
        }

        if (title) {
            const dup = await pool.query(
                "SELECT id FROM questions WHERE LOWER(title) = LOWER($1) AND id != $2",
                [title.trim(), id]
            );
            if (dup.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: `A question with the title "${title}" already exists (id: ${dup.rows[0].id})`,
                });
            }
        }

        const result = await pool.query(
            `UPDATE questions
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 topics = COALESCE($3, topics),
                 complexity = COALESCE($4, complexity),
                 companies = COALESCE($5, companies),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [
                title ? title.trim() : null,
                description ? description.trim() : null,
                topics || null,
                complexity || null,
                companies || null,
                id,
            ]
        );

        let updatedTestCases;
        if (test_cases !== undefined) {
            await pool.query("DELETE FROM test_cases WHERE question_id = $1", [id]);
            if (test_cases.length > 0) {
                const values = [];
                const placeholders = test_cases.map((tc, i) => {
                    const offset = i * 4;
                    values.push(parseInt(id), tc.input, tc.expected_output, tc.is_public ?? true);
                    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, ${i})`;
                });
                const tcResult = await pool.query(
                    `INSERT INTO test_cases (question_id, input, expected_output, is_public, order_index)
                     VALUES ${placeholders.join(", ")}
                     RETURNING *`,
                    values
                );
                updatedTestCases = tcResult.rows;
            } else {
                updatedTestCases = [];
            }
        } else {
            const tcResult = await pool.query(
                "SELECT * FROM test_cases WHERE question_id = $1 ORDER BY order_index, id",
                [id]
            );
            updatedTestCases = tcResult.rows;
        }

        res.json({ success: true, data: { ...result.rows[0], test_cases: updatedTestCases } });
    } catch (error) {
        next(error);
    }
}

/** DELETE /:id — remove a question and its test cases. */
export async function deleteQuestion(req, res, next) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM questions
             WHERE id = $1
             AND NOT EXISTS (
                 SELECT 1 FROM question_locks WHERE question_id = $1
             )
             RETURNING id`,
            [id]
        );

        if ((result?.rows || []).length === 0) {
            const exists = await pool.query("SELECT id FROM questions WHERE id = $1", [id]);
            if ((exists?.rows || []).length === 0) {
                return res.status(404).json({ success: false, error: "Question not found" });
            }

            const lockResult = await pool.query(
                "SELECT locked_by FROM question_locks WHERE question_id = $1",
                [id]
            );

            if ((lockResult?.rows || []).length > 0) {
                return res.status(409).json({
                    success: false,
                    error: `Question is currently being edited by ${lockResult.rows[0].locked_by}. Deletion is not allowed.`,
                });
            }

            return res.status(409).json({
                success: false,
                error: "Unable to delete question. Please retry.",
            });
        }

        res.json({ success: true, message: "Question deleted successfully" });
    } catch (error) {
        next(error);
    }
}

/** GET /topics — list all distinct topic values. */
export async function listTopics(req, res, next) {
    try {
        const result = await pool.query(
            "SELECT DISTINCT UNNEST(topics) AS topic FROM questions ORDER BY topic"
        );
        res.json({ success: true, data: result.rows.map(r => r.topic) });
    } catch (error) {
        next(error);
    }
}

/** GET /companies — list all distinct company values. */
export async function listCompanies(req, res, next) {
    try {
        const result = await pool.query(
            "SELECT DISTINCT UNNEST(companies) AS company FROM questions ORDER BY company"
        );
        res.json({ success: true, data: result.rows.map(r => r.company) });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /:id/completions — mark this question as completed by a unique user.
 * Prefers authenticated requester id from user-service; falls back to body.user_id when provided.
 */
export async function markQuestionCompleted(req, res, next) {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ success: false, error: "Invalid question id" });
        }

        if (!(await questionExists(questionId))) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }

        const requester = await fetchRequesterProfile(req);
        const fallbackUserId = typeof req.body?.user_id === "string" ? req.body.user_id.trim() : "";
        const userId = requester?.id || fallbackUserId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "Provide an authentication token or user_id in request body",
            });
        }

        const existingResult = await pool.query(
            `SELECT status, attempted_at, completed_at
             FROM question_completions
             WHERE question_id = $1 AND user_id = $2::uuid`,
            [questionId, userId]
        );

        const alreadyCompleted = existingResult.rows[0]?.status === "COMPLETED";

        const upsertResult = await pool.query(
            `INSERT INTO question_completions (question_id, user_id, status, attempted_at, completed_at)
             VALUES ($1, $2::uuid, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (question_id, user_id) DO UPDATE
             SET status = 'COMPLETED',
                 attempted_at = COALESCE(question_completions.attempted_at, CURRENT_TIMESTAMP),
                 completed_at = COALESCE(question_completions.completed_at, CURRENT_TIMESTAMP)
             RETURNING question_id, user_id, status, attempted_at, completed_at`,
            [questionId, userId]
        );

        const completionRow = upsertResult.rows[0] || null;

        const countResult = await pool.query(
            `SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS unique_users_completed,
                    COUNT(*) FILTER (WHERE status = 'ATTEMPTED')::int AS unique_users_attempted
             FROM question_completions
             WHERE question_id = $1`,
            [questionId]
        );

        res.status(alreadyCompleted ? 200 : 201).json({
            success: true,
            data: {
                question_id: questionId,
                user_id: completionRow?.user_id || userId,
                status: completionRow?.status || "COMPLETED",
                attempted_at: completionRow?.attempted_at || null,
                completed_at: completionRow?.completed_at || null,
                already_completed: alreadyCompleted,
                unique_users_completed: countResult.rows[0].unique_users_completed,
                unique_users_attempted: countResult.rows[0].unique_users_attempted,
            },
        });
    } catch (error) {
        if (error?.code === "22P02") {
            return res.status(400).json({ success: false, error: "user_id must be a valid UUID" });
        }
        next(error);
    }
}

/**
 * POST /:id/completions/bulk — mark a question completed by multiple unique users.
 * Intended for collaboration/matching flow where two users finish the same question.
 */
export async function markQuestionCompletedByUsers(req, res, next) {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ success: false, error: "Invalid question id" });
        }

        if (!(await questionExists(questionId))) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }

        const rawOutcomes = Array.isArray(req.body?.user_outcomes)
            ? req.body.user_outcomes
            : null;

        const legacyUserIds = Array.isArray(req.body?.user_ids) ? req.body.user_ids : null;

        const normalizedOutcomes = rawOutcomes
            ? rawOutcomes
                .filter((entry) => entry && typeof entry === "object")
                .map((entry) => ({
                    user_id: typeof entry.user_id === "string" ? entry.user_id.trim() : "",
                    status: normalizeProgressStatus(entry.status),
                }))
                .filter((entry) => entry.user_id && entry.status)
            : (legacyUserIds || [])
                .filter((id) => typeof id === "string")
                .map((id) => ({ user_id: id.trim(), status: "COMPLETED" }))
                .filter((entry) => entry.user_id);

        if (normalizedOutcomes.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Provide user_ids or user_outcomes with valid user_id and status",
            });
        }

        const outcomesByUser = new Map();
        for (const outcome of normalizedOutcomes) {
            outcomesByUser.set(outcome.user_id, outcome.status);
        }

        const completedUserIds = [];
        const attemptedUserIds = [];
        const incompleteUserIds = [];

        for (const [userId, status] of outcomesByUser.entries()) {
            if (status === "INCOMPLETE") {
                await pool.query(
                    `DELETE FROM question_completions
                     WHERE question_id = $1 AND user_id = $2::uuid`,
                    [questionId, userId]
                );
                incompleteUserIds.push(userId);
                continue;
            }

            if (status === "ATTEMPTED") {
                await pool.query(
                    `INSERT INTO question_completions (question_id, user_id, status, attempted_at, completed_at)
                     VALUES ($1, $2::uuid, 'ATTEMPTED', CURRENT_TIMESTAMP, NULL)
                     ON CONFLICT (question_id, user_id) DO UPDATE
                     SET status = 'ATTEMPTED',
                         attempted_at = COALESCE(question_completions.attempted_at, CURRENT_TIMESTAMP),
                         completed_at = NULL`,
                    [questionId, userId]
                );
                attemptedUserIds.push(userId);
                continue;
            }

            await pool.query(
                `INSERT INTO question_completions (question_id, user_id, status, attempted_at, completed_at)
                 VALUES ($1, $2::uuid, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT (question_id, user_id) DO UPDATE
                 SET status = 'COMPLETED',
                     attempted_at = COALESCE(question_completions.attempted_at, CURRENT_TIMESTAMP),
                     completed_at = COALESCE(question_completions.completed_at, CURRENT_TIMESTAMP)`,
                [questionId, userId]
            );
            completedUserIds.push(userId);
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS unique_users_completed,
                    COUNT(*) FILTER (WHERE status = 'ATTEMPTED')::int AS unique_users_attempted
             FROM question_completions
             WHERE question_id = $1`,
            [questionId]
        );

        res.status(200).json({
            success: true,
            data: {
                question_id: questionId,
                processed_user_ids: Array.from(outcomesByUser.keys()),
                completed_user_ids: completedUserIds,
                attempted_user_ids: attemptedUserIds,
                incomplete_user_ids: incompleteUserIds,
                unique_users_completed: countResult.rows[0].unique_users_completed,
                unique_users_attempted: countResult.rows[0].unique_users_attempted,
            },
        });
    } catch (error) {
        if (error?.code === "22P02") {
            return res.status(400).json({ success: false, error: "Each user_id must be a valid UUID" });
        }
        next(error);
    }
}

/**
 * GET /:id/completions — get unique completion stats for a question.
 * Pass include_users=true to also return distinct user ids.
 */
export async function getQuestionCompletionStats(req, res, next) {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ success: false, error: "Invalid question id" });
        }

        if (!(await questionExists(questionId))) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS unique_users_completed,
                    COUNT(*) FILTER (WHERE status = 'ATTEMPTED')::int AS unique_users_attempted
             FROM question_completions
             WHERE question_id = $1`,
            [questionId]
        );

        const includeUsers = req.query.include_users === "true";
        let completedUserIds = undefined;
        let attemptedUserIds = undefined;

        if (includeUsers) {
            const usersResult = await pool.query(
                `SELECT user_id, status
                 FROM question_completions
                 WHERE question_id = $1
                 ORDER BY COALESCE(completed_at, attempted_at) DESC`,
                [questionId]
            );
            completedUserIds = usersResult.rows
                .filter((row) => row.status === "COMPLETED")
                .map((row) => row.user_id);
            attemptedUserIds = usersResult.rows
                .filter((row) => row.status === "ATTEMPTED")
                .map((row) => row.user_id);
        }

        res.json({
            success: true,
            data: {
                question_id: questionId,
                unique_users_completed: countResult.rows[0].unique_users_completed,
                unique_users_attempted: countResult.rows[0].unique_users_attempted,
                completed_user_ids: completedUserIds,
                attempted_user_ids: attemptedUserIds,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /completions/users/:userId — list questions completed by a user.
 * Pass include_details=true to include question metadata.
 */
export async function getCompletedQuestionsByUser(req, res, next) {
    try {
        const userId = String(req.params.userId || "").trim();
        if (!userId) {
            return res.status(400).json({ success: false, error: "userId is required" });
        }

        const includeDetails = req.query.include_details === "true";
        const includeAttempted = req.query.include_attempted === "true";

        const result = await pool.query(
            `SELECT qc.question_id, qc.status, qc.attempted_at, qc.completed_at,
                    q.title, q.complexity, q.topics
             FROM question_completions qc
             JOIN questions q ON q.id = qc.question_id
             WHERE qc.user_id = $1::uuid
               AND ($2::boolean OR qc.status = 'COMPLETED')
             ORDER BY COALESCE(qc.completed_at, qc.attempted_at) DESC`,
            [userId, includeAttempted]
        );

        const progressRows = includeDetails
            ? result.rows.map((row) => ({
                question_id: row.question_id,
                status: row.status,
                attempted_at: row.attempted_at,
                completed_at: row.completed_at,
                title: row.title,
                complexity: row.complexity,
                topics: row.topics,
            }))
            : result.rows.map((row) => ({
                question_id: row.question_id,
                status: row.status,
                attempted_at: row.attempted_at,
                completed_at: row.completed_at,
            }));

        const completedQuestions = progressRows.filter((row) => row.status === "COMPLETED");
        const attemptedQuestions = progressRows.filter((row) => row.status === "ATTEMPTED");

        res.json({
            success: true,
            data: {
                user_id: userId,
                total_completed_questions: completedQuestions.length,
                total_attempted_questions: attemptedQuestions.length,
                completed_questions: completedQuestions,
                attempted_questions: includeAttempted ? attemptedQuestions : undefined,
            },
        });
    } catch (error) {
        if (error?.code === "22P02") {
            return res.status(400).json({ success: false, error: "userId must be a valid UUID" });
        }
        next(error);
    }
}
