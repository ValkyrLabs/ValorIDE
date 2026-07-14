import { useCallback, useEffect, useState } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { FiCloud, FiDownload, FiSave } from "react-icons/fi";
import OpenAPIVisualEditor from "./OpenAPIVisualEditor";
import { createEmptyOpenAPISpec } from "@thorapi/utils/OpenAPISpecUtils";
import { vscode } from "@thorapi/utils/vscode";

interface BlueprintBootstrap {
  applicationId?: string;
  applicationName?: string;
  deploymentUrl?: string;
}

interface BlueprintDocument {
  filename: string;
  etag: string;
  specification: Record<string, unknown>;
}

const OpenAPIEditorStandalone = () => {
  const bootstrap = ((window as any).__valorideBlueprint ||
    {}) as BlueprintBootstrap;
  const [spec, setSpec] = useState(() => createEmptyOpenAPISpec());
  const [filename, setFilename] = useState("openapi.yaml");
  const [etag, setEtag] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(Boolean(bootstrap.applicationId));
  const [status, setStatus] = useState(
    bootstrap.applicationId ? "Loading canonical Blueprint..." : "Local draft",
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === "blueprintLoaded") {
        const document = message.document as BlueprintDocument;
        setSpec(document.specification as any);
        setFilename(document.filename || "openapi.yaml");
        setEtag(document.etag);
        setDirty(false);
        setBusy(false);
        setError(undefined);
        setStatus("Canonical Blueprint loaded");
      } else if (message?.type === "blueprintSaved") {
        const document = message.document as BlueprintDocument;
        setSpec(document.specification as any);
        setFilename((current) => document.filename || current);
        setEtag(document.etag);
        setDirty(false);
        setError(undefined);
        setStatus(
          message.regenerating
            ? "Blueprint saved. Regenerating artifacts..."
            : "Blueprint saved to ValkyrAI",
        );
        if (!message.regenerating) setBusy(false);
      } else if (message?.type === "blueprintProgress") {
        setStatus(message.status || "Working...");
      } else if (message?.type === "blueprintGenerated") {
        setBusy(false);
        setStatus(
          `Artifacts downloaded to ${message.artifact?.extractedPath || "thorapi"}`,
        );
      } else if (message?.type === "blueprintError") {
        setBusy(false);
        setError(message.error || "Blueprint operation failed");
      }
    };

    window.addEventListener("message", handleMessage);
    if (bootstrap.applicationId) {
      vscode.postMessage({ type: "blueprintLoad" } as any);
    }
    return () => window.removeEventListener("message", handleMessage);
  }, [bootstrap.applicationId]);

  const handleChange = useCallback((nextSpec: any) => {
    setSpec(nextSpec);
    setDirty(true);
    setStatus("Unsaved Blueprint changes");
  }, []);

  const save = (regenerate: boolean) => {
    if (!bootstrap.applicationId || busy) return;
    setBusy(true);
    setError(undefined);
    setStatus(
      regenerate
        ? "Saving Blueprint before generation..."
        : "Saving Blueprint...",
    );
    vscode.postMessage({
      type: "blueprintSave",
      specification: spec,
      filename,
      expectedEtag: etag,
      regenerate,
    } as any);
  };

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
          minHeight: 32,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 16, margin: 0 }}>
            {bootstrap.applicationName
              ? `Blueprint: ${bootstrap.applicationName}`
              : "Blueprint"}
          </h1>
          <div
            aria-live="polite"
            style={{
              color: error
                ? "var(--vscode-errorForeground)"
                : "var(--vscode-descriptionForeground)",
              fontSize: 12,
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={error || status}
          >
            {busy && (
              <VSCodeProgressRing
                style={{ width: 12, height: 12, marginRight: 6 }}
              />
            )}
            {error || status}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <VSCodeButton
            appearance="secondary"
            role="button"
            aria-label="Save"
            disabled={!bootstrap.applicationId || busy || !dirty}
            onClick={() => save(false)}
            title="Save Blueprint to ValkyrAI"
          >
            <span slot="start">
              <FiSave aria-hidden />
            </span>
            Save
          </VSCodeButton>
          <VSCodeButton
            appearance="primary"
            role="button"
            aria-label="Save and download"
            disabled={!bootstrap.applicationId || busy}
            onClick={() => save(true)}
            title="Save, regenerate, and download artifacts"
          >
            <span slot="start">
              <FiDownload aria-hidden />
            </span>
            Save + Download
          </VSCodeButton>
          <VSCodeButton
            appearance="secondary"
            role="button"
            aria-label="Deploy"
            disabled={!bootstrap.deploymentUrl || busy}
            onClick={() =>
              vscode.postMessage({ type: "blueprintOpenDeployment" } as any)
            }
            title="Manage the Lightsail deployment"
          >
            <span slot="start">
              <FiCloud aria-hidden />
            </span>
            Deploy
          </VSCodeButton>
        </div>
      </div>
      <div style={{ minHeight: 0, flex: 1 }}>
        <OpenAPIVisualEditor spec={spec} onChange={handleChange} />
      </div>
    </main>
  );
};

export default OpenAPIEditorStandalone;
