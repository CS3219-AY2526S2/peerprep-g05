import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
});

export default function CollaborativeEditor() {
  const editorContainerRef = useRef(null);
  useEffect(() => {
    const view = new EditorView({
      doc: "print('Hi')",
      parent: editorContainerRef.current || undefined,
      extensions: [basicSetup, editorTheme],
    });
    return () => view.destroy();
  }, []);
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
