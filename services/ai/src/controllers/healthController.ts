import type { RequestHandler } from "express";
import { config } from "@/config.js";
import { isJwksReady } from "@/services/jwksService.js";
import { pingRedis } from "@/services/redisClient.js";

export const getHealth: RequestHandler = async (_req, res) => {
  const [redisReady, jwksReady] = await Promise.all([
    pingRedis().catch(() => false),
    isJwksReady(),
  ]);

  const ready = redisReady && jwksReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "degraded",
    service: "ai-service",
    checks: {
      redis: redisReady,
      jwks: jwksReady,
    },
    configuredModels: config.OPENROUTER_MODELS,
    dailyBudget: {
      total: config.AI_DAILY_TOTAL_BUDGET,
      chat: config.AI_DAILY_CHAT_BUDGET,
      pseudocodeToPython: config.AI_DAILY_PSEUDOCODE_BUDGET,
    },
  });
};
