/**
 * This file reads the config from the .env as a typescript object, ensuring that the required env var is set.
 */
import dotenv from "dotenv";

dotenv.config();

type ConfigType = {
  MONGO_URI: string;
  EXPRESS_PORT: string;
};

export const config: ConfigType = {
  MONGO_URI: process.env["MONGO_URI"]!,
  EXPRESS_PORT: process.env["EXPRESS_PORT"]!,
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
