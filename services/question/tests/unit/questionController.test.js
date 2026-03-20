/**
 * Unit tests for questionController.js
 *
 * We mock the pool so these tests run without a database.
 */
import { jest } from "@jest/globals";

// ---------- mock pool ----------
const mockQuery = jest.fn();
const mockPool = { query: mockQuery };

// Mock the pool client module
jest.unstable_mockModule("../../infrastructure/postgres/client.js", () => ({
    pool: mockPool,
    initDatabase: jest.fn(),
}));

// Dynamic import AFTER mock registration (required for ESM)
const {
    getAllQuestions,
    getQuestionById,
    getRandomQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    listCategories,
    listCompanies,
} = await import("../../api/controllers/questionController.js");

// ---------- helpers ----------
function mockReq(overrides = {}) {
    return {
        params: {},
        query: {},
        body: {},
        protocol: "http",
        originalUrl: "/api/v1/questions",
        get: jest.fn((header) => (header === "host" ? "localhost:3002" : undefined)),
        ...overrides,
    };
}

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const next = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

// ============================================================
// getAllQuestions
// ============================================================
describe("getAllQuestions", () => {
    it("returns paginated results with defaults", async () => {
        const req = mockReq();
        const res = mockRes();

        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: "2" }] })          // COUNT
            .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })    // SELECT
            .mockResolvedValueOnce({ rows: [] });                        // test_cases fetch

        await getAllQuestions(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                pagination: expect.objectContaining({ page: 1, limit: 20, total: 2, totalPages: 1 }),
            })
        );
    });

    it("respects page & limit query params", async () => {
        const req = mockReq({ query: { page: "2", limit: "5" } });
        const res = mockRes();

        mockQuery
            .mockResolvedValueOnce({ rows: [{ count: "12" }] })
            .mockResolvedValueOnce({ rows: [] }); // no questions = no test_cases fetch

        await getAllQuestions(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                pagination: expect.objectContaining({
                    page: 2,
                    limit: 5,
                    total: 12,
                    totalPages: 3,
                    links: expect.objectContaining({
                        next: "http://localhost:3002/api/v1/questions?page=3&limit=5",
                    }),
                }),
            })
        );
    });

    it("calls next on error", async () => {
        const req = mockReq();
        const res = mockRes();
        const err = new Error("db boom");
        mockQuery.mockRejectedValueOnce(err);

        await getAllQuestions(req, res, next);

        expect(next).toHaveBeenCalledWith(err);
    });
});

// ============================================================
// getQuestionById
// ============================================================
describe("getQuestionById", () => {
    it("returns 404 when not found", async () => {
        const req = mockReq({ params: { id: "999" }, query: {} });
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getQuestionById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it("returns the question when found", async () => {
        const question = { id: 1, title: "Two Sum" };
        const req = mockReq({ params: { id: "1" }, query: {} });
        const res = mockRes();
        mockQuery
            .mockResolvedValueOnce({ rows: [question] })  // question fetch
            .mockResolvedValueOnce({ rows: [] });          // test_cases fetch

        await getQuestionById(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ success: true, data: { ...question, test_cases: [] } });
    });
});

// ============================================================
// getRandomQuestion
// ============================================================
describe("getRandomQuestion", () => {
    it("returns 404 when no questions match", async () => {
        const req = mockReq({ query: { complexity: "Hard" } });
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await getRandomQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns a random question", async () => {
        const q = { id: 5, title: "Merge Intervals" };
        const req = mockReq();
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [q] });

        await getRandomQuestion(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ success: true, data: q });
    });
});

// ============================================================
// createQuestion
// ============================================================
describe("createQuestion", () => {
    const validBody = {
        title: "Two Sum",
        description: "Given an array...",
        categories: ["Array", "Hash Table"],
        complexity: "Easy",
    };

    it("returns 400 when required fields are missing", async () => {
        const req = mockReq({ body: { title: "Only title" } });
        const res = mockRes();

        await createQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid complexity", async () => {
        const req = mockReq({ body: { ...validBody, complexity: "Insane" } });
        const res = mockRes();

        await createQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 when duplicate title exists", async () => {
        const req = mockReq({ body: validBody });
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] }); // dup check

        await createQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it("creates and returns the question", async () => {
        const created = { id: 1, ...validBody };
        const req = mockReq({ body: validBody });
        const res = mockRes();

        mockQuery
            .mockResolvedValueOnce({ rows: [] })         // dup check — no dups
            .mockResolvedValueOnce({ rows: [created] });  // INSERT

        await createQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: { ...created, test_cases: [] } });
    });
});

// ============================================================
// updateQuestion
// ============================================================
describe("updateQuestion", () => {
    it("returns 400 when no fields supplied", async () => {
        const req = mockReq({ params: { id: "1" }, body: {} });
        const res = mockRes();

        await updateQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when question does not exist", async () => {
        const req = mockReq({ params: { id: "999" }, body: { title: "New" } });
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [] }); // existence check

        await updateQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 on duplicate title (excluding self)", async () => {
        const req = mockReq({ params: { id: "1" }, body: { title: "Existing Title" } });
        const res = mockRes();

        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })   // existence ✔
            .mockResolvedValueOnce({ rows: [{ id: 2 }] });   // dup check ✘

        await updateQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it("updates and returns the question", async () => {
        const updated = { id: 1, title: "Updated", complexity: "Hard" };
        const req = mockReq({ params: { id: "1" }, body: { complexity: "Hard" } });
        const res = mockRes();

        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })     // existence
            .mockResolvedValueOnce({ rows: [updated] })        // UPDATE
            .mockResolvedValueOnce({ rows: [] });              // fetch existing test_cases

        await updateQuestion(req, res, next);

        expect(res.json).toHaveBeenCalledWith({ success: true, data: { ...updated, test_cases: [] } });
    });
});

// ============================================================
// deleteQuestion
// ============================================================
describe("deleteQuestion", () => {
    it("returns 404 when the question does not exist", async () => {
        const req = mockReq({ params: { id: "999" } });
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await deleteQuestion(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deletes and returns success", async () => {
        const req = mockReq({ params: { id: "1" } });
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        await deleteQuestion(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, message: "Question deleted successfully" })
        );
    });
});

// ============================================================
// listCategories
// ============================================================
describe("listCategories", () => {
    it("returns distinct categories", async () => {
        const req = mockReq();
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({
            rows: [{ category: "Array" }, { category: "DP" }, { category: "Graph" }],
        });

        await listCategories(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: ["Array", "DP", "Graph"],
        });
    });
});

// ============================================================
// listCompanies
// ============================================================
describe("listCompanies", () => {
    it("returns distinct companies", async () => {
        const req = mockReq();
        const res = mockRes();
        mockQuery.mockResolvedValueOnce({
            rows: [{ company: "Amazon" }, { company: "Google" }, { company: "Meta" }],
        });

        await listCompanies(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: ["Amazon", "Google", "Meta"],
        });
    });
});
