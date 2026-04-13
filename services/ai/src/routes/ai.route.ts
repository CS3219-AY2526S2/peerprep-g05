import express from "express";
import {
  postChatResponse,
  postPseudocodeToPython,
} from "@/controllers/aiController.js";
import { requireActiveSession } from "@/middleware/requireActiveSession.js";
import { requireAuth } from "@/middleware/requireAuth.js";

export const aiRouter = express.Router();

aiRouter.use(requireAuth);
aiRouter.use(requireActiveSession);

aiRouter.post("/chat", postChatResponse);
aiRouter.post("/pseudocode-to-python", postPseudocodeToPython);
