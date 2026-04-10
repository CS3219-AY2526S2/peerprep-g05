import { config } from "@/config.js";
import { HttpError } from "@/lib/httpError.js";
import { parseAiConversionResponse } from "@/schemas/executionSchemas.js";

const passthroughStatuses = new Set([400, 401, 403, 404, 409, 422, 429]);

const parseUpstreamErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as {
      error?: string;
      errors?: { message?: string }[];
    };
    if (typeof body.error === "string" && body.error.trim().length > 0) {
      return body.error;
    }
    const firstIssue = body.errors?.find(
      (issue) => typeof issue.message === "string" && issue.message.trim(),
    );
    if (firstIssue?.message) {
      return firstIssue.message;
    }
  } catch {
    // Ignore malformed responses from upstream services.
  }

  return `AI service request failed with status ${response.status}.`;
};

export const stripMarkdownCodeFence = (value: string) => {
  const trimmed = value.trim();
  const fencedBlock = trimmed.match(/^```[\w-]*\s*\n([\s\S]*?)\n```$/);
  if (fencedBlock?.[1]) {
    return fencedBlock[1].trim();
  }

  const simpleFence = trimmed.match(/^```([\s\S]*?)```$/);
  if (simpleFence?.[1]) {
    return simpleFence[1].trim();
  }

  return value;
};

export const convertPseudocodeToPython = async (input: {
  code: string;
  token: string;
}) => {
  let response: Response;
  try {
    response = await fetch(
      `${config.AI_SERVICE_BASE_URL}/api/v1/ai/pseudocode-to-python`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${input.token}`,
        },
        body: JSON.stringify({
          pseudocode: input.code,
        }),
        signal: AbortSignal.timeout(config.REQUEST_TIMEOUT_MS),
      },
    );
  } catch (error) {
    console.error("[execution-service] AI service request failed", error);
    throw new HttpError(503, "AI service is unavailable.");
  }

  if (!response.ok) {
    const message = await parseUpstreamErrorMessage(response);
    const status = passthroughStatuses.has(response.status) ? response.status : 502;
    throw new HttpError(status, message);
  }

  const body = parseAiConversionResponse(await response.json());
  return stripMarkdownCodeFence(body.pythonCode);
};
