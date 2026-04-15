import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuid } from "uuid";
import { appendMessage, getHistory } from "./redis/client.js";

// userId → WebSocket
const clients = new Map();

// roomId → Set<userId>
const rooms = new Map();

// ─── Auth ────────────────────────────────────────────────────────────────────

function extractToken(req) {
    console.log(`[Chat WS] [Auth] Headers: ${JSON.stringify(Object.keys(req.headers))}`);

    const authHeader = req.headers.authorization;
    if (authHeader) {
        const [scheme, token] = authHeader.split(" ");
        if (scheme === "Bearer" && token) {
            console.log(`[Chat WS] [Auth] Token found in Authorization header`);
            return token;
        }
    }

    if (req.headers.cookie) {
        const cookies = Object.fromEntries(
            req.headers.cookie.split("; ").map((c) => {
                const [k, v] = c.split("=");
                return [k, v];
            })
        );
        if (cookies["peerprep_access_token"]) {
            console.log(`[Chat WS] [Auth] Token found in cookie`);
            return cookies["peerprep_access_token"];
        }
    }

    console.warn(`[Chat WS] [Auth] No token found in headers or cookies`);
    return null;
}

async function authenticateRequest(req) {
    const token = extractToken(req);
    if (!token) {
        console.warn(`[Chat WS] [Auth] Rejecting — no token`);
        return null;
    }

    const introspectUrl = `${process.env.GATEWAY_URL}/api/v1/auth/introspect`;
    console.log(`[Chat WS] [Auth] Introspecting against: ${introspectUrl}`);

    let res;
    try {
        res = await fetch(introspectUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });
    } catch (err) {
        console.error(`[Chat WS] [Auth] Introspect fetch failed — is GATEWAY_URL set? (${process.env.GATEWAY_URL})`, err);
        return null;
    }

    if (!res.ok) {
        console.warn(`[Chat WS] [Auth] Introspect returned HTTP ${res.status}`);
        return null;
    }

    const data = await res.json();
    console.log(`[Chat WS] [Auth] Introspect response: ${JSON.stringify(data)}`);

    if (!data.active) {
        console.warn(`[Chat WS] [Auth] Token is not active`);
        return null;
    }

    console.log(`[Chat WS] [Auth] Authenticated userId: ${data.userId}`);
    return { userId: data.userId, token };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendToUser(userId, payload) {
    const socket = clients.get(userId);
    if (!socket) {
        console.warn(`[Chat WS] [Send] No socket found for userId: ${userId}`);
        return;
    }
    if (socket.readyState !== socket.OPEN) {
        console.warn(`[Chat WS] [Send] Socket for ${userId} not open (readyState: ${socket.readyState})`);
        return;
    }
    console.log(`[Chat WS] [Send] → ${userId} | type: ${payload.type}`);
    socket.send(JSON.stringify(payload));
}

function getQuestionDesc(session) {
    console.log(session.descriptionContent);
    return session.descriptionContent;
}

function getExistingCode(session) {
    console.log(session.editorContent);
    return session.editorContent;
}

function broadcastToRoom(roomId, payload) {
    const room = rooms.get(roomId);
    if (!room || room.size === 0) {
        console.warn(`[Chat WS] [Broadcast] Room ${roomId} is empty or does not exist`);
        return;
    }
    console.log(`[Chat WS] [Broadcast] Sending to ${room.size} user(s) in room ${roomId}: [${[...room].join(", ")}]`);
    room.forEach((uid) => sendToUser(uid, payload));
}

function leaveRoom(socket, userId) {
    const roomId = socket.roomId;
    if (!roomId) {
        console.log(`[Chat WS] User ${userId} had no room to leave`);
        return;
    }

    rooms.get(roomId)?.delete(userId);
    if (rooms.get(roomId)?.size === 0) {
        rooms.delete(roomId);
        console.log(`[Chat WS] Room ${roomId} deleted — no users remaining`);
    }

    console.log(`[Chat WS] User ${userId} left room ${roomId}`);
}

// ─── Message handlers ─────────────────────────────────────────────────────────

async function handleJoin(socket, userId, payload) {
    const { roomId } = payload;
    console.log(`[Chat WS] [Join] userId: ${userId} | roomId: ${roomId}`);

    if (!roomId) {
        console.warn(`[Chat WS] [Join] Missing roomId — dropping`);
        return;
    }

    leaveRoom(socket, userId);
    socket.roomId = roomId;

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(userId);

    console.log(`[Chat WS] [Join] Room ${roomId} now has ${rooms.get(roomId).size} user(s): [${[...rooms.get(roomId)].join(", ")}]`);

    const history = await getHistory(roomId);
    console.log(`[Chat WS] [Join] Replaying ${history.length} message(s) to ${userId}`);
    sendToUser(userId, { type: "CHAT_HISTORY", messages: history });
}

