import { useCallback } from "react";
import { GATEWAY_URL } from "../utils/constants";
import { Difficulty, MatchInfo } from "../utils/types";

export function useMatchActions() {
  const enterMatch = useCallback(
    async (userId: string, topic: string, difficulty: Difficulty): Promise<string> => {
      const res = await fetch(`${GATEWAY_URL}/api/v1/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, topic, difficulty }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enter matchmaking");
      }

      const data = await res.json();
      return data.match_id as string;
    },
    []
  );

  const cancelMatch = useCallback(async (matchInfo: MatchInfo) => {
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: matchInfo.userId,
          topic: matchInfo.topic,
          difficulty: matchInfo.difficulty,
        }),
      });
    } catch {
      // Best-effort — we always reset local state regardless
    }
  }, []);

  const acceptMatch = useCallback(async (matchId: string, userId: string) => {
    await fetch(`${GATEWAY_URL}/api/v1/matches/${matchId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  }, []);

  const declineMatch = useCallback(async (matchId: string, userId: string) => {
    await fetch(`${GATEWAY_URL}/api/v1/matches/${matchId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  }, []);

  return { enterMatch, cancelMatch, acceptMatch, declineMatch };
}