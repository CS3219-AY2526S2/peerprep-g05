import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { yCollab } from "y-codemirror.next";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
});

export default function CollaborativeEditor() {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const { roomId } = useParams();
  if (!roomId) {
    return <div>Room ID is required</div>;
  }

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      "ws://localhost:51392",
      roomId,
      ydoc,
    );
    provider;

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
