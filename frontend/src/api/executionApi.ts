import { GATEWAY_URL } from "../utils/types";

const EXECUTION_BASE = `${GATEWAY_URL}/api/v1/execution`;

export interface PythonExecutionTestCase {
  input: string;
  expected_output: string;
  is_public?: boolean;
}

export interface PassedTestCase {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
}

export interface FailedTestCase {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  reason: string;
}

export interface ExecutionIssue {
  type: string;
  message: string;
  line?: number;
  column?: number;
  testCaseIndex?: number;
}

export interface PythonExecutionResult {
  passedTestCases: PassedTestCase[];
  failedTestCases: FailedTestCase[];
  errorType: "syntax" | "logic" | null;
  errorsPresent: ExecutionIssue[];
}

export interface ExecutionApiError {
  status: number;
  data: { error?: string; errors?: { field: string; message: string }[] } | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${EXECUTION_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, data } as ExecutionApiError;
  }
  return data as T;
}

export function executePythonCode(input: {
  code: string;
  test_cases: PythonExecutionTestCase[];
}) {
  return request<PythonExecutionResult>("/execute-python-code", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
