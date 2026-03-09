import { EditorSessionModel } from "@/models/EditorSession.js";
import { isValidObjectId } from "mongoose";
import express from "express";
import z from "zod";

export const collaborationRouter = express.Router();

collaborationRouter.get("/", (req, res) => {
  const filter: Record<string, any> = {
    // users: { $in: ["a"] },
  };
  if (req.query["status"]) {
    filter["status"] = req.query["status"];
  }
  console.log(req.query);
  EditorSessionModel.find(filter).then((sessions) => {
    res.json(sessions);
  });
});

const newCollaborationSessionSchema = z.object({
  users: z
    .array(z.string(), "Must be an array of length 2.")
    .length(2, "Must be an array of length 2."),
  editorContent: z.string().optional().default(""),
  descriptionContent: z.string().optional().default(""),
});

collaborationRouter.post("/", async (req, res) => {
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
  const newSession = new EditorSessionModel({
    users: users,
    editorContent: editorContent,
    descriptionContent: descriptionContent,
    status: "ACTIVE",
  });
  const session = await newSession.save();
  res.json({ sessionId: session._id });
});

collaborationRouter.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  if (!isValidObjectId(sessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const session = await EditorSessionModel.findById(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session.toJSON());
});

collaborationRouter.delete("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  if (!isValidObjectId(sessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const session = await EditorSessionModel.findById(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  session.$set({ status: "ENDED", endedOn: new Date() });
  await session.save();
  res.json({ message: "Session ended successfully" });
});
