import { GATEWAY_URL } from "../utils/types";

const AI_BASE = `${GATEWAY_URL}/api/v1/ai`;

export interface PseudocodeToPythonResponse {
  pythonCode: string;
  model: string;
  fallbackUsed: boolean;
  budget?: {
    feature: string;
    usedFeature: number;
    remainingFeature: number;
    featureLimit: number;
    usedTotal: number;
    remainingTotal: number;
    totalLimit: number;
    resetsAt: string;
  };
}

export interface AiApiError {
  status: number;
  data: { error?: string; errors?: { field: string; message: string }[] } | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, data } as AiApiError;
  }
  return data as T;
}

export function convertPseudocodeToPython(input: {
  sessionId: string;
  pseudocode: string;
}) {
  return request<PseudocodeToPythonResponse>("/pseudocode-to-python", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
