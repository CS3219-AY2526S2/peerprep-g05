import {
  createSession,
  getSessionById,
  getSessions,
} from "@/services/collaborationService.js";
import type { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import z from "zod";

export const getCollaborationSessions: RequestHandler = async (req, res) => {
  return res.json(await getSessions(req.query["status"] as string | undefined));
};

const newCollaborationSessionSchema = z.object({
  users: z
    .array(z.string(), "Must be an array of length 2.")
    .length(2, "Must be an array of length 2."),
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
  const { users, editorContent, descriptionContent } = parsedBody.data;
  const session = await createSession(users, editorContent, descriptionContent);
  res.json({ sessionId: session._id });
};

type CollaborationSessionType = NonNullable<
  Awaited<ReturnType<typeof getSessionById>>
>;
export const checkSessionIdExists: RequestHandler = async (req, res, next) => {
  const { sessionId } = req.params;
  if (!isValidObjectId(sessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const session = await getSessionById(sessionId as string);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.locals["session"] = session;

  next();
};
export const getCollaborationSession: RequestHandler = async (_, res) => {
  res.json(res.locals["session"] as CollaborationSessionType);
};

export const endCollaborationSession: RequestHandler = async (_, res) => {
  const session = res.locals["session"] as CollaborationSessionType;
  session.$set({ status: "ENDED", endedOn: new Date() });
  await session.save();
  res.json({ message: "Session ended successfully" });
};
