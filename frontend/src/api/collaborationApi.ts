import { CollaborationSession } from "../types/EditorSession";

const SESSION_API_BASE_URL = import.meta.env.VITE_COLLABORATIVE_API_BASE_URL;

export async function getSessionInformation(
  roomId: string,
): Promise<CollaborationSession | null> {
  const res = await fetch(`${SESSION_API_BASE_URL}/collaboration/${roomId}`);
  if (res.status !== 200) {
    return null;
  }
  return await res.json();
}
