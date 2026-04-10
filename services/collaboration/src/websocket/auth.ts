import type { IncomingMessage } from "http";
import {
  getSessionById,
  type CollaborationSession,
} from "../services/collaborationService.js";
import { jwtDecode, type JwtPayload } from "jwt-decode";

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
 * @returns {roomName} if both are present and valid, otherwise an error reason
 */
const parseRoom = (
  req: IncomingMessage,
): { roomName: string; token: string } => {
  req.url;
  const url = URL.parse(
    req.url ?? "/",
    // Must provide a host as base
    `http://${process.env["HOST"] ?? "localhost"}`,
  );
  if (!url) {
    return { roomName: "", token: "" };
  }
  const roomName = url.pathname.split("/").pop() ?? "";
  const token = url.searchParams.get("token") ?? "";

  return {
    roomName,
    token,
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
  const { roomName, token } = parseRoom(req);

  console.log(
    "Authorizing connection for room: ",
    roomName,
    " with token: ",
    token,
  );
  if (!roomName) {
    return { ok: false, reason: "Missing room name" };
  }

  let decodedToken: JwtPayload;
  try {
    decodedToken = jwtDecode(token ?? "");
  } catch {
    return { ok: false, reason: "Invalid auth token" };
  }

  const userId = decodedToken.sub;
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

  return { ok: true, roomName, userId, session };
};
