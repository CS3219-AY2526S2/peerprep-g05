import { useState, useRef, useCallback, useEffect } from "react";
import {
  GATEWAY_URL, WS_URL,
  STATE, type FSMState,
  type Difficulty,
  type MatchInfo, type ProposedMatch, type ConfirmedMatch,
} from "../utils/types";
import { useTimer } from "./useTimer";

export function useMatchmaking() {
  const [fsm,            setFsm]            = useState<FSMState>(STATE.IDLE);
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [matchInfo,      setMatchInfo]      = useState<MatchInfo | null>(null);
  const [proposedMatch,  setProposedMatch]  = useState<ProposedMatch | null>(null);
  const [confirmedMatch, setConfirmedMatch] = useState<ConfirmedMatch | null>(null);
  const [accepted,       setAccepted]       = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const { fmt: elapsedFmt, reset: resetTimer } = useTimer(fsm === STATE.QUEUING);

  const disconnectWs = useCallback(() => {
    ws.current?.close();
    ws.current = null;
  }, []);

  // Stable ref so the socket's onmessage never captures a stale closure.
  const handleWsMessage = useCallback((msg: Record<string, any>) => {
    switch (msg.type) {
      case "MATCH_WAITING":
        setAccepted(false);
        setProposedMatch(null);
        setFsm(STATE.QUEUING);
        resetTimer();
        break;
      case "MATCH_PROPOSED":
        setProposedMatch({ matchId: msg.match_id, peer: msg.peer });
        setAccepted(false);
        setFsm(STATE.PROPOSED);
        break;
      case "MATCH_ACCEPTED":
        setAccepted(true);
        break;
      case "MATCH_CONFIRMED":
        setConfirmedMatch({
          matchId:    msg.match_id,
          userIdA:    msg.user_id_a,
          userIdB:    msg.user_id_b,
          topic:      matchInfo?.topic      ?? "",
          difficulty: matchInfo?.difficulty ?? "easy",
        });
        setFsm(STATE.CONFIRMED);
        break;
      case "MATCH_CANCELLED":
        disconnectWs();
        setError("Match was declined.");
        setFsm(STATE.IDLE);
        break;
      case "MATCH_TIMEOUT":
        disconnectWs();
        setProposedMatch(null);
        setAccepted(false);
        setError("Match proposal timed out.");
        setFsm(STATE.IDLE);
        break;
    }
  }, [matchInfo, resetTimer, disconnectWs]);

  const handleWsMessageRef = useRef(handleWsMessage);
  useEffect(() => { handleWsMessageRef.current = handleWsMessage; }, [handleWsMessage]);

  const connectWs = useCallback((userId: string) => {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(`${WS_URL}?user_id=${userId}`);
      socket.onopen    = () => { ws.current = socket; resolve(socket); };
      socket.onerror   = () => reject(new Error("WebSocket connection failed"));
      socket.onmessage = (event) => {
        try { handleWsMessageRef.current(JSON.parse(event.data)); } catch {}
      };
      socket.onclose = () => console.log("[WS] Disconnected");
    });
  }, []);

  const findMatch = async ({ userId, topic, difficulty }: Omit<MatchInfo, "matchId">) => {
    setError("");
    setLoading(true);
    try {
      await connectWs(userId);
      const res = await fetch(`${GATEWAY_URL}/api/v1/matches`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: userId, topic, difficulty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enter matchmaking");
      }
      const data = await res.json();
      setMatchInfo({ userId, topic, difficulty, matchId: data.match_id });
      resetTimer();
      setFsm(STATE.QUEUING);
    } catch (err: any) {
      disconnectWs();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          user_id:    matchInfo?.userId,
          topic:      matchInfo?.topic,
          difficulty: matchInfo?.difficulty,
        }),
      });
    } catch {}
    disconnectWs();
    setFsm(STATE.IDLE);
    setMatchInfo(null);
  };

  const accept = async () => {
    if (accepted) return;
    setAccepted(true);
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches/${proposedMatch?.matchId}/accept`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: matchInfo?.userId }),
      });
    } catch { setAccepted(false); }
  };

  const decline = async () => {
    if (accepted) return;
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches/${proposedMatch?.matchId}/decline`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: matchInfo?.userId }),
      });
    } catch {}
    disconnectWs();
    setFsm(STATE.IDLE);
    setMatchInfo(null);
    setProposedMatch(null);
  };

  const reset = () => {
    setFsm(STATE.IDLE);
    setError("");
    setMatchInfo(null);
    setProposedMatch(null);
    setConfirmedMatch(null);
    setAccepted(false);
    disconnectWs();
  };

  return {
    fsm, error, loading, elapsedFmt,
    matchInfo, proposedMatch, confirmedMatch, accepted,
    findMatch, cancel, accept, decline, reset,
  };
}