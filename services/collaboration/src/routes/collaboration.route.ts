import express from "express";
import {
  checkSessionIdExists,
  createCollaborationSession,
  endCollaborationSession,
  getCollaborationSession,
  getCollaborationSessions,
} from "@/controllers/collaborationController.js";

export const collaborationRouter = express.Router();

collaborationRouter.get("/", getCollaborationSessions);
collaborationRouter.post("/", createCollaborationSession);

collaborationRouter.get(
  "/:sessionId",
  checkSessionIdExists,
  getCollaborationSession,
);
collaborationRouter.delete(
  "/:sessionId",
  checkSessionIdExists,
  endCollaborationSession,
);
