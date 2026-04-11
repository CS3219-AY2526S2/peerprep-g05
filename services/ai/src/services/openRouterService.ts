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
};

const openRouter = new OpenRouter({
  apiKey: config.OPENROUTER_API_KEY,
});

const normalizeProviderError = (error: unknown): RetryableModelError => {
  const fallbackMessage = "OpenRouter request failed.";
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallbackMessage;

  const rawStatus =
    typeof error === "object" && error !== null
      ? Number(
          Reflect.get(error, "status") ??
            Reflect.get(error, "statusCode"),
        )
      : Number.NaN;

  const hasTimeoutKeyword = /timeout|timed out|aborted/i.test(message);
  const isAbortError =
    typeof error === "object" &&
    error !== null &&
    Reflect.get(error, "name") === "AbortError";

  const isHttpStatus =
    Number.isFinite(rawStatus) && rawStatus >= 100 && rawStatus <= 599;

  const normalizedStatus = isHttpStatus
    ? rawStatus
    : hasTimeoutKeyword || isAbortError
      ? 408
      : 502;

  // Retry all model candidates unless the failure indicates a service-wide
  // auth/configuration issue with the API key itself.
  //
  // Note: OpenRouter/model providers may return 403 for model-level limits,
  // provider restrictions, or temporary access gates. Those should still
  // trigger fallback to the next configured model.
  const hasAuthKeyword =
    /invalid api key|unauthorized|invalid signature|bad api key|authentication failed/i.test(
      message,
    );

  const retryable = !(normalizedStatus === 401 || hasAuthKeyword);

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
            dataCollection: "allow",
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
