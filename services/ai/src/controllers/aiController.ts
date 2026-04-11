import type { RequestHandler, Response } from "express";
import { isHttpError } from "@/lib/httpError.js";
import {
  chatRequestSchema,
  pseudocodeToPythonRequestSchema,
} from "@/schemas/aiSchemas.js";
import {
  convertPseudocodeToPython,
  generateChatResponse,
} from "@/services/aiService.js";
import { consumeDailyBudget } from "@/services/budgetService.js";

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

  console.error("[ai-service] Unhandled controller error", error);
  res.status(500).json({ error: "Internal server error." });
};

export const postChatResponse: RequestHandler = async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatValidationErrors(parsed.error.issues) });
    return;
  }

  try {
    const budget = await consumeDailyBudget({
      userId: req.user!.id,
      feature: "chat",
    });

    const response = await generateChatResponse({
      sessionId: parsed.data.sessionId,
      prompt: parsed.data.prompt,
      codeSnippet: parsed.data.codeSnippet,
      question: parsed.data.question,
      userId: req.user!.id,
    });

    res.json({
      ...response,
      budget,
    });
  } catch (error) {
    respondToUnhandledError(error, res);
  }
};

export const postPseudocodeToPython: RequestHandler = async (req, res) => {
  const parsed = pseudocodeToPythonRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: formatValidationErrors(parsed.error.issues) });
    return;
  }

  try {
    const budget = await consumeDailyBudget({
      userId: req.user!.id,
      feature: "pseudocode-to-python",
    });

    const response = await convertPseudocodeToPython({
      sessionId: parsed.data.sessionId,
      pseudocode: parsed.data.pseudocode,
      userId: req.user!.id,
    });

    res.json({
      ...response,
      budget,
    });
  } catch (error) {
    respondToUnhandledError(error, res);
  }
};
