import { useState } from "react";
import axios from "axios";

interface IdleCardProps {
  setState: (state: "IDLE" | "IN_QUEUE" | "MATCH_FOUND" | "TIMEOUT") => void;
  setWs: (ws: WebSocket) => void;
}

export default function IdleCard({ setState, setWs }: IdleCardProps) {
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const handleSubmit = async () => {
    const socket = new WebSocket(`ws://localhost:3000?user_id=${userId}`);
    setWs(socket);

    try {
      await axios.post("http://localhost:3000/api/v1/matches", {
        user_id: userId,
        topic,
        difficulty,
      });
      setState("IN_QUEUE");
    } catch (err) {
      console.error(err);
      setState("IDLE");
    }
  };

  return (
    <div className="card">
      <h2>Find a Match</h2>
      <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
      <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Difficulty" />
      <button onClick={handleSubmit}>Find Match</button>
    </div>
  );
}