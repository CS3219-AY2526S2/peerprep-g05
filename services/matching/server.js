import express from "express";
import dotenv from "dotenv";
import http from "http";

import matchRoutes from "./api/routes/matchRoutes.js";
import { postgres } from "./infrastructure/postgres/client.js";
import { redis } from "./infrastructure/redis/client.js";
import { createChannel } from "./infrastructure/rabbitmq/client.js";
import { createWsServer } from "./infrastructure/websocket/wsServer.js";
import { startWsWorker } from "./infrastructure/websocket/wsWorker.js";


dotenv.config();

const app = express();
app.use(express.json());

const server = http.createServer(app);

async function init() {
    try {
        await postgres.connect();
        await redis.ping();

        global.rabbitChannel = await createChannel();

        console.log("All infrastructure connected");

        // Register routes AFTER infra is ready
        app.use("/api/v1/matches", matchRoutes);

        // Attach WebSocket server to the HTTP server
        createWsServer(server);

        // Start WebSocket RabbitMQ consumer
        await startWsWorker();

        // Start HTTP server
        server.listen(3000, () => {
            console.log("Matching service running on port 3000");
        });

    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
}

init();