async function handleMessage(socket, userId, payload) {
    const { roomId, content } = payload;
    console.log(`[Chat WS] [Message] userId: ${userId} | roomId: ${roomId} | content: "${content}"`);

    if (!roomId || !content?.trim()) {
        console.warn(`[Chat WS] [Message] Missing roomId or content — dropping`);
        return;
    }

    if (socket.roomId !== roomId) {
        console.warn(`[Chat WS] [Message] socket.roomId (${socket.roomId}) !== payload roomId (${roomId}) — rejecting`);
        sendToUser(userId, { type: "CHAT_ERROR", message: "You are not in this room." });
        return;
    }

    if (!rooms.get(roomId)?.has(userId)) {
        console.warn(`[Chat WS] [Message] userId ${userId} not found in rooms[${roomId}] — rejecting`);
        sendToUser(userId, { type: "CHAT_ERROR", message: "You are not in this room." });
        return;
    }

    const msg = {
        id: uuid(),
        sender: userId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
    };

    console.log(`[Chat WS] [Message] Persisting to Redis: ${JSON.stringify(msg)}`);
    await appendMessage(roomId, msg);

    console.log(`[Chat WS] [Message] Broadcasting to room ${roomId}`);
    broadcastToRoom(roomId, { type: "CHAT_MESSAGE", ...msg });
}

