import { createClient } from "redis";
import { config } from "@/config.js";

type AiRedisClient = ReturnType<typeof createClient>;

let redisClient: AiRedisClient | null = null;
let redisConnectPromise: Promise<AiRedisClient> | null = null;

export const getRedisClient = async (): Promise<AiRedisClient> => {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    const client = createClient({
      url: config.REDIS_URL,
    });

    client.on("error", (error) => {
      console.error("[ai-service] Redis error", error);
    });

    await client.connect();
    redisClient = client;
    return client;
  })();

  try {
    return await redisConnectPromise;
  } finally {
    redisConnectPromise = null;
  }
};

export const pingRedis = async () => {
  const client = await getRedisClient();
  return (await client.ping()) === "PONG";
};

export const disconnectRedis = async () => {
  if (!redisClient?.isOpen) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
};
