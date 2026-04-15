import type { RequestHandler } from "express";
import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";
import { verifyAccessToken } from "@/services/jwksService.js";

const getCookieValue = (
  cookieHeader: string | undefined,
  cookieName: string,
) => {
  if (!cookieHeader) {
    return null;
  }

  const cookieParts = cookieHeader.split(";");
  for (const part of cookieParts) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
};

const extractAccessToken = (
  authorizationHeader: string | undefined,
  cookieHeader: string | undefined,
) => {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  return getCookieValue(cookieHeader, config.AUTH_COOKIE_NAME);
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = extractAccessToken(
      req.headers.authorization,
      req.headers.cookie,
    );

    if (!token) {
      throw new HttpError(401, "Missing authentication token.");
    }

    req.user = await verifyAccessToken(token);
    next();
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 401;
    const message =
      error instanceof Error ? error.message : "Invalid authentication token.";
    res.status(status).json({ error: message });
  }
};
