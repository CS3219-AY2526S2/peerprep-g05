import jwt, { type JwtPayload } from "jsonwebtoken";
import z from "zod";
import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";

const jwksResponseSchema = z.object({
  publicKey: z.string().min(1),
  algorithm: z.literal("RS256").default("RS256"),
});

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.string().optional(),
});

type CachedSigningKey = {
  publicKey: string;
  algorithm: "RS256";
  expiresAt: number;
};

let cachedSigningKey: CachedSigningKey | null = null;

const fetchSigningKey = async (): Promise<CachedSigningKey> => {
  const response = await fetch(config.USER_SERVICE_JWKS_URL);
  if (!response.ok) {
    throw new HttpError(
      503,
      `Failed to load user service signing key: ${response.status}`,
    );
  }

  const payload = jwksResponseSchema.parse(await response.json());
  return {
    publicKey: payload.publicKey,
    algorithm: payload.algorithm,
    expiresAt: Date.now() + config.JWKS_CACHE_TTL_MS,
  };
};

const getSigningKey = async (forceRefresh = false) => {
  if (
    !forceRefresh &&
    cachedSigningKey &&
    cachedSigningKey.expiresAt > Date.now()
  ) {
    return cachedSigningKey;
  }

  cachedSigningKey = await fetchSigningKey();
  return cachedSigningKey;
};

const parseVerifiedPayload = (payload: string | JwtPayload) => {
  if (typeof payload === "string") {
    throw new HttpError(401, "Invalid authentication token.");
  }

  const parsed = tokenPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(401, "Authentication token payload is invalid.");
  }

  return parsed.data;
};

export const verifyAccessToken = async (
  token: string,
): Promise<Express.User> => {
  const verifyWithCurrentKey = async (forceRefresh = false) => {
    const signingKey = await getSigningKey(forceRefresh);
    const payload = jwt.verify(token, signingKey.publicKey, {
      algorithms: [signingKey.algorithm],
    });
    const parsed = parseVerifiedPayload(payload);

    return {
      id: parsed.sub,
      token,
      ...(parsed.role ? { role: parsed.role } : {}),
    };
  };

  try {
    return await verifyWithCurrentKey();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (
      error instanceof Error &&
      /invalid signature|jwt malformed/i.test(error.message)
    ) {
      try {
        return await verifyWithCurrentKey(true);
      } catch (refreshError) {
        if (refreshError instanceof HttpError) {
          throw refreshError;
        }

        throw new HttpError(401, "Invalid authentication token.");
      }
    }

    throw new HttpError(401, "Invalid authentication token.");
  }
};

export const isJwksReady = async () => {
  try {
    await getSigningKey();
    return true;
  } catch {
    return false;
  }
};

export const resetJwksCacheForTests = () => {
  cachedSigningKey = null;
};
