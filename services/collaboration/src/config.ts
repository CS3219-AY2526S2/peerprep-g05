/**
 * This file reads the config from the .env as a typescript object, ensuring that the required env var is set.
 */
import dotenv from "dotenv";

dotenv.config();

type ConfigType = {
  REDIS_URL: string;
  EXPRESS_PORT: string;
  GATEWAY_URL: string;
};

export const config: ConfigType = {
  REDIS_URL: process.env["REDIS_URL"]!,
  EXPRESS_PORT: process.env["EXPRESS_PORT"]!,
  GATEWAY_URL: process.env["GATEWAY_URL"]!,
};

const missingEnvVars: string[] = [];
Object.entries(config).forEach(([key, value]) => {
  if (!value) {
    missingEnvVars.push(key);
  }
});
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}
