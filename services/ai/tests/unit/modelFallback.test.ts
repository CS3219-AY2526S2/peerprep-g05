import { describe, expect, it, vi } from "vitest";
import { runWithModelFallback } from "@/services/modelFallback.js";

describe("runWithModelFallback", () => {
  it("returns the first successful model result", async () => {
    const runner = vi.fn(async (model: string) => `${model}-ok`);

    const result = await runWithModelFallback(
      ["model-a", "model-b"],
      runner,
      () => ({
        message: "retry",
        status: 503,
        retryable: true,
      }),
    );

    expect(result).toEqual({
      value: "model-a-ok",
      model: "model-a",
      fallbackUsed: false,
      attemptedModels: ["model-a"],
    });
  });

  it("falls back to the next model on retryable failure", async () => {
    const runner = vi
      .fn<[string], Promise<string>>()
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValueOnce("model-b-ok");

    const result = await runWithModelFallback(
      ["model-a", "model-b"],
      runner,
      (error) => ({
        message: error instanceof Error ? error.message : "unknown",
        status: 429,
        retryable: true,
      }),
    );

    expect(result).toEqual({
      value: "model-b-ok",
      model: "model-b",
      fallbackUsed: true,
      attemptedModels: ["model-a", "model-b"],
    });
  });

  it("stops immediately on non-retryable auth failure", async () => {
    await expect(
      runWithModelFallback(
        ["model-a", "model-b"],
        async () => {
          throw new Error("unauthorized");
        },
        () => ({
          message: "unauthorized",
          status: 401,
          retryable: false,
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 401,
      }),
    );
  });

  it("falls back when the first model is rejected but another model may still work", async () => {
    const runner = vi
      .fn<[string], Promise<string>>()
      .mockRejectedValueOnce(new Error("model not available for this account"))
      .mockResolvedValueOnce("model-b-ok");

    const result = await runWithModelFallback(
      ["model-a", "model-b"],
      runner,
      (error) => ({
        message: error instanceof Error ? error.message : "unknown",
        status: 402,
        retryable: true,
      }),
    );

    expect(result).toEqual({
      value: "model-b-ok",
      model: "model-b",
      fallbackUsed: true,
      attemptedModels: ["model-a", "model-b"],
    });
  });

  it("throws a 503 when all models fail", async () => {
    await expect(
      runWithModelFallback(
        ["model-a", "model-b"],
        async () => {
          throw new Error("timeout");
        },
        () => ({
          message: "timeout",
          status: 503,
          retryable: true,
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 503,
      }),
    );
  });
});
