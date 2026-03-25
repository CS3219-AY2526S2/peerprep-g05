import { useEffect, useState } from "react";
import axios from "axios";

interface MatchFoundPopupProps {
  matchId: string;
  peer: string;
  onAccept: () => void;
  onDecline: () => void;
  onTimeout: () => void;
}

interface MatchProposedEvent {
  type: "MATCH_PROPOSED";
  match_id: string;
  peer: string;
}

export default function MatchFoundPopup({
  matchId,
  peer,
  onAccept,
  onDecline,
  onTimeout,
}: MatchFoundPopupProps) {
  const [timer, setTimer] = useState(20);

  useEffect(() => {
    if (timer <= 0) {
      onTimeout();
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleAccept = async () => {
    try {
      await axios.post(`http://localhost:3000/api/v1/matches/${matchId}/accept`, { user_id: peer });
      onAccept();
    } catch {
      onTimeout();
    }
  };

  return (
    <div className="popup">
      <h2>Match Found!</h2>
      <p>Opponent: {peer}</p>
      <p>Time remaining: {timer}s</p>
      <button onClick={handleAccept}>Accept</button>
      <button onClick={onDecline}>Decline</button>
    </div>
  );
}