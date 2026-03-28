import { useRef, useCallback, useEffect } from "react";
import { WS_URL } from "../utils/constants";
import { ConfirmedMatch, Difficulty, FSMState, MatchInfo, ProposedMatch } from "../utils/types";

interface WsHandlers {
  onWaiting: (matchId:string) => void;
  onProposed: (match: ProposedMatch) => void;
  onAccepted: () => void;
  onConfirmed: (match: ConfirmedMatch) => void;
  onCancelled: () => void;
  onTimeout: () => void;
}

export function useMatchWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const handlersRef = useRef<WsHandlers | null>(null);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const connect = useCallback((userId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`${WS_URL}?user_id=${userId}`);

      socket.onopen = () => {
        ws.current = socket;
        resolve();
      };

      socket.onerror = () => reject(new Error("WebSocket connection failed"));

      socket.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        const h = handlersRef.current;
        if (!h) return;

        switch (msg.type) {
          case "MATCH_WAITING":
            h.onWaiting(msg.match_id);
            break;
          case "MATCH_PROPOSED":
            h.onProposed({ matchId: msg.match_id });
            break;
          case "MATCH_ACCEPTED":
            h.onAccepted();
            break;
          case "MATCH_CONFIRMED":
            h.onConfirmed({
              matchId: msg.match_id,
              userIdA: msg.user_id_a,
              userIdB: msg.user_id_b,
              topic: msg.topic,
              difficulty: msg.difficulty as Difficulty,
            });
            break;
          case "MATCH_CANCELLED":
            h.onCancelled();
            break;
          case "MATCH_TIMEOUT":
            h.onTimeout();
            break;
        }
      };

      socket.onclose = () => console.log("[WS] Disconnected");
    });
  }, []);

  // Stable setter — callers update handlers without re-connecting
  const setHandlers = useCallback((handlers: WsHandlers) => {
    handlersRef.current = handlers;
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { connect, disconnect, setHandlers };
}