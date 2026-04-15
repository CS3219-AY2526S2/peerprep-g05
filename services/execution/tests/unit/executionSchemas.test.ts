import { describe, expect, it } from "vitest";
import { executionRequestSchema } from "@/schemas/executionSchemas.js";

describe("executionRequestSchema", () => {
  it("accepts expected_output from test_cases directly", () => {
    const parsed = executionRequestSchema.parse({
      code: "print(input())",
      test_cases: [
        {
          input: "hello",
          expected_output: "hello",
          is_public: true,
        },
      ],
    });

    expect(parsed.testCases).toEqual([
      {
        input: "hello",
        expectedOutput: "hello",
        isPublic: true,
      },
    ]);
  });

  it("fills missing expected_output from expected_test_case_answers", () => {
    const parsed = executionRequestSchema.parse({
      code: "print(input())",
      test_cases: [
        {
          input: "a",
        },
        {
          input: "b",
        },
      ],
      expected_test_case_answers: ["a", "b"],
    });

    expect(parsed.testCases).toEqual([
      {
        input: "a",
        expectedOutput: "a",
        isPublic: true,
      },
      {
        input: "b",
        expectedOutput: "b",
        isPublic: true,
      },
    ]);
  });

  it("rejects mismatched expected_test_case_answers length", () => {
    const result = executionRequestSchema.safeParse({
      code: "print(input())",
      test_cases: [{ input: "a" }],
      expected_test_case_answers: ["a", "b"],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(
      result.error.issues.some(
        (issue) => issue.path.join(".") === "expected_test_case_answers",
      ),
    ).toBe(true);
  });

  it("rejects when no expected output exists in either source", () => {
    const result = executionRequestSchema.safeParse({
      code: "print(input())",
      test_cases: [{ input: "a" }],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(
      result.error.issues.some(
        (issue) => issue.path.join(".") === "test_cases.0.expected_output",
      ),
    ).toBe(true);
  });
});
