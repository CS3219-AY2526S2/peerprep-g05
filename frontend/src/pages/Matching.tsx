import { useState, useEffect } from "react";
import axios from "axios";
import IdleCard from "../components/IdleCard";
import InQueueCard from "../components/InQueueCard";
import MatchFoundPopup from "../components/MatchFoundPopup";

export default function Matchmaking() {
  // --- State management ---
  type MatchState = "IDLE" | "IN_QUEUE" | "MATCH_FOUND" | "TIMEOUT";
  const [state, setState] = useState<MatchState>("IDLE");

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [peer, setPeer] = useState<string | null>(null);

  // --- WebSocket message types ---
  type WSMessage =
    | { type: "MATCH_WAITING"; match_id: string }
    | { type: "MATCH_PROPOSED"; match_id: string; peer: string }
    | { type: "MATCH_ACCEPTED"; match_id: string }
    | { type: "MATCH_TIMEOUT"; match_id: string };

  // --- WebSocket setup ---
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const msg: WSMessage = JSON.parse(event.data);
      switch (msg.type) {
        case "MATCH_WAITING":
          console.log("Waiting for match:", msg.match_id);
          break;
        case "MATCH_PROPOSED":
          setMatchId(msg.match_id);
          setPeer(msg.peer);
          setState("MATCH_FOUND");
          break;
        case "MATCH_ACCEPTED":
          console.log("Match accepted:", msg.match_id);
          break;
        case "MATCH_TIMEOUT":
          console.log("Match timed out:", msg.match_id);
          setState("IDLE");
          setMatchId(null);
          setPeer(null);
          break;
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  // --- Handlers ---
  const handleAccept = async () => {
    if (!matchId || !peer) return;
    try {
      await axios.post(`http://localhost:3000/api/v1/matches/${matchId}/accept`, {
        user_id: userId,
      });
      setState("IDLE");
      setMatchId(null);
      setPeer(null);
    } catch (err) {
      console.error("Accept failed", err);
      setState("IDLE");
    }
  };

  const handleDecline = () => {
    setState("IDLE");
    setMatchId(null);
    setPeer(null);
  };

  const handleTimeout = () => {
    setState("IDLE");
    setMatchId(null);
    setPeer(null);
  };

  // --- Render by state ---
  return (
    <div className="matchmaking-container">
      {state === "IDLE" && (
        <IdleCard setState={setState} setWs={setWs} />
      )}

      {state === "IN_QUEUE" && (
        <InQueueCard queueTimer={0} />
      )}

      {state === "MATCH_FOUND" && matchId && peer && (
        <MatchFoundPopup
          matchId={matchId}
          peer={peer}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onTimeout={handleTimeout}
        />
      )}
    </div>
  );
}