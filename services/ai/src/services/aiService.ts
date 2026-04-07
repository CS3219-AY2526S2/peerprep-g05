import { generateText } from "@/services/openRouterService.js";
import {
  buildInterviewCoachMessages,
  buildPseudocodeToPythonMessages,
} from "@/services/promptBuilders.js";

export const generateChatResponse = async (input: {
  prompt: string;
  codeSnippet: string;
  question: string;
  sessionId?: string;
  userId: string;
}) => {
  const response = await generateText({
    messages: buildInterviewCoachMessages({
      prompt: input.prompt,
      codeSnippet: input.codeSnippet,
      question: input.question,
    }),
    userId: input.userId,
    feature: "chat",
    temperature: 0.35,
    maxOutputTokens: 700,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  });

  return {
    reply: response.text,
    model: response.model,
    fallbackUsed: response.fallbackUsed,
  };
};

export const convertPseudocodeToPython = async (input: {
  pseudocode: string;
  sessionId?: string;
  userId: string;
}) => {
  const response = await generateText({
    messages: buildPseudocodeToPythonMessages({
      pseudocode: input.pseudocode,
    }),
    userId: input.userId,
    feature: "pseudocode-to-python",
    temperature: 0,
    maxOutputTokens: 900,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  });

  return {
    pythonCode: response.text,
    model: response.model,
    fallbackUsed: response.fallbackUsed,
  };
};
