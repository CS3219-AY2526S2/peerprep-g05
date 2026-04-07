import z from "zod";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

export const chatRequestSchema = z.object({
  prompt: nonEmptyString("prompt"),
  codeSnippet: nonEmptyString("codeSnippet"),
  question: nonEmptyString("question"),
  sessionId: z.string().trim().min(1).optional(),
});

export const pseudocodeToPythonRequestSchema = z.object({
  pseudocode: nonEmptyString("pseudocode"),
  sessionId: z.string().trim().min(1).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type PseudocodeToPythonRequest = z.infer<
  typeof pseudocodeToPythonRequestSchema
>;
