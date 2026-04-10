import express from "express";
import {
  postConvertToPythonAndExecute,
  postExecutePythonCode,
} from "@/controllers/executionController.js";
import { requireAuth } from "@/middleware/requireAuth.js";

export const executionRouter = express.Router();

executionRouter.post("/execute-python-code", requireAuth, postExecutePythonCode);
executionRouter.post(
  "/convert-to-python-and-execute",
  requireAuth,
  postConvertToPythonAndExecute,
);
