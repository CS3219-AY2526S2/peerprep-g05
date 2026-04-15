import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isDeepStrictEqual } from "node:util";
import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";

export type ExecutionTestCase = {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
};

export type PassedTestCase = {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
};

export type FailedTestCase = {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  reason: string;
};

export type ExecutionIssue = {
  type: string;
  message: string;
  line?: number;
  column?: number;
  testCaseIndex?: number;
};

export type ExecutionResult = {
  passedTestCases: PassedTestCase[];
  failedTestCases: FailedTestCase[];
  errorType: "syntax" | "logic" | null;
  errorsPresent: ExecutionIssue[];
};

type PythonProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  spawnError: Error | null;
};

const PYTHON_BINARY = "python3";

const runPythonProcess = async (input: {
  args: string[];
  stdin?: string;
  timeoutMs: number;
}): Promise<PythonProcessResult> => {
  const child = spawn(PYTHON_BINARY, input.args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let spawnError: Error | null = null;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });

  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  child.on("error", (error: Error) => {
    spawnError = error;
  });

  if (input.stdin !== undefined) {
    child.stdin.write(input.stdin);
  }
  child.stdin.end();

  return await new Promise<PythonProcessResult>((resolve) => {
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, input.timeoutMs);

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        timedOut,
        spawnError,
      });
    });
  });
};

export const normalizeOutput = (value: string) =>
  value.replaceAll("\r\n", "\n").trim();

const tryParseJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const outputsMatch = (expected: string, actual: string) => {
  const normalizedExpected = normalizeOutput(expected);
  const normalizedActual = normalizeOutput(actual);

  const parsedExpected = tryParseJson(normalizedExpected);
  const parsedActual = tryParseJson(normalizedActual);

  if (parsedExpected !== null && parsedActual !== null) {
    return isDeepStrictEqual(parsedExpected, parsedActual);
  }

  return normalizedExpected === normalizedActual;
};

const getNonEmptyLines = (value: string) =>
  value
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

export const parseSyntaxError = (stderr: string): ExecutionIssue => {
  const lines = getNonEmptyLines(stderr);
  const lastLine = lines.at(-1) ?? "SyntaxError: Invalid syntax.";

  const typeMatch = lastLine.match(/^([A-Za-z]+Error|SyntaxError):/);
  const type = typeMatch?.[1] ?? "SyntaxError";
  const message = lastLine.includes(":")
    ? lastLine.slice(lastLine.indexOf(":") + 1).trim()
    : lastLine;

  const lineMatch = stderr.match(/line\s+(\d+)/);
  const line = lineMatch ? Number.parseInt(lineMatch[1]!, 10) : undefined;

  const stderrLines = stderr.replaceAll("\r\n", "\n").split("\n");
  let column: number | undefined;
  for (let index = 0; index < stderrLines.length; index += 1) {
    const currentLine = stderrLines[index];
    if (!currentLine?.includes("line")) {
      continue;
    }

    const caretLine = stderrLines[index + 2];
    if (caretLine && caretLine.includes("^")) {
      column = caretLine.indexOf("^") + 1;
      break;
    }
  }

  return {
    type,
    message,
    ...(line ? { line } : {}),
    ...(column ? { column } : {}),
  };
};

export const parseRuntimeError = (
  stderr: string,
): ExecutionIssue => {
  const lines = getNonEmptyLines(stderr);
  const lastLine = lines.at(-1) ?? "RuntimeError: Python execution failed.";
  const match = lastLine.match(/^([^:]+):\s*(.+)$/);
  const lineMatches = Array.from(
    stderr.matchAll(/File\s+"[^"]*submission\.py",\s+line\s+(\d+)/g),
  );
  const lastLineMatch = lineMatches.at(-1);
  const line = lastLineMatch
    ? Number.parseInt(lastLineMatch[1]!, 10)
    : undefined;

  if (!match) {
    return {
      type: "RuntimeError",
      message: lastLine,
      ...(line ? { line } : {}),
    };
  }

  return {
    type: match[1]!.trim(),
    message: match[2]!.trim(),
    ...(line ? { line } : {}),
  };
};

