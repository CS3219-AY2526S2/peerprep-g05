import { OpenRouter, fromChatMessages } from "@openrouter/sdk";
import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";
import {
  runWithModelFallback,
  type RetryableModelError,
} from "@/services/modelFallback.js";
import type { ChatMessage } from "@/services/promptBuilders.js";

type GenerateTextInput = {
  messages: ChatMessage[];
  userId: string;
  sessionId?: string;
  feature: "chat" | "pseudocode-to-python";
  temperature: number;
  maxOutputTokens: number;
};

export type GenerateTextOutput = {
  text: string;
  model: string;
  fallbackUsed: boolean;

const openRouter = new OpenRouter({
  apiKey: config.OPENROUTER_API_KEY,
});

const normalizeProviderError = (error: unknown): RetryableModelError => {
  const fallbackMessage = "OpenRouter request failed.";
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallbackMessage;

  const status =
    typeof error === "object" && error !== null
      ? Number(
          Reflect.get(error, "status") ??
            Reflect.get(error, "statusCode") ??
            Reflect.get(error, "code") ??
            502,
        )
      : 502;

  const normalizedStatus = Number.isFinite(status) ? status : 502;

  // Retry all model candidates unless the failure indicates a service-wide
  // auth/configuration problem. This matches the intended "try the next model"
  // behavior for unavailable, unsupported, rate-limited, or account-scoped
  // model failures.
  const retryable =
    normalizedStatus !== 401 &&
    normalizedStatus !== 403 &&
    !/invalid api key|unauthorized|forbidden/i.test(message);

  console.error("[ai-service] OpenRouter model attempt failed", {
    status: normalizedStatus,
    retryable,
    message,
  });

  return {
    message,
    status: normalizedStatus,
    retryable,
  };
};

export const generateText = async (
  input: GenerateTextInput,
): Promise<GenerateTextOutput> => {
  const result = await runWithModelFallback(
    config.OPENROUTER_MODELS,
    async (model) => {
      const response = openRouter.callModel(
        {
          model,
          input: fromChatMessages(input.messages),
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
          provider: {
            allowFallbacks: false,
            dataCollection: "deny",
          },
          metadata: {
            feature: input.feature,
            userId: input.userId,
            ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          },
          user: input.userId,
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        },
        {
          timeoutMs: config.REQUEST_TIMEOUT_MS,
        },
      );

      const text = (await response.getText()).trim();
      if (text.length === 0) {
        throw new HttpError(502, "OpenRouter returned an empty response.");
      }

      return text;
    },
    normalizeProviderError,
  );

  return {
    text: result.value,
    model: result.model,
    fallbackUsed: result.fallbackUsed,
  };
};
