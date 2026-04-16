import dotenv from "dotenv";
import http from "http";
import { createWsServer } from "./wsServer.js";

dotenv.config();

const server = http.createServer();

createWsServer(server);

const PORT = process.env.PORT || 4002;

server.listen(PORT, () => {
    console.log(`[Chat Service] Running on :${PORT}`);
});