import express from "express";
import {
  postChatResponse,
  postPseudocodeToPython,
} from "@/controllers/aiController.js";
import { requireAuth } from "@/middleware/requireAuth.js";

export const aiRouter = express.Router();

aiRouter.post("/chat", requireAuth, postChatResponse);
aiRouter.post("/pseudocode-to-python", requireAuth, postPseudocodeToPython);
