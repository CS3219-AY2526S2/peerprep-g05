import dotenv from "dotenv";
import http from "http";
import { createWsServer } from "./websocket/wsServer.js";
import { startWsWorker } from "./websocket/wsWorker.js";

dotenv.config();

const server = http.createServer();

// WebSocket connections
createWsServer(server);

// RabbitMQ consumer
await startWsWorker();

const PORT = process.env.PORT || 4001;

server.listen(PORT, () => {
    console.log(`[WS Service] Running on :${PORT}`);
});