import type { IncomingMessage } from "http";
import {
  getSessionById,
  type CollaborationSession,
} from "../services/collaborationService.js";
import { config } from "@/config.js";
export type ConnectionAuthResult =
  | {
      ok: true;
      roomName: string;
      userId: string;
      session: CollaborationSession;
    }
  | {
      ok: false;
      reason: string;
    };

// TODO: change to use introspection afterwards
/**
 * Parses the roomName from the incoming request, no auth is done.
 * @param req req object to give
 * @returns {roomName} if roomName is present and valid, otherwise an error reason
 */
const parseRoom = (req: IncomingMessage): { roomName: string } => {
  req.url;
  const url = URL.parse(
    req.url ?? "/",
    // Must provide a host as base
    `http://${process.env["HOST"] ?? "localhost"}`,
  );
  if (!url) {
    return { roomName: "" };
  }
  const roomName = url.pathname.split("/").pop() ?? "";

  return {
    roomName,
  };
};

function extractToken(req: IncomingMessage): string | null {
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
      req.headers.cookie.split("; ").map((cookie) => {
        const [key, value] = cookie.split("=");
        return [key, value];
      }),
    );
    token = cookies["peerprep_access_token"];
  }
  return token;
}

export const authenticateRequest = async (req: IncomingMessage) => {
  const token = extractToken(req);
  console.log("Extracted token: ", token);
  if (!token) return null;

  const res = await fetch(`${config.GATEWAY_URL}/api/v1/auth/introspect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    userId: string;
    role: string;
    accountRole: string;
    exp: number;
    active: boolean;
  };
  if (!data.active) return null;

  console.log("user authenticated: ", data.userId, " with role: ", data.role);
  return {
    userId: data.userId,
    role: data.role,
    accountRole: data.accountRole,
    exp: data.exp,
  };
};

/**
 * Check the request to validate that the room is correct, and for the
 * valid user of the room.
 *
 * @param req {http.IncomingMessage} passed by node
 * @returns ConnectionAuthResult
 */
export const authoriseConnectionForRoom = async (
  req: IncomingMessage,
): Promise<ConnectionAuthResult> => {
  console.log("Authorising connection for request: ", req.url);
  const { roomName } = parseRoom(req);

  if (!roomName) {
    return { ok: false, reason: "Missing room name" };
  }
  const authData = await authenticateRequest(req);
  const userId = authData?.userId;
  if (!userId) {
    return { ok: false, reason: "Missing user identity" };
  }

  const session = await getSessionById(roomName);
  if (!session) {
    return { ok: false, reason: "Session not found" };
  }

  if (!session.users.includes(userId)) {
    return { ok: false, reason: "User is not part of the session" };
  }

  console.log(`User ${userId} authenticated for room ${roomName}`);
  return { ok: true, roomName, userId, session };
};
