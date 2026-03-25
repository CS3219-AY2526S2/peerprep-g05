import { useEffect, useState } from "react";

interface InQueueCardProps {
  queueTimer: number;
}

export default function InQueueCard({ queueTimer }: InQueueCardProps) {
  const [timer, setTimer] = useState(queueTimer || 0);

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card">
      <h2>Searching for a Match...</h2>
      <p>Time in queue: {timer}s</p>
      <div className="loader">⏳</div>
    </div>
  );
}