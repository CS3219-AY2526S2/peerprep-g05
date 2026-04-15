/**
 * Integration tests for the Question API.
 *
 * These spin up the Express app with a mocked pool and exercise the
 * full HTTP request/response cycle via supertest.
 */
import { jest } from "@jest/globals";

// ---------- mock pool ----------
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.unstable_mockModule("../../infrastructure/postgres/client.js", () => ({
    pool: {
        query: mockQuery,
        connect: mockConnect,
        end: mockEnd,
    },
    initDatabase: jest.fn(),
}));

// ---------- import app after mocks ----------
const express = (await import("express")).default;
const cors = (await import("cors")).default;
const questionRoutes = (await import("../../api/routes/questionRoutes.js")).default;

// Build a lightweight app (mirrors server.js but without DB init / listen)
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/v1/questions", questionRoutes);
app.use((_req, res) => res.status(404).json({ success: false, error: "Route not found" }));
app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, error: err.message });
});

const supertest = (await import("supertest")).default;
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

// ============================================================
// GET /api/v1/questions
// ============================================================
describe("GET /api/v1/questions", () => {
    it("200 — returns paginated question list", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: "1" }] })
            .mockResolvedValueOnce({ rows: [{ id: 1, title: "Two Sum" }] })
            .mockResolvedValueOnce({ rows: [] }); // test_cases fetch

        const res = await request.get("/api/v1/questions");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.pagination).toBeDefined();
    });

    it("200 — supports complexity filter", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: "0" }] })
            .mockResolvedValueOnce({ rows: [] }); // no questions = no test_cases fetch

        const res = await request.get("/api/v1/questions?complexity=Hard");

        expect(res.status).toBe(200);
        // Verify the query was called with the complexity param
        expect(mockQuery.mock.calls[0][1]).toContain("Hard");
    });
});

// ============================================================
// GET /api/v1/questions/random
// ============================================================
describe("GET /api/v1/questions/random", () => {
    it("200 — returns a random question", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, title: "Add Two Numbers" }] });

        const res = await request.get("/api/v1/questions/random");

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(3);
    });

    it("404 — when no questions match", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request.get("/api/v1/questions/random?complexity=Hard");

        expect(res.status).toBe(404);
    });
});

// ============================================================
// GET /api/v1/questions/topics
// ============================================================
describe("GET /api/v1/questions/topics", () => {
    it("200 — returns distinct topics", async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ topic: "Array" }, { topic: "DP" }],
        });

        const res = await request.get("/api/v1/questions/topics");

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(["Array", "DP"]);
    });
});

// ============================================================
// GET /api/v1/questions/companies
// ============================================================
describe("GET /api/v1/questions/companies", () => {
    it("200 — returns distinct companies", async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ company: "Amazon" }, { company: "Google" }, { company: "Meta" }],
        });

        const res = await request.get("/api/v1/questions/companies");

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual(["Amazon", "Google", "Meta"]);
    });
});

// ============================================================
// GET /api/v1/questions/:id
// ============================================================
describe("GET /api/v1/questions/:id", () => {
    it("200 — returns the question with public test cases", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 1, title: "Two Sum" }] })
            .mockResolvedValueOnce({ rows: [{ id: 10, question_id: 1, input: "[2,7]", expected_output: "[0,1]", is_public: true }] });

        const res = await request.get("/api/v1/questions/1");

        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe("Two Sum");
        expect(res.body.data.test_cases).toHaveLength(1);
    });

    it("404 — question not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request.get("/api/v1/questions/999");

        expect(res.status).toBe(404);
    });
});

