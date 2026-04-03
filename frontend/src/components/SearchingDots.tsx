import { useState, useEffect } from "react";

export function SearchingDots() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
            tick > i ? "bg-slate-500" : "bg-slate-200"
          }`}
        />
      ))}
      <span className="text-xs uppercase tracking-widest text-slate-400 ml-1">
        Searching for opponent
      </span>
    </div>
  );
}