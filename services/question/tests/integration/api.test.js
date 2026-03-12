/**
 * Integration tests for the Question API.
 *
 * These spin up the Express app with a mocked postgres pool and exercise the
 * full HTTP request/response cycle via supertest.
 */
import { jest } from "@jest/globals";

// ---------- mock postgres ----------
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.unstable_mockModule("../../infrastructure/postgres/client.js", () => ({
    postgres: {
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
// GET /api/v1/questions/categories
// ============================================================
describe("GET /api/v1/questions/categories", () => {
    it("200 — returns distinct categories", async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ category: "Array" }, { category: "DP" }],
        });

        const res = await request.get("/api/v1/questions/categories");

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
// POST /api/v1/questions
// ============================================================
describe("POST /api/v1/questions", () => {
    const validPayload = {
        title: "Two Sum",
        description: "Given an array of integers...",
        categories: ["Array", "Hash Table"],
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
