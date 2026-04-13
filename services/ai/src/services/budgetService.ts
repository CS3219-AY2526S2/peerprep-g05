import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";
import { getRedisClient } from "@/services/redisClient.js";

export type AiBudgetFeature = "chat" | "pseudocode-to-python";

export type BudgetUsage = {
  feature: AiBudgetFeature;
  usedFeature: number;
  remainingFeature: number;
  featureLimit: number;
  usedTotal: number;
  remainingTotal: number;
  totalLimit: number;
  resetsAt: string;
};

const getFeatureLimit = (feature: AiBudgetFeature) =>
  feature === "chat"
    ? config.AI_DAILY_CHAT_BUDGET
    : config.AI_DAILY_PSEUDOCODE_BUDGET;

const getDayWindow = (now: Date) => {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);

  return {
    dayKey: start.toISOString().slice(0, 10),
    expiresInSeconds: Math.max(
      1,
      Math.ceil((next.getTime() - now.getTime()) / 1000),
    ),
    resetsAt: next.toISOString(),
  };
};

const getTotalBudgetKey = (userId: string, dayKey: string) =>
  `ai:budget:${dayKey}:${userId}:total`;

const getFeatureBudgetKey = (
  userId: string,
  dayKey: string,
  feature: AiBudgetFeature,
) => `ai:budget:${dayKey}:${userId}:${feature}`;

export const consumeDailyBudget = async (input: {
  userId: string;
  feature: AiBudgetFeature;
}): Promise<BudgetUsage> => {
  const now = new Date();
  const { dayKey, expiresInSeconds, resetsAt } = getDayWindow(now);
  const featureLimit = getFeatureLimit(input.feature);
  const totalLimit = config.AI_DAILY_TOTAL_BUDGET;

  const client = await getRedisClient();
  const totalKey = getTotalBudgetKey(input.userId, dayKey);
  const featureKey = getFeatureBudgetKey(input.userId, dayKey, input.feature);

  const [usedTotal, usedFeature] = await Promise.all([
    client.incr(totalKey),
    client.incr(featureKey),
  ]);

  if (usedTotal === 1) {
    await client.expire(totalKey, expiresInSeconds);
  }
  if (usedFeature === 1) {
    await client.expire(featureKey, expiresInSeconds);
  }

  const remainingTotal = Math.max(totalLimit - usedTotal, 0);
  const remainingFeature = Math.max(featureLimit - usedFeature, 0);

  if (usedTotal > totalLimit) {
    throw new HttpError(
      429,
      `Daily AI budget exceeded for this account. Budget resets at ${resetsAt}.`,
    );
  }

  if (usedFeature > featureLimit) {
    throw new HttpError(
      429,
      `Daily ${input.feature} budget exceeded for this account. Budget resets at ${resetsAt}.`,
    );
  }

  return {
    feature: input.feature,
    usedFeature,
    remainingFeature,
    featureLimit,
    usedTotal,
    remainingTotal,
    totalLimit,
    resetsAt,
  };
};
