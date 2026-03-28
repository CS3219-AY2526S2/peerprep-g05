import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import { yCollab } from "y-codemirror.next";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;
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

export function CollaborativeEditor({ roomId }: { roomId: string }) {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WEBSOCKET_URL, roomId, ydoc);

    const ytext = ydoc.getText();
    provider.awareness.setLocalStateField("user", {
      name: "User1",
      color: "#ccc",
    });

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [basicSetup, editorTheme, yCollab(ytext, provider.awareness)],
    });

    const view = new EditorView({
      state: state,
      parent: editorContainerRef.current!,
    });

    return () => {
      view.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

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
