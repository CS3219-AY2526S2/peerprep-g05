import type { RequestHandler } from "express";
import { HttpError } from "@/lib/httpError.js";
import { assertActiveSessionAccess } from "@/services/sessionValidationService.js";

const extractSessionId = (req: Parameters<RequestHandler>[0]) => {
  const bodySessionId =
    typeof req.body === "object" &&
    req.body !== null &&
    "sessionId" in req.body &&
    typeof req.body["sessionId"] === "string"
      ? req.body["sessionId"].trim()
      : "";

  if (bodySessionId.length > 0) {
    return bodySessionId;
  }

  const querySessionId =
    typeof req.query["sessionId"] === "string"
      ? req.query["sessionId"].trim()
      : "";

  if (querySessionId.length > 0) {
    return querySessionId;
  }

  const paramSessionId =
    typeof req.params["sessionId"] === "string"
      ? req.params["sessionId"].trim()
      : "";

  if (paramSessionId.length > 0) {
    return paramSessionId;
  }

  return null;
};

export const requireActiveSession: RequestHandler = async (req, res, next) => {
  try {
    const sessionId = extractSessionId(req);
    if (!sessionId) {
      throw new HttpError(400, "sessionId is required.");
    }

    if (!req.user?.id) {
      throw new HttpError(401, "Missing authentication token.");
    }

    await assertActiveSessionAccess(sessionId, req.user.id);
    next();
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Session validation failed.";
    res.status(status).json({ error: message });
  }
};
