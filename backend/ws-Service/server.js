import dotenv from "dotenv";
import http from "http";
import { createChannel } from "./websocket/rabbitmq/client.js";
import { createWsServer } from "./websocket/wsServer.js";
import { startWsWorker } from "./websocket/wsWorker.js";
import { startQuestionWorker } from "./websocket/fetchQuestionWorker.js";

dotenv.config();

const server = http.createServer();

const channel = await createChannel();

// WebSocket connections
createWsServer(server, channel);

// RabbitMQ consumer
await startWsWorker();
await startQuestionWorker();

const PORT = process.env.PORT || 4001;

server.listen(PORT, () => {
    console.log(`[WS Service] Running on :${PORT}`);
});