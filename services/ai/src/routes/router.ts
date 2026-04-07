import express from "express";
import { aiRouter } from "@/routes/ai.route.js";

export const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ service: "ai-service" });
});

router.use("/ai", aiRouter);
