import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef, useState } from "react";
import { yCollab } from "y-codemirror.next";
import * as awarenessProtocol from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useAuth } from "../../context/AuthContext.tsx";
import { WS_CLOSE_CODES } from "../../utils/socketSessionConst.ts";

const VITE_WEBSOCKET_URL = "ws://localhost:3003";
const WEBSOCKET_URL =
  import.meta.env.VITE_COLLAB_WEBSOCKET_URL || VITE_WEBSOCKET_URL;
if (!WEBSOCKET_URL) {
  throw new Error(
    "VITE_WEBSOCKET_URL is not set. Define it in the frontend .env file.",
  );
}

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
});

const AWARENESS_HEARTBEAT_MS = 1000;
const PEER_STALE_TIMEOUT_MS = 3000;

export function CollaborativeEditor({
  roomId,
  onSessionEnded,
  onWsStatusChange,
}: {
  roomId: string;
  onSessionEnded?: () => void;
  onWsStatusChange?: (event: {
    status: "connected" | "disconnected" | "connecting";
  }) => void;
}) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isProviderConnected, setIsProviderConnected] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const { user } = useAuth();

  const displayName = user?.display_name || user?.username || "Anonymous";
  const userColor = "#0fa0ff";

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WEBSOCKET_URL, roomId, ydoc);

    const setWsStatus = (
      status: "connected" | "disconnected" | "connecting",
    ) => {
      setIsProviderConnected(status === "connected");
      onWsStatusChange?.({ status });
    };

    provider.on("status", (event) => {
      console.log("WebSocket status:", event.status);
      setWsStatus(event.status);
    });

    provider.on("connection-close", (event: CloseEvent | null) => {
      setWsStatus("connecting");

      if (event?.code === WS_CLOSE_CODES.SESSION_ENDED) {
        onSessionEnded?.();
      }
    });

    const updatePeerPresence = () => {
      const now = Date.now();
      const peers = Array.from(provider.awareness.getStates().entries()).filter(
        ([clientId, state]) => {
          if (clientId === provider.awareness.clientID || !state?.user) {
            return false;
          }

          const lastSeen = (state.user as { lastSeen?: number }).lastSeen;
          if (typeof lastSeen !== "number") {
            return true;
          }

          return now - lastSeen <= PEER_STALE_TIMEOUT_MS;
        },
      );
      setIsPeerConnected(peers.length > 0);
    };

    provider.awareness.on("change", updatePeerPresence);
    updatePeerPresence();

    const handleBeforeUnload = () => {
      awarenessProtocol.removeAwarenessStates(
        provider.awareness,
        [provider.awareness.clientID],
        provider.ws,
      );
      setWsStatus("disconnected");
    };

    const handleOffline = () => {
      setWsStatus("connecting");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);

    const ytext = ydoc.getText();
    const publishPresence = () => {
      provider.awareness.setLocalStateField("user", {
        name: displayName,
        color: userColor,
        lastSeen: Date.now(),
      });
    };

    publishPresence();
    const awarenessHeartbeat = window.setInterval(
      publishPresence,
      AWARENESS_HEARTBEAT_MS,
    );
    const peerPresenceCheck = window.setInterval(updatePeerPresence, 1000);

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        editorTheme,
        yCollab(ytext, provider.awareness),
        python(),
      ],
    });

    const view = new EditorView({
      state: state,
      parent: editorContainerRef.current!,
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(awarenessHeartbeat);
      window.clearInterval(peerPresenceCheck);
      provider.awareness.off("change", updatePeerPresence);
      provider.awareness.setLocalState(null);
      view.destroy();
      ydoc.destroy();
      provider.destroy();
    };
  }, [roomId, userColor, displayName, onSessionEnded, onWsStatusChange]);

  return (
    <div className="h-full">
      <div
        id="editor"
        ref={editorContainerRef}
        style={{
          height: "100%",
          minHeight: "400px",
          border: "1px solid black",
        }}
      />
      {!isPeerConnected || !isProviderConnected ? (
        <div className="absolute h-full w-full top-0 left-0 bg-black opacity-90 p-4 rounded shadow flex items-center justify-center">
          <div className="text-red-600 text-lg bg-white p-8 rounded opacity-100">
            {!isProviderConnected
              ? "You are disconnected. Reconnecting to server..."
              : "Peer disconnected. Session will continue when they reconnect."}
          </div>
        </div>
      ) : null}
    </div>
  );
}
