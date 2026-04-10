import z from "zod";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

export const chatRequestSchema = z.object({
  sessionId: nonEmptyString("sessionId"),
  prompt: nonEmptyString("prompt"),
  codeSnippet: nonEmptyString("codeSnippet"),
  question: nonEmptyString("question"),
});

export const pseudocodeToPythonRequestSchema = z.object({
  sessionId: nonEmptyString("sessionId"),
  pseudocode: nonEmptyString("pseudocode"),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type PseudocodeToPythonRequest = z.infer<
  typeof pseudocodeToPythonRequestSchema
>;
