import type { RequestHandler, Response } from "express";
import { isHttpError } from "@/lib/httpError.js";
import { executionRequestSchema } from "@/schemas/executionSchemas.js";
import { convertPseudocodeToPython } from "@/services/aiClientService.js";
import { runPythonCodeAgainstTestCases } from "@/services/pythonRunnerService.js";

const formatValidationErrors = (issues: {
  path: PropertyKey[];
  message: string;
}[]) =>
  issues.map(({ path, message }) => ({
    field: path.map(String).join("."),
    message,
  }));

const respondToUnhandledError = (error: unknown, res: Response) => {
  if (isHttpError(error)) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error("[execution-service] Unhandled controller error", error);
  res.status(500).json({ error: "Internal server error." });
};

export const postExecutePythonCode: RequestHandler = async (req, res) => {
  const parsed = executionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatValidationErrors(parsed.error.issues) });
    return;
  }

  try {
    const result = await runPythonCodeAgainstTestCases({
      code: parsed.data.code,
      testCases: parsed.data.testCases,
    });

    res.json(result);
  } catch (error) {
    respondToUnhandledError(error, res);
  }
};

export const postConvertToPythonAndExecute: RequestHandler = async (req, res) => {
  const parsed = executionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatValidationErrors(parsed.error.issues) });
    return;
  }

  try {
    const pythonCode = await convertPseudocodeToPython({
      code: parsed.data.code,
      token: req.user!.token,
    });

    const result = await runPythonCodeAgainstTestCases({
      code: pythonCode,
      testCases: parsed.data.testCases,
    });

    res.json({
      pythonCode,
      ...result,
    });
  } catch (error) {
    respondToUnhandledError(error, res);
  }
};
