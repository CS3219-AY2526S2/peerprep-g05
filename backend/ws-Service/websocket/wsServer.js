import { WebSocketServer } from "ws";
import { parse } from "url";
import { v4 as uuid } from "uuid";
import { publishEvent } from "./rabbitmq/client.js";

const clients = new Map();

function extractToken(req) {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader) {
        const parts = authHeader.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
            token = parts[1];
        }
    }
    if (!token && req.headers.cookie) {
        const cookies = Object.fromEntries(
            req.headers.cookie.split("; ").map(cookie => {
                const [key, value] = cookie.split("=");
                return [key, value];
            })
        );
        token = cookies["peerprep_access_token"];
    }
    return token;

}

async function authenticateRequest(req) {
    const token = extractToken(req);
    if (!token) return null;

    const res = await fetch(`${process.env.GATEWAY_URL}/api/v1/auth/introspect`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.active) return null;

    return {
        userId: data.userId,
        role: data.role,
        accountRole: data.accountRole,
        exp: data.exp
    };
}

export function createWsServer(server, channel) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", async (socket, req) => {
        const user = await authenticateRequest(req);
        if (!user) {
            socket.close(1008, "Unauthorized");
            return;
        }
        const user_id = user.userId;

        const existing = clients.get(user_id);
        if (existing && existing.readyState === existing.OPEN) {
            existing.close(4000, "Replaced by new connection");
            console.log(`Replaced existing WS connection for user ${user_id}`);
        }

        socket.user = user;
        clients.set(user_id, socket);

        socket.on("close", () => {
            if (clients.get(user_id) !== socket) return;
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


//CONTEXT HELPERS:

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