import { HttpError } from "@/lib/httpError.js";

export type RetryableModelError = {
  message: string;
  status: number;
  retryable: boolean;
};

export type ModelAttempt = {
  model: string;
  message: string;
  status: number;
  retryable: boolean;
};

export type FallbackResult<T> = {
  value: T;
  model: string;
  fallbackUsed: boolean;
  attemptedModels: string[];
};

export const runWithModelFallback = async <T>(
  models: string[],
  runner: (model: string) => Promise<T>,
  normalizeError: (error: unknown) => RetryableModelError,
): Promise<FallbackResult<T>> => {
  const attempts: ModelAttempt[] = [];

  for (const [index, model] of models.entries()) {
    try {
      const value = await runner(model);
      return {
        value,
        model,
        fallbackUsed: index > 0,
        attemptedModels: models.slice(0, index + 1),
      };
    } catch (error) {
      const normalized = normalizeError(error);
      attempts.push({
        model,
        message: normalized.message,
        status: normalized.status,
        retryable: normalized.retryable,
      });

      if (!normalized.retryable) {
        throw new HttpError(
          normalized.status,
          "The AI provider rejected the request and the service did not retry another model.",
        );
      }
    }
  }

  throw new HttpError(
    503,
    `All configured AI models are temporarily unavailable. Attempted ${attempts.length} model(s).`,
  );
};
