import dotenv from "dotenv";

dotenv.config();

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const requiredEnv = {
  USER_SERVICE_JWKS_URL: process.env["USER_SERVICE_JWKS_URL"],
};

const missingEnvVars = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}

export const config = {
  PORT: parseInteger(process.env["PORT"], 3006),
  USER_SERVICE_JWKS_URL: requiredEnv.USER_SERVICE_JWKS_URL!,
  PYTHON_EXEC_TIMEOUT_MS: parseInteger(
    process.env["PYTHON_EXEC_TIMEOUT_MS"],
    5_000,
  ),
  MAX_REQUEST_BODY_SIZE: process.env["MAX_REQUEST_BODY_SIZE"] ?? "1mb",
  AUTH_COOKIE_NAME:
    process.env["AUTH_COOKIE_NAME"] ?? "peerprep_access_token",
  JWKS_CACHE_TTL_MS: parseInteger(process.env["JWKS_CACHE_TTL_MS"], 300_000),
  MAX_TEST_CASES: parseInteger(process.env["MAX_TEST_CASES"], 50),
} as const;
