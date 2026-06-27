import { useState } from "react";
import OpenAPIVisualEditor from "./OpenAPIVisualEditor";
import { createEmptyOpenAPISpec } from "@thorapi/utils/OpenAPISpecUtils";

const OpenAPIEditorStandalone = () => {
  const [spec, setSpec] = useState(() => createEmptyOpenAPISpec());

  return (
    <main
      style={{
        height: "100vh",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        boxSizing: "border-box",
        background: "var(--vscode-editor-background)",
        color: "var(--vscode-editor-foreground)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          paddingBottom: "12px",
        }}
      >
        <h1 style={{ fontSize: 16, margin: 0 }}>OpenAPI Editor</h1>
      </div>
      <div style={{ minHeight: 0, flex: 1 }}>
        <OpenAPIVisualEditor spec={spec} onChange={setSpec} />
      </div>
    </main>
  );
};

export default OpenAPIEditorStandalone;
