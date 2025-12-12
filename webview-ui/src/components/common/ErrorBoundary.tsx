import React from "react";
import styled from "styled-components";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

const ErrorContainer = styled.div`
  padding: 12px;
  border-radius: 6px;
  background: rgba(255, 0, 0, 0.06);
  border: 1px solid rgba(255, 0, 0, 0.08);
  color: var(--vscode-editor-foreground);
`;

export class ErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, { hasError: boolean; error?: Error | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, info: any) {
        console.error("ErrorBoundary caught error:", error, info);
        try {
            // Attempt to send diagnostic to extension (if available)
            (window as any)?.vscode?.postMessage?.({
                type: "webviewError",
                text: error?.message,
                payload: info,
            });
        } catch (e) {
            console.error("Failed to post webview error:", e);
        }
    }

    override render() {
        if (this.state.hasError) {
            return (
                <ErrorContainer>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Component failed to render</div>
                    <div style={{ marginBottom: 8 }}>{this.state.error?.message}</div>
                    <div>
                        <VSCodeButton appearance="secondary" onClick={() => location.reload()}>
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
