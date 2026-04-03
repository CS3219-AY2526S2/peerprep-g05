import { CollaborationSession } from "../types/EditorSession";
import { GATEWAY_URL } from "../utils/types";

const SESSION_API_BASE_URL = `${GATEWAY_URL}/api/v1`;

export async function getSessionInformation(
  roomId: string,
  token: string,
): Promise<CollaborationSession | null> {
  const res = await fetch(
    `${SESSION_API_BASE_URL}/collaboration/${roomId}?token=${token}`,
  );
  if (res.status !== 200) {
    return null;
  }
  return await res.json();
}

export async function endSession(
  roomId: string,
  token: string,
): Promise<boolean> {
  const res = await fetch(
    `${SESSION_API_BASE_URL}/collaboration/${roomId}?token=${token}`,
    {
      method: "DELETE",
    },
  );
  return res.status === 200;
}