const createUnavailablePythonError = () =>
  new HttpError(503, "Python runtime is unavailable in this environment.");

export const runPythonCodeAgainstTestCases = async (input: {
  code: string;
  testCases: ExecutionTestCase[];
}): Promise<ExecutionResult> => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "peerprep-execution-"));
  const sourceFile = join(tempDirectory, "submission.py");

  try {
    await writeFile(sourceFile, input.code, "utf8");

    const syntaxCheckResult = await runPythonProcess({
      args: ["-m", "py_compile", sourceFile],
      timeoutMs: config.PYTHON_EXEC_TIMEOUT_MS,
    });

    if (syntaxCheckResult.spawnError) {
      throw createUnavailablePythonError();
    }

    if (syntaxCheckResult.timedOut) {
      return {
        passedTestCases: [],
        failedTestCases: [],
        errorType: "syntax",
        errorsPresent: [
          {
            type: "TimeoutError",
            message: `Syntax validation timed out after ${config.PYTHON_EXEC_TIMEOUT_MS}ms.`,
          },
        ],
      };
    }

    if (syntaxCheckResult.exitCode !== 0) {
      const syntaxError = parseSyntaxError(syntaxCheckResult.stderr);
      return {
        passedTestCases: [],
        failedTestCases: [],
        errorType: "syntax",
        errorsPresent: [syntaxError],
      };
    }

    const passedTestCases: PassedTestCase[] = [];
    const failedTestCases: FailedTestCase[] = [];
    const errorsPresent: ExecutionIssue[] = [];

    for (const [index, testCase] of input.testCases.entries()) {
      const runResult = await runPythonProcess({
        args: ["-I", "-u", sourceFile],
        stdin: testCase.input,
        timeoutMs: config.PYTHON_EXEC_TIMEOUT_MS,
      });

      if (runResult.spawnError) {
        throw createUnavailablePythonError();
      }

      const expectedOutput = normalizeOutput(testCase.expectedOutput);
      const actualOutput = normalizeOutput(runResult.stdout);

      if (runResult.timedOut) {
        const timeoutMessage =
          `Execution timed out after ${config.PYTHON_EXEC_TIMEOUT_MS}ms.`;

        failedTestCases.push({
          index,
          input: testCase.input,
          expectedOutput,
          actualOutput,
          reason: timeoutMessage,
        });
        errorsPresent.push({
          type: "TimeoutError",
          message: timeoutMessage,
          testCaseIndex: index,
        });
        continue;
      }

      if (runResult.exitCode !== 0) {
        const runtimeError = parseRuntimeError(runResult.stderr);
        failedTestCases.push({
          index,
          input: testCase.input,
          expectedOutput,
          actualOutput,
          reason: runtimeError.message,
        });
        errorsPresent.push({
          type: runtimeError.type,
          message: runtimeError.message,
          ...(runtimeError.line ? { line: runtimeError.line } : {}),
          ...(runtimeError.column ? { column: runtimeError.column } : {}),
          testCaseIndex: index,
        });
        continue;
      }

      if (!outputsMatch(expectedOutput, actualOutput)) {
        failedTestCases.push({
          index,
          input: testCase.input,
          expectedOutput,
          actualOutput,
          reason: "Output mismatch.",
        });
        errorsPresent.push({
          type: "OutputMismatch",
          message: "Output mismatch.",
          testCaseIndex: index,
        });
        continue;
      }

      passedTestCases.push({
        index,
        input: testCase.input,
        expectedOutput,
        actualOutput,
      });
    }

    return {
      passedTestCases,
      failedTestCases,
      errorType: failedTestCases.length > 0 ? "logic" : null,
      errorsPresent,
    };
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
};

export const isPythonRuntimeReady = async () => {
  const result = await runPythonProcess({
    args: ["--version"],
    timeoutMs: 2_000,
  }).catch(() => null);

  if (!result) {
    return false;
  }

  return !result.spawnError && !result.timedOut && result.exitCode === 0;
};
