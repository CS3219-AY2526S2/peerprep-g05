import { pool } from "../../infrastructure/postgres/client.js";

const VALID_COMPLEXITIES = ["Easy", "Medium", "Hard"];
const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 10000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
 * @param {{ complexity?: string, category?: string, company?: string, search?: string }} filters
 * @returns {string} SQL WHERE clause or empty string.
 */
function buildFilterClause(params, { complexity, category, company, search }) {
    const conditions = [];

    if (complexity) {
        params.push(complexity);
        conditions.push(`complexity = $${params.length}`);
    }

    if (category) {
        params.push(category);
        conditions.push(`$${params.length} = ANY(categories)`);
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
 * @param {{ title?: string, description?: string, categories?: string[], complexity?: string, companies?: string[] }} body
 * @param {boolean} requireAll - If true, all core fields are mandatory.
 * @returns {string[]} Validation error messages.
 */
function validateQuestionBody({ title, description, categories, complexity, companies }, requireAll = true) {
    const errors = [];

    if (requireAll && (!title || !description || !categories || !complexity)) {
        return ["Missing required fields: title, description, categories, complexity"];
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

    if (categories !== undefined) {
        if (!Array.isArray(categories) || categories.length === 0) {
            errors.push("categories must be a non-empty array of strings");
        } else if (!categories.every(c => typeof c === "string" && c.trim().length > 0)) {
            errors.push("each category must be a non-empty string");
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

/** GET / — paginated list with optional filters and text search. */
export async function getAllQuestions(req, res, next) {
    try {
        const { complexity, category, company, search } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
        const offset = (page - 1) * limit;

        const countParams = [];
        const whereClause = buildFilterClause(countParams, { complexity, category, company, search });

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

        const includePrivate = req.query.include_private === "true";
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
        const { complexity, category, company } = req.query;

        const params = [];
        const whereClause = buildFilterClause(params, { complexity, category, company });

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
        const { title, description, categories, complexity, companies, test_cases } = req.body;

        const errors = validateQuestionBody({ title, description, categories, complexity, companies }, true);
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
             )
             INSERT INTO questions (id, title, description, categories, complexity, companies)
             SELECT next_id.id, $1, $2, $3, $4, $5
             FROM next_id
             RETURNING *`,
            [title.trim(), description.trim(), categories, complexity, companies || []]
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
        const { title, description, categories, complexity, companies, test_cases } = payload;

        if (!title && !description && !categories && !complexity && !companies && !test_cases) {
            return res.status(400).json({ success: false, error: "Provide at least one field to update" });
        }

        const errors = validateQuestionBody({ title, description, categories, complexity, companies }, false);
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
                 categories = COALESCE($3, categories),
                 complexity = COALESCE($4, complexity),
                 companies = COALESCE($5, companies),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [
                title ? title.trim() : null,
                description ? description.trim() : null,
                categories || null,
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

/** GET /categories — list all distinct category values. */
export async function listCategories(req, res, next) {
    try {
        const result = await pool.query(
            "SELECT DISTINCT UNNEST(categories) AS category FROM questions ORDER BY category"
        );
        res.json({ success: true, data: result.rows.map(r => r.category) });
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
