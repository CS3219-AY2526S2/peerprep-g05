import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/httpError.js";

const verifyAccessToken = vi.fn();
const isJwksReady = vi.fn(async () => true);
const pingRedis = vi.fn(async () => true);
const generateChatResponse = vi.fn();
const convertPseudocodeToPython = vi.fn();
const consumeDailyBudget = vi.fn();

vi.mock("@/services/jwksService.js", () => ({
  verifyAccessToken,
  isJwksReady,
}));

vi.mock("@/services/redisClient.js", () => ({
  pingRedis,
}));

vi.mock("@/services/budgetService.js", () => ({
  consumeDailyBudget,
}));

vi.mock("@/services/aiService.js", () => ({
  generateChatResponse,
  convertPseudocodeToPython,
}));

type MockRequest = {
  headers: Record<string, string>;
  body: Record<string, unknown>;
  user?: Express.User;
};

type MockResponse = {
  statusCode: number;
  body: unknown;
  locals: Record<string, unknown>;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

const createMockResponse = (): MockResponse => ({
  statusCode: 200,
  body: null,
  locals: {},
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(payload: unknown) {
    this.body = payload;
    return this;
  },
});

const runHandlers = async (
  handlers: RequestHandler[],
  req: MockRequest,
  res: MockResponse,
) => {
  const next = async (index: number): Promise<void> => {
    const handler = handlers[index];
    if (!handler) {
      return;
    }

    let nextCalled = false;
    await handler(
      req as never,
      res as never,
      () => {
        nextCalled = true;
      },
    );

    if (nextCalled) {
      await next(index + 1);
    }
  };

  await next(0);
};

describe("AI API stack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeDailyBudget.mockResolvedValue({
      feature: "chat",
      usedFeature: 1,
      remainingFeature: 49,
      featureLimit: 50,
      usedTotal: 1,
      remainingTotal: 99,
      totalLimit: 100,
      resetsAt: "2026-04-07T00:00:00.000Z",
    });
  });

  it("returns chat output for an authenticated user with budget remaining", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postChatResponse } = await import("@/controllers/aiController.js");

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });
    generateChatResponse.mockResolvedValue({
      reply: "Try checking what happens when the window shrinks.",
      model: "model-a",
      fallbackUsed: false,
    });

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        prompt: "What should I inspect next?",
        codeSnippet: "def solve(): pass",
        question: "Find the maximum sum subarray.",
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postChatResponse], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      reply: "Try checking what happens when the window shrinks.",
      model: "model-a",
      fallbackUsed: false,
      budget: {
        feature: "chat",
        usedFeature: 1,
        remainingFeature: 49,
        featureLimit: 50,
        usedTotal: 1,
        remainingTotal: 99,
        totalLimit: 100,
        resetsAt: "2026-04-07T00:00:00.000Z",
      },
    });
  });

  it("blocks requests when the user's daily AI budget is exhausted", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postPseudocodeToPython } = await import(
      "@/controllers/aiController.js"
    );

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });
    consumeDailyBudget.mockRejectedValueOnce(
      new HttpError(
        429,
        "Daily pseudocode-to-python budget exceeded for this account.",
      ),
    );

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        pseudocode: "print hello world",
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postPseudocodeToPython], req, res);

    expect(res.statusCode).toBe(429);
    expect(convertPseudocodeToPython).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid payloads", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postChatResponse } = await import("@/controllers/aiController.js");

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        prompt: "",
        codeSnippet: "",
        question: "",
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postChatResponse], req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        errors: expect.any(Array),
      }),
    );
    expect(generateChatResponse).not.toHaveBeenCalled();
  });

  it("supports optional sessionId as soft request context", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postChatResponse } = await import("@/controllers/aiController.js");

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });
    generateChatResponse.mockResolvedValue({
      reply: "Check the invariant before the loop starts.",
      model: "model-b",
      fallbackUsed: true,
    });

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        sessionId: "soft-session-id",
        prompt: "Can you hint at my base case?",
        codeSnippet: "def solve(nums):\n    return 0",
        question: "Compute the best subarray.",
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postChatResponse], req, res);

    expect(res.statusCode).toBe(200);
    expect(generateChatResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "soft-session-id",
      }),
    );
  });
});
