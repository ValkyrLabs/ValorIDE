import React from "react";
import styled from "styled-components";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@thorapi/utils/vscode";

const ErrorContainer = styled.div`
  padding: 12px;
  border-radius: 6px;
  background: rgba(255, 0, 0, 0.06);
  border: 1px solid rgba(255, 0, 0, 0.08);
  color: var(--vscode-editor-foreground);
`;

type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  context?: Record<string, unknown> | string | null;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
};

function safeStringifyContext(
  context: Record<string, unknown> | string | null | undefined,
): string | undefined {
  if (!context) return undefined;
  if (typeof context === "string") return context;
  try {
    return JSON.stringify(context, null, 2);
  } catch (err) {
    return `Failed to stringify context: ${String(err)}`;
  }
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    const contextString = safeStringifyContext(this.props.context);
    console.error("ErrorBoundary caught error:", error, info, {
      context: this.props.context,
    });

    this.setState({ errorInfo: info });

    try {
      const payload = {
        type: "webviewError",
        text: error?.message,
        info: info?.componentStack || info || null,
        stack: error?.stack || null,
        context: contextString,
      };
      try {
        vscode.postMessage(payload as any);
      } catch {
        // ignore
      }

      const isVsCodeWebview =
        typeof (globalThis as any).acquireVsCodeApi === "function";
      if (isVsCodeWebview) return;

      // Attempt multiple transports in dev/preview mode (outside VS Code).
      const sendPayload = (p: any) => {
        try {
          if (typeof fetch === "function") {
            fetch("http://localhost:3001/webview-error", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(p),
            }).catch(() => {});
            return;
          }
        } catch (e) {}
        try {
          if (typeof navigator !== "undefined" && typeof (navigator as any).sendBeacon === "function") {
            const blob = new Blob([JSON.stringify(p)], { type: "application/json" });
            (navigator as any).sendBeacon("http://localhost:3001/webview-error", blob);
            return;
          }
        } catch (e) {}
        try {
          const img = new Image();
          img.src = "http://localhost:3001/webview-error?payload=" + encodeURIComponent(JSON.stringify(p));
        } catch (e) {}
      };

      sendPayload(payload);
    } catch (e) {
      console.error("Failed to post webview error:", e);
    }
  }

  override render() {
    const contextString = safeStringifyContext(this.props.context);

    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {this.props.title || "Component failed to render"}
          </div>
          <div style={{ marginBottom: 8 }}>{this.state.error?.message}</div>
          {contextString && (
            <details style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
              <summary>Context</summary>
              <div>{contextString}</div>
            </details>
          )}
          {this.state.error?.stack && (
            <details style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
              <summary>Stack trace</summary>
              <div>{this.state.error.stack}</div>
            </details>
          )}
          {this.state.errorInfo?.componentStack && (
            <details style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>
              <summary>Component stack</summary>
              <div>{this.state.errorInfo.componentStack}</div>
            </details>
          )}
          <div>
            <VSCodeButton
              appearance="secondary"
              onClick={() => location.reload()}
            >
              Reload View
            </VSCodeButton>
          </div>
        </ErrorContainer>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;
