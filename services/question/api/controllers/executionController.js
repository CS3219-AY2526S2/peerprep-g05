import { pool } from "../../infrastructure/postgres/client.js";

/**
 * GET /:id/collaboration-payload
 * POST /:id/boilerplate
 *
 * Returns question details plus curated boilerplate/test cases.
 * Collaboration service can send this payload directly to execution service.
 */
export async function getCollaborationQuestionPayload(req, res, next) {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ success: false, error: "Invalid question id" });
        }

        const languageFromQuery = typeof req.query.language === "string" ? req.query.language : "";
        const languageFromBody = typeof req.body?.language === "string" ? req.body.language : "";
        const requestedLanguage = (languageFromQuery || languageFromBody || "python").trim().toLowerCase();

        const profileResult = await pool.query(
            `SELECT q.id AS question_id,
                    q.title,
                    q.description,
                    q.topics,
                    q.complexity,
                    q.companies,
                    q.created_at,
                    q.updated_at,
                    p.id AS profile_id,
                    p.language,
                    p.function_name,
                    p.boilerplate_code
             FROM questions q
             JOIN question_execution_profiles p ON p.question_id = q.id
             WHERE q.id = $1
               AND p.is_active = true
             ORDER BY CASE WHEN p.language = $2 THEN 0 ELSE 1 END, p.id
             LIMIT 1`,
            [questionId, requestedLanguage]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No execution profile found for this question",
            });
        }

        const profile = profileResult.rows[0];
        const testCaseResult = await pool.query(
            `SELECT id, case_label, input_payload, expected_output, order_index
             FROM question_execution_cases
             WHERE profile_id = $1
             ORDER BY order_index, id`,
            [profile.profile_id]
        );
        const legacyTestCaseResult = testCaseResult.rows.length > 0
            ? null
            : await pool.query(
                `SELECT id, input, expected_output, order_index
                 FROM test_cases
                 WHERE question_id = $1
                 ORDER BY order_index, id`,
                [questionId]
            );
        const testCases = testCaseResult.rows.length > 0
            ? testCaseResult.rows.map((tc) => ({
                id: tc.id,
                case_label: tc.case_label,
                input: tc.input_payload,
                expected_output: tc.expected_output,
                order_index: tc.order_index,
            }))
            : (legacyTestCaseResult?.rows || []).map((tc) => ({
                id: tc.id,
                case_label: null,
                input: tc.input,
                expected_output: tc.expected_output,
                order_index: tc.order_index,
            }));

        const responseData = {
            question: {
                id: profile.question_id,
                title: profile.title,
                description: profile.description,
                topics: profile.topics,
                complexity: profile.complexity,
                companies: profile.companies,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
            },
            execution: {
                language: profile.language,
                function_name: profile.function_name,
                boilerplate_code: profile.boilerplate_code,
                test_cases: testCases,
            },
        };

        return res.json({ success: true, data: responseData });
    } catch (error) {
        next(error);
    }
}

export const getBoilerplateAndEvaluate = getCollaborationQuestionPayload;