async function handleAiRequest(socket, userId, payload) {
    const { roomId, prompt, question } = payload;

    // ─── 1. Validate ─────────────────────────────────────────────
    if (!roomId || !prompt?.trim()) {
        sendToUser(userId, {
            type: "CHAT_ERROR",
            message: "Invalid request.",
        });
        return;
    }

    if (socket.roomId !== roomId || !rooms.get(roomId)?.has(userId)) {
        sendToUser(userId, {
            type: "CHAT_ERROR",
            message: "You are not in this room.",
        });
        return;
    }

    let session;
    try {
        const res = await fetch(`${process.env.GATEWAY_URL}/api/v1/collaboration/validate/${encodeURIComponent(roomId)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(socket.authToken && {
                    Authorization: `Bearer ${socket.authToken}`,
                }),
            },
        });
        if (!res.ok) {
            console.warn(`[AI WS] Session validation failed with status ${res.status}`);
            throw new Error("Session validation failed");
        }
        session = await res.json();
        console.log(`[AI WS] Session validation successful: ${JSON.stringify(session)}`);
    } catch (err) {
        console.error(`[AI WS] Session validation error:`, err);
        sendToUser(userId, {
            type: "CHAT_ERROR",
            message: "Failed to validate session. Please try again.",
        });
        return;
    }

    const questionDesc = getQuestionDesc(session);
    const editorCode = getExistingCode(session);
    console.log(`[AI WS] Extracted question description: "${questionDesc}"`);
    console.log(`[AI WS] Extracted editor code: "${editorCode}"`);

    // ─── 2. Prepare request ──────────────────────────────────────
    const url = `${process.env.GATEWAY_URL}/api/v1/ai/chat`;

    const userMsg = {
        id: uuid(),
        sender: userId,
        content: prompt.trim(),
        timestamp: new Date().toISOString(),
    };

    await appendMessage(roomId, userMsg);
    broadcastToRoom(roomId, { type: "CHAT_MESSAGE", ...userMsg });

    const requestBody = {
        sessionId: roomId,
        prompt: prompt.trim(),
        codeSnippet: editorCode,
        question: questionDesc
    };

    console.log("[AI WS] ➡️ URL:", url);
    console.log("[AI WS] ➡️ Body:", JSON.stringify(requestBody, null, 2));

    // Notify UI that AI is thinking
    broadcastToRoom(roomId, { type: "CHAT_AI_REQUEST" });

    try {
        // ─── 3. Call AI service ───────────────────────────────────
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(socket.authToken && {
                    Authorization: `Bearer ${socket.authToken}`,
                }),
            },
            body: JSON.stringify(requestBody),
        });

        const rawText = await res.text();

        console.log("[AI WS] ⬅️ Status:", res.status);
        console.log("[AI WS] ⬅️ Raw:", rawText);

        // ─── 4. Handle non-OK response ────────────────────────────
        if (!res.ok) {
            let errorMessage = "AI service error";

            try {
                const err = JSON.parse(rawText);
                errorMessage = err.error || errorMessage;
            } catch {
                errorMessage = rawText;
            }

            broadcastToRoom(roomId, {
                type: "CHAT_AI_RESPONSE",
                error: errorMessage,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // ─── 5. Parse response ────────────────────────────────────
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            throw new Error("Invalid JSON from AI service");
        }

        // ─── 6. Build message ─────────────────────────────────────
        const msg = {
            id: uuid(),
            sender: "ai",
            content: data.reply,
            timestamp: new Date().toISOString(),
        };

        console.log("[AI WS] 📤 Broadcasting:", msg);

        // Save + broadcast
        await appendMessage(roomId, msg);

        broadcastToRoom(roomId, {
            type: "CHAT_AI_RESPONSE",
            ...msg,
        });

    } catch (err) {
        console.error("[AI WS] ❌ Error:", err);

        broadcastToRoom(roomId, {
            type: "CHAT_AI_RESPONSE",
            error: "Failed to fetch AI response",
            timestamp: new Date().toISOString(),
        });
    }
}

// ─── Server ───────────────────────────────────────────────────────────────────

export function createWsServer(server) {
    const wss = new WebSocketServer({ server });
    console.log(`[Chat WS] WebSocket server initialised`);

    wss.on("connection", async (socket, req) => {
        console.log(`[Chat WS] Incoming connection from ${req.socket.remoteAddress}`);

        // Set up message handler FIRST to prevent race condition
        // Messages will be queued until authentication completes
        const messageQueue = [];
        let userId = null;
        let isAuthenticated = false;

        socket.on("message", async (raw) => {
            console.log(`[Chat WS] Raw frame received: ${raw}`);
            
            // Queue messages until authenticated
            if (!isAuthenticated) {
                console.log(`[Chat WS] Queueing message until authentication completes`);
                messageQueue.push(raw);
                return;
            }

            let payload;
            try {
                payload = JSON.parse(raw);
            } catch {
                console.warn(`[Chat WS] Malformed JSON from ${userId} — dropping`);
                return;
            }

            try {
                switch (payload.type) {
                    case "CHAT_JOIN":
                        await handleJoin(socket, userId, payload);
                        break;
                    case "CHAT_MESSAGE":
                        await handleMessage(socket, userId, payload);
                        break;
                    case "CHAT_AI_REQUEST":
                        console.log(payload);
                        await handleAiRequest(socket, userId, payload);
                        break;
                    default:
                        console.warn(`[Chat WS] Unknown type from ${userId}: "${payload.type}"`);
                }
            } catch (err) {
                console.error(`[Chat WS] Error handling ${payload.type} from ${userId}:`, err);
            }
        });

        socket.on("close", (code, reason) => {
            console.log(`[Chat WS] User ${userId || 'unknown'} disconnected | code: ${code} | reason: ${reason?.toString()}`);
            if (userId) {
                // Broadcast before leaving so the room still has the user
                const roomId = socket.roomId;
                if (roomId) {
                    broadcastToRoom(roomId, {
                        type: "CHAT_USER_LEFT",
                        userId,
                    });
                }

                leaveRoom(socket, userId);
                clients.delete(userId);
                console.log(`[Chat WS] Clients remaining: ${clients.size}`);
            }
        });

        socket.on("error", (err) => {
            console.error(`[Chat WS] Socket error for ${userId || 'unknown'}:`, err);
            if (userId) clients.delete(userId);
        });

        // Now authenticate
        const user = await authenticateRequest(req);
        if (!user) {
            console.warn(`[Chat WS] Closing — authentication failed`);
            socket.close(1008, "Unauthorized");
            return;
        }

        userId = user.userId;
        socket.authToken = user.token;
        isAuthenticated = true;

        const existing = clients.get(userId);
        if (existing && existing.readyState === WebSocket.OPEN) {
            existing.close(4000, "Replaced by new connection");
        }

        clients.set(userId, socket);
        console.log(`[Chat WS] User ${userId} connected | total clients: ${clients.size}`);

        // Process queued messages
        if (messageQueue.length > 0) {
            console.log(`[Chat WS] Processing ${messageQueue.length} queued message(s) for ${userId}`);
            for (const raw of messageQueue) {
                let payload;
                try {
                    payload = JSON.parse(raw);
                } catch {
                    console.warn(`[Chat WS] Malformed JSON in queued message — dropping`);
                    continue;
                }

                try {
                    switch (payload.type) {
                        case "CHAT_JOIN":
                            await handleJoin(socket, userId, payload);
                            break;
                        case "CHAT_MESSAGE":
                            await handleMessage(socket, userId, payload);
                            break;
                        default:
                            console.warn(`[Chat WS] Unknown type in queued message: "${payload.type}"`);
                    }
                } catch (err) {
                    console.error(`[Chat WS] Error handling queued ${payload.type}:`, err);
                }
            }
        }
    });

    return wss;
}