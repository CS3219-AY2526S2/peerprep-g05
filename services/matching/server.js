import express from "express";
import dotenv from "dotenv";

import matchRoutes from "./api/routes/matchRoutes.js";
import { postgres } from "./infrastructure/postgres/client.js";
import { redis } from "./infrastructure/redis/client.js";
import { createChannel } from "./infrastructure/rabbitmq/client.js";


dotenv.config();

const app = express();
app.use(express.json());

async function init() {
    try {
        await postgres.connect();
        await redis.ping();

        global.rabbitChannel = await createChannel();

        console.log("All infrastructure connected");

        // Register routes AFTER infra is ready
        app.use("/api/v1/matches", matchRoutes);

        // Start HTTP server
        app.listen(3000, () => {
            console.log("Matching service running on port 3000");
        });

    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
}

init();
