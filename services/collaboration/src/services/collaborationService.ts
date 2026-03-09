import { isValidObjectId } from "mongoose";
import { EditorSessionModel } from "@/models/EditorSession.js";

export const getSessions = async (status?: string) => {
  const filter: Record<string, string> = {
    // users: { $in: ["a"] },
  };
  if (status) {
    filter["status"] = status;
  }
  return EditorSessionModel.find(filter);
};

export const createSession = async (
  users: string[],
  editorContent: string,
  descriptionContent: string,
) => {
  const newSession = new EditorSessionModel({
    users,
    editorContent,
    descriptionContent,
    status: "ACTIVE",
  });
  return newSession.save();
};

export const getSessionById = async (sessionId: string) => {
  if (!isValidObjectId(sessionId)) return null;
  return EditorSessionModel.findById(sessionId);
};

export const endSession = async (sessionId: string) => {
  if (!isValidObjectId(sessionId)) return null;
  const session = await EditorSessionModel.findById(sessionId);
  if (!session) return null;
  session.$set({ status: "ENDED", endedOn: new Date() });
  return session.save();
};
