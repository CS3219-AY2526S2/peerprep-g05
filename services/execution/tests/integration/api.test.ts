import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAccessToken = vi.fn();
const runPythonCodeAgainstTestCases = vi.fn();
const convertPseudocodeToPython = vi.fn();

vi.mock("@/services/jwksService.js", () => ({
  verifyAccessToken,
  isJwksReady: vi.fn(async () => true),
}));

vi.mock("@/services/pythonRunnerService.js", () => ({
  runPythonCodeAgainstTestCases,
  isPythonRuntimeReady: vi.fn(async () => true),
  normalizeOutput: vi.fn((value: string) => value),
  parseSyntaxError: vi.fn(),
  parseRuntimeError: vi.fn(),
}));

vi.mock("@/services/aiClientService.js", () => ({
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

  it("converts pseudocode then executes python", async () => {
    const { requireAuth } = await import("@/middleware/requireAuth.js");
    const { postConvertToPythonAndExecute } = await import(
      "@/controllers/executionController.js"
    );

    verifyAccessToken.mockResolvedValue({
      id: "user-1",
      token: "valid-token",
    });

    convertPseudocodeToPython.mockResolvedValue("print(input())");
    runPythonCodeAgainstTestCases.mockResolvedValue({
      passedTestCases: [],
      failedTestCases: [],
      errorType: null,
      errorsPresent: [],
    });

    const req: MockRequest = {
      headers: {
        authorization: "Bearer valid-token",
      },
      body: {
        code: "OUTPUT input",
        test_cases: [{ input: "a", expected_output: "a" }],
      },
    };
    const res = createMockResponse();

    await runHandlers([requireAuth, postConvertToPythonAndExecute], req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      pythonCode: "print(input())",
      passedTestCases: [],
      failedTestCases: [],
      errorType: null,
      errorsPresent: [],
    });
    expect(convertPseudocodeToPython).toHaveBeenCalledWith({
      code: "OUTPUT input",
      token: "valid-token",
    });
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
