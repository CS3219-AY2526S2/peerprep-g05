import { beforeEach, describe, expect, it, vi } from "vitest";

const incr = vi.fn();
const expire = vi.fn();

vi.mock("@/services/redisClient.js", () => ({
  getRedisClient: vi.fn(async () => ({
    incr,
    expire,
  })),
}));

describe("consumeDailyBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consumes chat budget and returns remaining quota", async () => {
    incr.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    expire.mockResolvedValue(true);

    const { consumeDailyBudget } = await import("@/services/budgetService.js");

    const result = await consumeDailyBudget({
      userId: "user-1",
      feature: "chat",
    });

    expect(result.feature).toBe("chat");
    expect(result.usedTotal).toBe(1);
    expect(result.usedFeature).toBe(1);
    expect(result.remainingTotal).toBeGreaterThanOrEqual(0);
    expect(result.remainingFeature).toBeGreaterThanOrEqual(0);
    expect(expire).toHaveBeenCalledTimes(2);
  });

  it("rejects once the total daily budget is exceeded", async () => {
    incr.mockResolvedValueOnce(101).mockResolvedValueOnce(1);
    expire.mockResolvedValue(true);

    const { consumeDailyBudget } = await import("@/services/budgetService.js");

    await expect(
      consumeDailyBudget({
        userId: "user-1",
        feature: "chat",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 429,
      }),
    );
  });
});
