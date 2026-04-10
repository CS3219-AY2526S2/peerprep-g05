import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAccessToken = vi.fn();
const runPythonCodeAgainstTestCases = vi.fn();

vi.mock("@/services/jwksService.js", () => ({
  verifyAccessToken,
  isJwksReady: vi.fn(async () => true),
}));

vi.mock("@/services/pythonRunnerService.js", () => ({
  runPythonCodeAgainstTestCases,
  isPythonRuntimeReady: vi.fn(async () => true),
  normalizeOutput: vi.fn((value: string) => value),
  outputsMatch: vi.fn(() => true),
  parseSyntaxError: vi.fn(),
  parseRuntimeError: vi.fn(),
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

describe("Execution API stack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postExecutePythonCode } = await import(
      "@/controllers/executionController.js"
    );

    const req: MockRequest = {
      headers: {},
      body: {
        code: "print(input())",
        test_cases: [{ input: "a", expected_output: "a" }],
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postExecutePythonCode], req, res);

    expect(res.statusCode).toBe(401);
    expect(runPythonCodeAgainstTestCases).not.toHaveBeenCalled();
  });

  it("runs execute-python-code for authenticated users", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postExecutePythonCode } = await import(
      "@/controllers/executionController.js"
    );

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });

    runPythonCodeAgainstTestCases.mockResolvedValue({
      passedTestCases: [
        {
          index: 0,
          input: "a",
          expectedOutput: "a",
          actualOutput: "a",
        },
      ],
      failedTestCases: [],
      errorType: null,
      errorsPresent: [],
    });

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        code: "print(input())",
        test_cases: [{ input: "a", expected_output: "a" }],
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postExecutePythonCode], req, res);

    expect(res.statusCode).toBe(200);
    expect(runPythonCodeAgainstTestCases).toHaveBeenCalledWith({
      code: "print(input())",
      testCases: [
        {
          input: "a",
          expectedOutput: "a",
          isPublic: true,
        },
      ],
    });
  });

  it("returns 400 on invalid payload", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postExecutePythonCode } = await import(
      "@/controllers/executionController.js"
    );

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        code: "",
        test_cases: [],
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postExecutePythonCode], req, res);

    expect(res.statusCode).toBe(400);
    expect(runPythonCodeAgainstTestCases).not.toHaveBeenCalled();
  });
});
