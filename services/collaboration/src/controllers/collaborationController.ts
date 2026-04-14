import {
  createSession,
  endSession,
  getSessionById,
  getSessions,
  type SessionStatus,
} from "@/services/collaborationService.js";
import { authoriseConnectionForRoom as authoriseConnectionForRoom } from "@/websocket/auth.js";
import { closeRoomConnections } from "@/websocket/wsRooms.js";
import type { RequestHandler } from "express";
import z from "zod";

export const getCollaborationSessions: RequestHandler = async (req, res) => {
  return res.json(
    await getSessions(req.query["status"] as SessionStatus | undefined),
  );
};

const newCollaborationSessionSchema = z.object({
  users: z
    .array(z.string(), "Must be an array of length 2.")
    .length(2, "Must be an array of length 2."),
  questionId: z.string(),
  editorContent: z.string().optional().default(""),
  descriptionContent: z.string().optional().default(""),
});

export const createCollaborationSession: RequestHandler = async (req, res) => {
  const parsedBody = newCollaborationSessionSchema.safeParse(req.body);
  if (!parsedBody.success) {
    console.log("Failed to parse request body: ", parsedBody.error.issues);
    const errorMessage = parsedBody.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message,
    }));

    res.status(400).json({ errors: errorMessage });
    return;
  }
  try {
    const { users, questionId } = parsedBody.data;
    const session = await createSession(users, questionId);
    if (session == null) {
      throw new Error("Error creating session.");
    }
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error(
      "Error creating session: ",
      error instanceof Error ? error.message : error,
    );
    res.status(409).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
};

type CollaborationSessionType = NonNullable<
  Awaited<ReturnType<typeof getSessionById>>
>;


export const isValidSessionId: RequestHandler = async (req, res) => {
  const { sessionId } = req.params;

  const session = await getSessionById(sessionId as string);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.status === "ENDED") {
    res.status(410).json({ error: "Session has ended" });
    return;
  }

  res.json(session);
  console.log(session);
};

export const checkSessionIdExists: RequestHandler = async (req, res, next) => {
  const { sessionId } = req.params;
  const session = await getSessionById(sessionId as string);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.status === "ENDED") {
    res.status(410).json({ error: "Session has ended" });
    return;
  }

  const result = await authoriseConnectionForRoom(req);
  if (!result.ok) {
    res.status(403).json({ error: result.reason });
    return;
  }
  res.locals["session"] = result.session;
  next();
};

export const getCollaborationSession: RequestHandler = async (_, res) => {
  res.json(res.locals["session"] as CollaborationSessionType);
};

export const endCollaborationSession: RequestHandler = async (_, res) => {
  const session = res.locals["session"] as CollaborationSessionType;
  await endSession(session.id);
  closeRoomConnections(session.id);
  res.json({ message: "Session ended successfully" });
};
