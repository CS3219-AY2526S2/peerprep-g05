import { WebSocketServer } from "ws";
import { parse } from "url";

const clients = new Map();

export function createWsServer(server) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (socket, req) => {
        const { query } = parse(req.url, true);
        const user_id = query.user_id;

        if (!user_id) {
            socket.close(1008, "Missing user_id");
            return;
        }

        clients.set(user_id, socket);

        socket.on("close", () => {
            clients.delete(user_id);
        });

        socket.on("error", () => {
            clients.delete(user_id);
        });
    });

    return wss;
}

export function sendToUser(user_id, payload) {
    const socket = clients.get(user_id);
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}