import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import { yCollab } from "y-codemirror.next";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { useAuth } from "../../context/AuthContext.tsx";

const WEBSOCKET_URL = import.meta.env.VITE_COLLAB_WEBSOCKET_URL;
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

export function CollaborativeEditor({
  roomId,
  onSessionEnded,
}: {
  roomId: string;
  onSessionEnded?: () => void;
}) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();

  const displayName = user?.display_name || user?.username || "Anonymous";
  const userColor = "#0fa0ff";

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WEBSOCKET_URL, roomId, ydoc, {
      params: { token: token || "" },
    });

    const socket = provider.ws;
    if (socket) {
      socket.onclose = (event) => {
        if (event.code === 4000) {
          onSessionEnded?.();
        }
      };
    }

    const ytext = ydoc.getText();
    provider.awareness.setLocalStateField("user", {
      name: displayName,
      color: userColor,
    });

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
      view.destroy();
      ydoc.destroy();
      provider.destroy();
    };
  }, [roomId, userColor, displayName, onSessionEnded, token]);

  return (
    <div
      id="editor"
      ref={editorContainerRef}
      style={{
        height: "100%",
        minHeight: "400px",
        border: "1px solid black",
      }}
    />
  );
}
