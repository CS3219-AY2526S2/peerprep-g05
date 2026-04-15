import express from "express";
import { postExecutePythonCode } from "@/controllers/executionController.js";
import { requireAuth } from "@/middleware/requireAuth.js";

export const executionRouter = express.Router();

executionRouter.post("/execute-python-code", requireAuth, postExecutePythonCode);
