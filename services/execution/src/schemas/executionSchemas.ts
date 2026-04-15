import z from "zod";
import { config } from "@/config.js";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

const rawTestCaseSchema = z.object({
  input: z.string(),
  expected_output: z.string().optional(),
  is_public: z.boolean().optional(),
});

const rawExecutionRequestSchema = z
  .object({
    code: nonEmptyString("code"),
    test_cases: z
      .array(rawTestCaseSchema)
      .min(1, "At least one test case is required.")
      .max(
        config.MAX_TEST_CASES,
        `A maximum of ${config.MAX_TEST_CASES} test cases is allowed.`,
      ),
    expected_test_case_answers: z.array(z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    const expectedAnswers = value.expected_test_case_answers;

    if (
      expectedAnswers !== undefined &&
      expectedAnswers.length !== value.test_cases.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expected_test_case_answers"],
        message:
          "expected_test_case_answers length must match test_cases length.",
      });
    }

    value.test_cases.forEach((testCase, index) => {
      const resolvedExpectedOutput =
        testCase.expected_output ?? expectedAnswers?.[index];
      if (resolvedExpectedOutput === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["test_cases", index, "expected_output"],
          message:
            "expected_output is required when expected_test_case_answers does not provide this index.",
        });
      }
    });
  });

export const executionRequestSchema = rawExecutionRequestSchema.transform(
  (value) => ({
    code: value.code,
    testCases: value.test_cases.map((testCase, index) => ({
      input: testCase.input,
      expectedOutput:
        testCase.expected_output ?? value.expected_test_case_answers?.[index] ?? "",
      isPublic: testCase.is_public ?? true,
    })),
  }),
);

export type ExecutionRequest = z.infer<typeof executionRequestSchema>;
