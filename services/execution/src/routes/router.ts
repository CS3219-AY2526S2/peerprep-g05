import express from "express";
import { executionRouter } from "@/routes/execution.route.js";

export const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ service: "execution-service" });
});

router.use("/execution", executionRouter);
