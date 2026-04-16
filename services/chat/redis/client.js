import { createClient } from "redis";

const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

client.on("error", (err) => console.error("[Redis] Client error:", err));
client.on("connect", () => console.log("[Redis] Connected"));

await client.connect();

const CHAT_TTL_SECONDS = 60 * 60 * 24;

export async function appendMessage(roomId, msg) {
    const key = `chat:${roomId}`;
    await client.rPush(key, JSON.stringify(msg));
    await client.expire(key, CHAT_TTL_SECONDS);
}

export async function getHistory(roomId) {
    const key = `chat:${roomId}`;
    const entries = await client.lRange(key, 0, -1);
    return entries.map((e) => JSON.parse(e));
}


export async function clearHistory(roomId) {
    await client.del(`chat:${roomId}`);
}

export default client;