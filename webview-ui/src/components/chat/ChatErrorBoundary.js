import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
/**
 * A reusable error boundary component specifically designed for chat widgets.
 * It provides a consistent error UI with customizable title and body text.
 */
export class ChatErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Error in ChatErrorBoundary:", error.message);
        console.error("Component stack:", errorInfo.componentStack);
    }
    render() {
        const { errorTitle, errorBody, height } = this.props;
        if (this.state.hasError) {
            return (_jsxs("div", { style: {
                    padding: "10px",
                    color: "var(--vscode-errorForeground)",
                    height: height || "auto",
                    maxWidth: "512px",
                    overflow: "auto",
                    border: "1px solid var(--vscode-editorError-foreground)",
                    borderRadius: "4px",
                    backgroundColor: "var(--vscode-inputValidation-errorBackground, rgba(255, 0, 0, 0.1))",
                }, children: [_jsx("h3", { style: { margin: "0 0 8px 0" }, children: errorTitle || "Something went wrong displaying this content" }), _jsx("p", { style: { margin: "0" }, children: errorBody ||
                            `Error: ${this.state.error?.message || "Unknown error"}` })] }));
        }
        return this.props.children;
    }
}
export class ErrorAfterDelay extends React.Component {
    intervalID = null;
    constructor(props) {
        super(props);
        this.state = {
            tickCount: 0,
        };
    }
    componentDidMount() {
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
            }
            else {
                this.setState({
                    tickCount: this.state.tickCount + 1,
                });
            }
        }, 1000);
    }
    componentWillUnmount() {
        if (this.intervalID) {
            clearInterval(this.intervalID);
        }
    }
    render() {
        // Add a small visual indicator that this component will cause an error
        return (_jsxs("div", { style: {
                position: "absolute",
                top: 0,
                right: 0,
                background: "rgba(255, 0, 0, 0.5)",
                color: "var(--vscode-errorForeground)",
                padding: "2px 5px",
                fontSize: "12px",
                borderRadius: "0 0 0 4px",
                zIndex: 100,
            }, children: ["Error in ", this.state.tickCount, "/", this.props.numSecondsToWait ?? 5, " ", "seconds"] }));
    }
}
export default ChatErrorBoundary;
//# sourceMappingURL=ChatErrorBoundary.js.map