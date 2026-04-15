import type { RequestHandler } from "express";
import { isJwksReady } from "@/services/jwksService.js";
import { isPythonRuntimeReady } from "@/services/pythonRunnerService.js";

export const getHealth: RequestHandler = async (_req, res) => {
  const [pythonReady, jwksReady] = await Promise.all([
    isPythonRuntimeReady().catch(() => false),
    isJwksReady(),
  ]);

  const ready = pythonReady && jwksReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "degraded",
    service: "execution-service",
    checks: {
      python: pythonReady,
      jwks: jwksReady,
    },
  });
};
