import { CollaborationSession } from "../types/EditorSession";
import { GATEWAY_URL } from "../utils/types";

const SESSION_API_BASE_URL = `${GATEWAY_URL}/api/v1`;

export async function getSessionInformation(
  roomId: string,
): Promise<
  { ok: true; session: CollaborationSession } | { ok: false; error: string }
> {
  const res = await fetch(`${SESSION_API_BASE_URL}/collaboration/${roomId}`, {
    credentials: "include",
  });

  if (res.status !== 200) {
    return {
      ok: false,
      error: (await res.json()).error || "Failed to fetch session information",
    };
  }
  const session = await res.json();
  return { ok: true, session };
}

export async function getActiveSession(): Promise<
  { ok: true; session: CollaborationSession } | { ok: false; error: string }
> {
  const res = await fetch(
    `${SESSION_API_BASE_URL}/collaboration/active-session`,
    {
      credentials: "include",
    },
  );
  if (res.status !== 200) {
    return {
      ok: false,
      error:
        (await res.json()).error ||
        "Failed to fetch active session information",
    };
  }
  const session = await res.json();
  return { ok: true, session };
}

export async function endSession(roomId: string): Promise<boolean> {
  const res = await fetch(`${SESSION_API_BASE_URL}/collaboration/${roomId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.status === 200;
}
