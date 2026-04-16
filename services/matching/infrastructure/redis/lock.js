export async function acquireLock(redis, key, ttl = 5) {
    return await redis.set(key, "locked", "NX", "EX", ttl);
}

export async function releaseLock(redis, key) {
    await redis.del(key);
}