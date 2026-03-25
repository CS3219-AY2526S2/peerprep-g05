import { WebSocketServer } from "ws";
import { parse } from "url";

const clients = new Map(); // user_id → socket

export function createWsServer(server) {
    const wss = new WebSocketServer({ server });

    const pingInterval = setInterval(() => {
        wss.clients.forEach((socket) => {
            if (socket.readyState === socket.OPEN) {
                socket.ping();
            }
        });
    }, 30000);

    wss.on("close", () => clearInterval(pingInterval));

    wss.on("connection", (socket, req) => {
        const { query } = parse(req.url, true);
        const user_id = query.user_id;

        if (!user_id) {
            socket.close(1008, "Missing user_id");
            return;
        }

        clients.set(user_id, socket);
        console.log(`WebSocket connected: ${user_id}`);

        // Respond to pings
        socket.on("pong", () => {
            console.log(`Pong received from ${user_id}`);
        });

        socket.on("close", () => {
            clients.delete(user_id);
            console.log(`WebSocket disconnected: ${user_id}`);
        });

        socket.on("error", (err) => {
            console.error(`WebSocket error for ${user_id}:`, err);
            clients.delete(user_id);
        });
    });

    return wss;
}

export function sendToUser(user_id, payload) {
    const socket = clients.get(user_id);
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
        return true;
    }
    return false;
}