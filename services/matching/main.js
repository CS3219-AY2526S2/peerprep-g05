import { postgres } from "./infrastructure/postgres/client.js";
import { redis } from "./infrastructure/redis/client.js";
import { createChannel } from "./infrastructure/rabbitmq/client.js";

async function init() {
    await postgres.connect();
    await redis.ping();
    global.rabbitChannel = await createChannel();

    console.log("All infrastructure connected");
}

init();