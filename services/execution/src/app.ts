import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { config } from "@/config.js";
import { getHealth } from "@/controllers/healthController.js";
import { isHttpError } from "@/lib/httpError.js";
import { router } from "@/routes/router.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: config.MAX_REQUEST_BODY_SIZE }));

app.get("/health", getHealth);
app.use("/api/v1", router);

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isHttpError(error)) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("[execution-service] Unhandled error", error);
    res.status(500).json({ error: "Internal server error." });
  },
);

export default app;