// ============================================================
// GET /api/v1/questions/:id/collaboration-payload
// POST /api/v1/questions/:id/boilerplate
// ============================================================
describe("Collaboration payload endpoints", () => {
    it("200 — returns full collaboration payload via GET", async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{
                    question_id: 1,
                    title: "Two Sum",
                    description: "Given an array of integers...",
                    topics: ["Array", "Hash Table"],
                    complexity: "Easy",
                    companies: ["Amazon"],
                    created_at: "2026-04-12T00:00:00.000Z",
                    updated_at: "2026-04-12T00:00:00.000Z",
                    profile_id: 5,
                    language: "python",
                    function_name: "two_sum",
                    boilerplate_code: "def two_sum(nums, target):\n    pass",
                }],
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 10,
                    case_label: "basic",
                    input_payload: { nums: [2, 7, 11, 15], target: 9 },
                    expected_output: [0, 1],
                    order_index: 0,
                }],
            });

        const res = await request
            .get("/api/v1/questions/1/collaboration-payload?language=python");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.question.title).toBe("Two Sum");
        expect(res.body.data.execution.boilerplate_code).toContain("def two_sum");
        expect(res.body.data.execution.test_cases).toHaveLength(1);
    });

    it("200 — returns payload via POST /boilerplate for backward compatibility", async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{
                    question_id: 1,
                    title: "Two Sum",
                    description: "Given an array of integers...",
                    topics: ["Array", "Hash Table"],
                    complexity: "Easy",
                    companies: ["Amazon"],
                    created_at: "2026-04-12T00:00:00.000Z",
                    updated_at: "2026-04-12T00:00:00.000Z",
                    profile_id: 5,
                    language: "python",
                    function_name: "two_sum",
                    boilerplate_code: "def two_sum(nums, target):\n    pass",
                }],
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 10,
                    case_label: "basic",
                    input_payload: { nums: [2, 7, 11, 15], target: 9 },
                    expected_output: [0, 1],
                    order_index: 0,
                }],
            });

        const res = await request
            .post("/api/v1/questions/1/boilerplate")
            .send({ language: "python" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.execution.function_name).toBe("two_sum");
    });
});

// ============================================================
// Progress status workflow
// ============================================================
describe("Progress status workflow", () => {
    it("200 — upserts bulk user outcomes (COMPLETED/ATTEMPTED/INCOMPLETE)", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // question exists
            .mockResolvedValueOnce({ rows: [] }) // completed upsert
            .mockResolvedValueOnce({ rows: [] }) // attempted upsert
            .mockResolvedValueOnce({ rows: [] }) // incomplete delete
            .mockResolvedValueOnce({ rows: [{ unique_users_completed: 1, unique_users_attempted: 1 }] });

        const res = await request
            .post("/api/v1/questions/10/completions/bulk")
            .send({
                user_outcomes: [
                    { user_id: "11111111-1111-1111-1111-111111111111", status: "COMPLETED" },
                    { user_id: "22222222-2222-2222-2222-222222222222", status: "ATTEMPTED" },
                    { user_id: "33333333-3333-3333-3333-333333333333", status: "INCOMPLETE" },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.completed_user_ids).toEqual([
            "11111111-1111-1111-1111-111111111111",
        ]);
        expect(res.body.data.attempted_user_ids).toEqual([
            "22222222-2222-2222-2222-222222222222",
        ]);
        expect(res.body.data.incomplete_user_ids).toEqual([
            "33333333-3333-3333-3333-333333333333",
        ]);
    });

    it("200 — maps boolean outcomes to COMPLETED/ATTEMPTED", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // question exists
            .mockResolvedValueOnce({ rows: [] }) // completed upsert
            .mockResolvedValueOnce({ rows: [] }) // attempted upsert
            .mockResolvedValueOnce({ rows: [{ unique_users_completed: 1, unique_users_attempted: 1 }] });

        const res = await request
            .post("/api/v1/questions/10/completions/bulk")
            .send({
                user_outcomes: [
                    { user_id: "11111111-1111-1111-1111-111111111111", completed: true },
                    { user_id: "22222222-2222-2222-2222-222222222222", completed: false },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.completed_user_ids).toEqual([
            "11111111-1111-1111-1111-111111111111",
        ]);
        expect(res.body.data.attempted_user_ids).toEqual([
            "22222222-2222-2222-2222-222222222222",
        ]);
    });

    it("200 — returns completion stats including attempted users", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // question exists
            .mockResolvedValueOnce({ rows: [{ unique_users_completed: 2, unique_users_attempted: 1 }] })
            .mockResolvedValueOnce({
                rows: [
                    { user_id: "11111111-1111-1111-1111-111111111111", status: "COMPLETED" },
                    { user_id: "22222222-2222-2222-2222-222222222222", status: "ATTEMPTED" },
                    { user_id: "33333333-3333-3333-3333-333333333333", status: "COMPLETED" },
                ],
            });

        const res = await request
            .get("/api/v1/questions/10/completions?include_users=true");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.unique_users_completed).toBe(2);
        expect(res.body.data.unique_users_attempted).toBe(1);
        expect(res.body.data.completed_user_ids).toEqual([
            "11111111-1111-1111-1111-111111111111",
            "33333333-3333-3333-3333-333333333333",
        ]);
        expect(res.body.data.attempted_user_ids).toEqual([
            "22222222-2222-2222-2222-222222222222",
        ]);
    });
});

