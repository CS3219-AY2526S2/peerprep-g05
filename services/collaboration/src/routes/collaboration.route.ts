import express from "express";
import {
  checkSessionIdExists,
  createCollaborationSession,
  endCollaborationSession,
  getActiveCollaborationSession,
  getCollaborationSession,
  getCollaborationSessions,
  isValidSessionId,
} from "@/controllers/collaborationController.js";

export const collaborationRouter = express.Router();

collaborationRouter.get("/", getCollaborationSessions);
collaborationRouter.post("/", createCollaborationSession);

collaborationRouter.get("/validate/:sessionId", isValidSessionId);

collaborationRouter.get("/active-session", getActiveCollaborationSession);

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

collaborationRouter.get("/active-session", getActiveCollaborationSession);
