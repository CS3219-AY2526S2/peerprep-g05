import { WebSocketServer } from "ws";
import { parse } from "url";
import { v4 as uuid } from "uuid";
import { publishEvent } from "./rabbitmq/client.js";

const clients = new Map();

export function createWsServer(server, channel) {
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
            const entry = clients.get(user_id);
            if (entry?.matchContext) {
                const { match_id, topic, difficulty } = entry.matchContext;
                publishEvent(channel, "match.leave", {
                    event_id: uuid(),
                    match_id,
                    user_id,
                    topic,
                    difficulty,
                });
                console.log(`[WS] ${user_id} disconnected — publishing match.leave`);
            }
            clients.delete(user_id);
        });

        socket.on("error", () => {
            clients.delete(user_id);
        });
    });

    return wss;
}

// Called by the WS worker when match.waiting fires — registers match context
export function setUserMatchContext(user_id, matchContext) {
    const entry = clients.get(user_id);
    if (entry) entry.matchContext = matchContext;
}

// Called by the WS worker when match is confirmed/cancelled — clears context
export function clearUserMatchContext(user_id) {
    const entry = clients.get(user_id);
    if (entry) entry.matchContext = null;
}

export function sendToUser(user_id, payload) {
    const socket = clients.get(user_id);
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}