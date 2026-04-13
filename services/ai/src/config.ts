import dotenv from "dotenv";

dotenv.config();

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseModelList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model.length > 0);

const requiredEnv = {
  OPENROUTER_API_KEY: process.env["OPENROUTER_API_KEY"],
  REDIS_URL: process.env["REDIS_URL"],
  USER_SERVICE_JWKS_URL: process.env["USER_SERVICE_JWKS_URL"],
};

const models = parseModelList(process.env["OPENROUTER_MODELS"]);
const missingEnvVars = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (models.length === 0) {
  missingEnvVars.push("OPENROUTER_MODELS");
}

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}

export const config = {
  PORT: parseInteger(process.env["PORT"], 3004),
  OPENROUTER_API_KEY: requiredEnv.OPENROUTER_API_KEY!,
  OPENROUTER_MODELS: models,
  REDIS_URL: requiredEnv.REDIS_URL!,
  USER_SERVICE_JWKS_URL: requiredEnv.USER_SERVICE_JWKS_URL!,
  REQUEST_TIMEOUT_MS: parseInteger(process.env["REQUEST_TIMEOUT_MS"], 30_000),
  SESSION_VALIDATION_BASE_URL:
    process.env["SESSION_VALIDATION_BASE_URL"] ??
    process.env["GATEWAY_SERVICE_URL"] ??
    process.env["COLLAB_SERVICE_URL"] ??
    "http://gateway:4000",
  SESSION_VALIDATION_TIMEOUT_MS: parseInteger(
    process.env["SESSION_VALIDATION_TIMEOUT_MS"],
    5_000,
  ),
  MAX_REQUEST_BODY_SIZE: process.env["MAX_REQUEST_BODY_SIZE"] ?? "1mb",
  AUTH_COOKIE_NAME:
    process.env["AUTH_COOKIE_NAME"] ?? "peerprep_access_token",
  JWKS_CACHE_TTL_MS: parseInteger(process.env["JWKS_CACHE_TTL_MS"], 300_000),
  AI_DAILY_TOTAL_BUDGET: parseInteger(
    process.env["AI_DAILY_TOTAL_BUDGET"],
    100,
  ),
  AI_DAILY_CHAT_BUDGET: parseInteger(
    process.env["AI_DAILY_CHAT_BUDGET"],
    50,
  ),
  AI_DAILY_PSEUDOCODE_BUDGET: parseInteger(
    process.env["AI_DAILY_PSEUDOCODE_BUDGET"],
    50,
  ),
} as const;
