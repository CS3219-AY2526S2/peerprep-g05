import { useState, useEffect, useRef } from "react";

export function useCountdown(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setLeft(seconds); }, [seconds]);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return { left, fmt: fmt(left), expired: left === 0 };
}