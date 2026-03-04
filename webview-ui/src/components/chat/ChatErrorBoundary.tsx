import React from "react";

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  errorTitle?: string;
  errorBody?: string;
  height?: string;
  context?: Record<string, unknown> | string | null;
}

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
}

const stringifyContext = (
  context: Record<string, unknown> | string | null | undefined,
) => {
  if (!context) return undefined;
  if (typeof context === "string") return context;
  try {
    return JSON.stringify(context, null, 2);
  } catch (err) {
    return `Failed to stringify context: ${String(err)}`;
  }
};

/**
 * A reusable error boundary component specifically designed for chat widgets.
 * It provides a consistent error UI with customizable title and body text.
 */
export class ChatErrorBoundary extends React.Component<
  ChatErrorBoundaryProps,
  ChatErrorBoundaryState
> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in ChatErrorBoundary:", error.message);
    console.error("Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
    try {
      const payload = {
        type: "webviewError",
        text: error?.message,
        stack: error?.stack ?? null,
        componentStack: errorInfo?.componentStack ?? null,
        context: stringifyContext(this.props.context),
      };
      (window as any)?.vscode?.postMessage?.(payload);
      if (typeof fetch === "function") {
        fetch("http://localhost:3001/webview-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => { });
      }
    } catch (e) {
      console.error("Failed to capture chat error details", e);
    }
  }

  override render() {
    const { errorTitle, errorBody, height } = this.props;
    const contextString = stringifyContext(this.props.context);

    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "10px",
            color: "var(--vscode-errorForeground)",
            height: height || "auto",
            maxWidth: "512px",
            overflow: "auto",
            border: "1px solid var(--vscode-editorError-foreground)",
            borderRadius: "4px",
            backgroundColor:
              "var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.1))",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>
            {errorTitle || "Something went wrong displaying this content"}
          </h3>
          <p style={{ margin: "0" }}>
            {errorBody ||
              `Error: ${this.state.error?.message || "Unknown error"}`}
          </p>
          {contextString && (
            <details style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              <summary>Context</summary>
              <div>{contextString}</div>
            </details>
          )}
          {this.state.error?.stack && (
            <details style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              <summary>Stack trace</summary>
              <div>{this.state.error.stack}</div>
            </details>
          )}
          {this.state.errorInfo?.componentStack && (
            <details style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              <summary>Component stack</summary>
              <div>{this.state.errorInfo.componentStack}</div>
            </details>
          )}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => location.reload()}>Reload view</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * A demo component that throws an error after a delay.
 * This is useful for testing error boundaries during development
 */
interface ErrorAfterDelayProps {
  numSecondsToWait?: number;
}

interface ErrorAfterDelayState {
  tickCount: number;
}

export class ErrorAfterDelay extends React.Component<
  ErrorAfterDelayProps,
  ErrorAfterDelayState
> {
  private intervalID: NodeJS.Timeout | null = null;

  constructor(props: ErrorAfterDelayProps) {
    super(props);
    this.state = {
      tickCount: 0,
    };
  }

  override componentDidMount() {
    const secondsToWait = this.props.numSecondsToWait ?? 5;

    this.intervalID = setInterval(() => {
      if (this.state.tickCount >= secondsToWait) {
        if (this.intervalID) {
          clearInterval(this.intervalID);
        }
        // Error boundaries don't catch async code :(
        // So this only works by throwing inside of a setState
        this.setState(() => {
          throw new Error("This is an error for testing the error boundary");
        });
      } else {
        this.setState({
          tickCount: this.state.tickCount + 1,
        });
      }
    }, 1000);
  }

  override componentWillUnmount() {
    if (this.intervalID) {
      clearInterval(this.intervalID);
    }
  }

  override render() {
    // Add a small visual indicator that this component will cause an error
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          background: "rgba(255, 0, 0, 0.5)",
          color: "var(--vscode-errorForeground)",
          padding: "2px 5px",
          fontSize: "12px",
          borderRadius: "0 0 0 4px",
          zIndex: 100,
        }}
      >
        Error in {this.state.tickCount}/{this.props.numSecondsToWait ?? 5}{" "}
        seconds
      </div>
    );
  }
}

export default ChatErrorBoundary;
