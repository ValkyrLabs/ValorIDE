import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
const ServerConsole = () => {
    const [connectionStatus, setConnectionStatus] = useState({
        thorConnected: false,
        phase: "disconnected",
    });
    const [messages, setMessages] = useState([]);
    const [logs, setLogs] = useState([]);
    const [testMessage, setTestMessage] = useState("");
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    const addLog = (message) => {
        const timestamp = new Date().toISOString();
        setLogs((prev) => [...prev.slice(-49), `[${timestamp}] ${message}`]);
    };
    useEffect(() => {
        const handleTelecomStatus = (event) => {
            const { thorConnected, phase } = event.detail;
            setConnectionStatus({ thorConnected, phase });
            addLog(`Connection status changed: ${phase} (connected: ${thorConnected})`);
        };
        const handleWebsocketMessage = (event) => {
            const message = event.detail;
            setMessages((prev) => [...prev.slice(-49), message]);
            addLog(`Received message: ${message.type} from ${message.senderId}`);
        };
        window.addEventListener("P2P-status", handleTelecomStatus);
        window.addEventListener("websocket-message", handleWebsocketMessage);
        // Check current JWT token status
        const jwtToken = sessionStorage.getItem("jwtToken");
        if (jwtToken) {
            addLog("JWT token found in sessionStorage");
        }
        else {
            addLog("WARNING: No JWT token found in sessionStorage - connection will fail");
        }
        // Add initial log
        addLog("ServerConsole initialized");
        return () => {
            window.removeEventListener("P2P-status", handleTelecomStatus);
            window.removeEventListener("websocket-message", handleWebsocketMessage);
        };
    }, []);
    useEffect(() => {
        scrollToBottom();
    }, [messages, logs]);
    const handleConnect = () => {
        addLog("Manual connection attempt triggered");
        // The thorBridge should automatically handle connection, but we can trigger a refresh
        const jwtToken = sessionStorage.getItem("jwtToken");
        if (!jwtToken) {
            addLog("ERROR: Cannot connect - No JWT token in sessionStorage");
            return;
        }
        // Trigger a storage event to force reconnection
        window.dispatchEvent(new StorageEvent("storage", {
            key: "jwtToken",
            newValue: jwtToken,
            storageArea: sessionStorage,
        }));
    };
    const handleSendTestMessage = () => {
        if (!testMessage.trim()) {
            addLog("ERROR: Cannot send empty test message");
            return;
        }
        if (!connectionStatus.thorConnected) {
            addLog("ERROR: Cannot send message - not connected to Thor");
            return;
        }
        const appMessage = {
            type: "test-message",
            payload: { content: testMessage },
            senderId: "valoride-console",
            messageId: Math.random().toString(36).slice(2, 12),
            timestamp: Date.now(),
        };
        // Dispatch the send event that thorBridge listens for
        const sendEvent = new CustomEvent("websocket-send", { detail: appMessage });
        window.dispatchEvent(sendEvent);
        addLog(`Sent test message: ${testMessage}`);
        setTestMessage("");
    };
    const getStatusColor = () => {
        switch (connectionStatus.phase) {
            case "connected":
                return "#28a745";
            case "connecting":
                return "#ffc107";
            case "error":
                return "#dc3545";
            case "disconnected":
            default:
                return "#6c757d";
        }
    };
    return (_jsxs("div", { style: {
            padding: "20px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            backgroundColor: "var(--vscode-editor-background)",
            color: "var(--vscode-editor-foreground)",
        }, children: [_jsxs("div", { style: { borderBottom: "1px solid var(--vscode-panel-border)", paddingBottom: "10px" }, children: [_jsx("h2", { style: { margin: "0 0 10px 0" }, children: "Server Console & WebSocket Testing" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }, children: [_jsx("div", { style: {
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: getStatusColor(),
                                } }), _jsxs("span", { children: ["Status: ", connectionStatus.phase] }), _jsxs("span", { style: { opacity: 0.7 }, children: ["(Thor Connected: ", connectionStatus.thorConnected ? "Yes" : "No", ")"] })] }), _jsx(VSCodeButton, { onClick: handleConnect, children: connectionStatus.phase === "connected" ? "Reconnect" : "Connect" })] }), _jsxs("div", { style: { flex: "1", display: "flex", gap: "20px", minHeight: 0 }, children: [_jsxs("div", { style: { flex: "1", display: "flex", flexDirection: "column", minHeight: 0 }, children: [_jsx("h3", { style: { margin: "0 0 10px 0" }, children: "Connection Logs" }), _jsxs("div", { style: {
                                    flex: "1",
                                    border: "1px solid var(--vscode-panel-border)",
                                    borderRadius: "4px",
                                    padding: "10px",
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    overflowY: "auto",
                                    backgroundColor: "var(--vscode-terminal-background)",
                                    color: "var(--vscode-terminal-foreground)",
                                }, children: [logs.map((log, index) => (_jsx("div", { style: { marginBottom: "4px", whiteSpace: "pre-wrap" }, children: log }, index))), _jsx("div", { ref: messagesEndRef })] })] }), _jsxs("div", { style: { flex: "1", display: "flex", flexDirection: "column", minHeight: 0 }, children: [_jsxs("h3", { style: { margin: "0 0 10px 0" }, children: ["WebSocket Messages (", messages.length, ")"] }), _jsxs("div", { style: {
                                    flex: "1",
                                    border: "1px solid var(--vscode-panel-border)",
                                    borderRadius: "4px",
                                    padding: "10px",
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    overflowY: "auto",
                                    backgroundColor: "var(--vscode-terminal-background)",
                                    color: "var(--vscode-terminal-foreground)",
                                }, children: [messages.map((message, index) => (_jsxs("div", { style: {
                                            marginBottom: "8px",
                                            padding: "4px",
                                            border: "1px solid var(--vscode-panel-border)",
                                            borderRadius: "2px",
                                            backgroundColor: "var(--vscode-editor-background)",
                                        }, children: [_jsxs("div", { style: { color: "#569cd6" }, children: ["Type: ", message.type, " | From: ", message.senderId] }), _jsxs("div", { style: { color: "#608b4e", fontSize: "11px" }, children: ["ID: ", message.messageId, " | Time: ", new Date(message.timestamp).toLocaleTimeString()] }), _jsxs("div", { style: { marginTop: "4px", wordBreak: "break-word" }, children: [_jsx("strong", { children: "Payload:" }), " ", JSON.stringify(message.payload, null, 2)] })] }, index))), _jsx("div", { ref: messagesEndRef })] })] })] }), _jsxs("div", { style: { borderTop: "1px solid var(--vscode-panel-border)", paddingTop: "10px" }, children: [_jsx("h3", { style: { margin: "0 0 10px 0" }, children: "Send Test Message" }), _jsxs("div", { style: { display: "flex", gap: "10px", alignItems: "flex-end" }, children: [_jsx("div", { style: { flex: "1" }, children: _jsx(VSCodeTextArea, { value: testMessage, onChange: (e) => setTestMessage(e.target.value), placeholder: "Enter test message content...", rows: 2, style: { width: "100%" } }) }), _jsx(VSCodeButton, { onClick: handleSendTestMessage, disabled: !connectionStatus.thorConnected || !testMessage.trim(), children: "Send Test" })] }), !connectionStatus.thorConnected && (_jsx("div", { style: { color: "#dc3545", fontSize: "12px", marginTop: "5px" }, children: "Must be connected to send messages" }))] })] }));
};
export default ServerConsole;
//# sourceMappingURL=ServerConsole.js.map