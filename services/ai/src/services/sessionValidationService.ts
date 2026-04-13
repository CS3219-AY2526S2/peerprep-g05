import z from "zod";
import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";

const collaborationSessionSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  users: z.array(z.string().min(1)),
});

const buildSessionValidationUrl = (sessionId: string) =>
  `${config.SESSION_VALIDATION_BASE_URL}/api/v1/collaboration/${encodeURIComponent(sessionId)}`;

export const assertActiveSessionAccess = async (
  sessionId: string,
  userId: string,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.SESSION_VALIDATION_TIMEOUT_MS,
  );

  try {
    const response = await fetch(buildSessionValidationUrl(sessionId), {
      method: "GET",
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new HttpError(403, "A valid active session is required.");
    }

    if (!response.ok) {
      throw new HttpError(
        503,
        `Unable to validate collaboration session: ${response.status}.`,
      );
    }

    const session = collaborationSessionSchema.parse(await response.json());

    if (session.status !== "ACTIVE") {
      throw new HttpError(403, "Only active sessions can call AI endpoints.");
    }

    if (!session.users.includes(userId)) {
      throw new HttpError(
        403,
        "Authenticated user is not part of this collaboration session.",
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      throw new HttpError(
        503,
        "Collaboration session payload could not be validated.",
      );
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(
        503,
        "Session validation request timed out. Please retry.",
      );
    }

    throw new HttpError(503, "Session validation request failed.");
  } finally {
    clearTimeout(timeout);
  }
};