// ============================================================
// POST /api/v1/questions
// ============================================================
describe("POST /api/v1/questions", () => {
    const validPayload = {
        title: "Two Sum",
        description: "Given an array of integers...",
        topics: ["Array", "Hash Table"],
        complexity: "Easy",
    };

    const payloadWithTestCases = {
        ...validPayload,
        test_cases: [
            { input: "[2,7,11,15], 9", expected_output: "[0,1]", is_public: true },
            { input: "[3,2,4], 6", expected_output: "[1,2]", is_public: false },
        ],
    };

    it("201 — creates a question", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })                              // dup check
            .mockResolvedValueOnce({ rows: [{ id: 1, ...validPayload }] });   // INSERT

        const res = await request.post("/api/v1/questions").send(validPayload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("Two Sum");
        expect(res.body.data.test_cases).toEqual([]);
    });

    it("201 — creates a question with test cases", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })                              // dup check
            .mockResolvedValueOnce({ rows: [{ id: 1, ...validPayload }] })    // INSERT question
            .mockResolvedValueOnce({ rows: [                                  // INSERT test_cases
                { id: 1, question_id: 1, input: "[2,7,11,15], 9", expected_output: "[0,1]", is_public: true, order_index: 0 },
                { id: 2, question_id: 1, input: "[3,2,4], 6", expected_output: "[1,2]", is_public: false, order_index: 1 },
            ]});

        const res = await request.post("/api/v1/questions").send(payloadWithTestCases);

        expect(res.status).toBe(201);
        expect(res.body.data.test_cases).toHaveLength(2);
    });

    it("400 — missing required fields", async () => {
        const res = await request.post("/api/v1/questions").send({ title: "Only title" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("400 — invalid complexity", async () => {
        const res = await request
            .post("/api/v1/questions")
            .send({ ...validPayload, complexity: "Insane" });

        expect(res.status).toBe(400);
    });

    it("400 — invalid test case format", async () => {
        const res = await request
            .post("/api/v1/questions")
            .send({ ...validPayload, test_cases: [{ input: 123, expected_output: "abc" }] });

        expect(res.status).toBe(400);
    });

    it("409 — duplicate title", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] }); // dup found

        const res = await request.post("/api/v1/questions").send(validPayload);

        expect(res.status).toBe(409);
    });
});

// ============================================================
// PUT /api/v1/questions/:id
// ============================================================
describe("PUT /api/v1/questions/:id", () => {
    it("200 — updates a question", async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })                     // existence
            .mockResolvedValueOnce({ rows: [{ id: 1, complexity: "Hard" }] }) // UPDATE
            .mockResolvedValueOnce({ rows: [] });                              // fetch existing test_cases

        const res = await request
            .put("/api/v1/questions/1")
            .send({ complexity: "Hard" });

        expect(res.status).toBe(200);
        expect(res.body.data.complexity).toBe("Hard");
    });

    it("400 — no fields supplied", async () => {
        const res = await request.put("/api/v1/questions/1").send({});

        expect(res.status).toBe(400);
    });

    it("404 — question not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request
            .put("/api/v1/questions/999")
            .send({ title: "Nope" });

        expect(res.status).toBe(404);
    });
});

// ============================================================
// DELETE /api/v1/questions/:id
// ============================================================
describe("DELETE /api/v1/questions/:id", () => {
    it("200 — deletes the question", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const res = await request.delete("/api/v1/questions/1");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("404 — question not found", async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request.delete("/api/v1/questions/999");

        expect(res.status).toBe(404);
    });
});

// ============================================================
// 404 fallthrough
// ============================================================
describe("Unknown routes", () => {
    it("404 — non-existent route", async () => {
        const res = await request.get("/api/v1/nope");

        expect(res.status).toBe(404);
    });
});
