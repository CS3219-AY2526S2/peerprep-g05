import { createContext, useContext } from "react";
import { useMatchmaking } from "../hooks/useMatchmaking";

const MatchmakingContext = createContext<ReturnType<typeof useMatchmaking> | null>(null);

export function MatchmakingProvider({ children }: { children: React.ReactNode }) {
  const matchmaking = useMatchmaking();
  return (
    <MatchmakingContext.Provider value={matchmaking}>
      {children}
    </MatchmakingContext.Provider>
  );
}

export function useMatchmakingContext() {
  const ctx = useContext(MatchmakingContext);
  if (!ctx) throw new Error("useMatchmakingContext must be used within MatchmakingProvider");
  return ctx;
}