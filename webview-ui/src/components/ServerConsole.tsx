import React, { useState, useEffect, useRef, useCallback } from "react";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";

interface ConnectionStatus {
  thorConnected: boolean;
  phase: "connecting" | "connected" | "disconnected" | "error";
}

interface AppMessage {
  type: string;
  payload: any;
  senderId: string;
  messageId: string;
  timestamp: number;
}

const ServerConsole: React.FC = () => {
  const { jwtToken, authenticatedUser } = useExtensionState();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    thorConnected: false,
    phase: "disconnected",
  });
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const lastAuthLogRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    setLogs((prev) => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  }, []);

  useEffect(() => {
    const handleTelecomStatus = (event: CustomEvent) => {
      const { thorConnected, phase } = event.detail;
      setConnectionStatus({ thorConnected, phase });
      addLog(
        `Connection status changed: ${phase} (connected: ${thorConnected})`,
      );
    };

    const handleWebsocketMessage = (event: CustomEvent<AppMessage>) => {
      const message = event.detail;
      setMessages((prev) => [...prev.slice(-49), message]);
      addLog(`Received message: ${message.type} from ${message.senderId}`);
    };

    window.addEventListener("P2P-status", handleTelecomStatus as EventListener);
    window.addEventListener(
      "websocket-message",
      handleWebsocketMessage as EventListener,
    );

    if (!initializedRef.current) {
      addLog("ServerConsole initialized");
      initializedRef.current = true;
    }

    return () => {
      window.removeEventListener(
        "P2P-status",
        handleTelecomStatus as EventListener,
      );
      window.removeEventListener(
        "websocket-message",
        handleWebsocketMessage as EventListener,
      );
    };
  }, [addLog]);

  useEffect(() => {
    const userKey =
      authenticatedUser?.username ||
      authenticatedUser?.email ||
      authenticatedUser?.id ||
      "";
    const authKey = jwtToken ? `token:${userKey || "available"}` : "none";
    if (lastAuthLogRef.current === authKey) {
      return;
    }
    lastAuthLogRef.current = authKey;

    if (jwtToken && authenticatedUser) {
      addLog(
        `Authenticated as ${authenticatedUser.username || authenticatedUser.email || authenticatedUser.id} - cookie session active`,
      );
    } else if (jwtToken) {
      addLog("JWT token available - cookie session should be active");
    } else {
      addLog(
        "WARNING: No active authentication session - connection will fail",
      );
    }
  }, [
    addLog,
    authenticatedUser?.email,
    authenticatedUser?.id,
    authenticatedUser?.username,
    jwtToken,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, logs]);

  const handleConnect = () => {
    addLog("Manual connection attempt triggered");

    // Check if authenticated with cookie session
    if (!jwtToken && !authenticatedUser) {
      addLog(
        "ERROR: Cannot connect - no active authentication session (cookie not available)",
      );
      return;
    }

    // Trigger a jwt-token-updated event to force reconnection via cookie session
    window.dispatchEvent(
      new CustomEvent("jwt-token-updated", {
        detail: {
          token: jwtToken,
          timestamp: Date.now(),
          source: "manual-reconnect",
        },
      }),
    );
    addLog("Connection request sent - using cookie session for authentication");
  };

  const handleSendTestMessage = () => {
    if (!testMessage.trim()) {
      addLog("ERROR: Cannot send empty test message");
      return;
    }

    if (!connectionStatus.thorConnected) {
      addLog("ERROR: Cannot send message - not connected to ThorAPI");
      return;
    }

    const appMessage: AppMessage = {
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

  return (
    <div
      style={{
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        backgroundColor: "var(--vscode-editor-background)",
        color: "var(--vscode-editor-foreground)",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--vscode-panel-border)",
          paddingBottom: "10px",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0" }}>
          Server Console & WebSocket Testing
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: getStatusColor(),
            }}
          />
          <span>Status: {connectionStatus.phase}</span>
          <span style={{ opacity: 0.7 }}>
            (ThorAPI Connected: {connectionStatus.thorConnected ? "Yes" : "No"})
          </span>
        </div>
        <VSCodeButton onClick={handleConnect}>
          {connectionStatus.phase === "connected" ? "Reconnect" : "Connect"}
        </VSCodeButton>
      </div>

      <div style={{ flex: "1", display: "flex", gap: "20px", minHeight: 0 }}>
        {/* Connection Logs */}
        <div
          style={{
            flex: "1",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>Connection Logs</h3>
          <div
            style={{
              flex: "1",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: "4px",
              padding: "10px",
              fontFamily: "monospace",
              fontSize: "12px",
              overflowY: "auto",
              backgroundColor: "var(--vscode-terminal-background)",
              color: "var(--vscode-terminal-foreground)",
            }}
          >
            {logs.map((log, index) => (
              <div
                key={index}
                style={{ marginBottom: "4px", whiteSpace: "pre-wrap" }}
              >
                {log}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* WebSocket Messages */}
        <div
          style={{
            flex: "1",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>
            WebSocket Messages ({messages.length})
          </h3>
          <div
            style={{
              flex: "1",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: "4px",
              padding: "10px",
              fontFamily: "monospace",
              fontSize: "12px",
              overflowY: "auto",
              backgroundColor: "var(--vscode-terminal-background)",
              color: "var(--vscode-terminal-foreground)",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "8px",
                  padding: "4px",
                  border: "1px solid var(--vscode-panel-border)",
                  borderRadius: "2px",
                  backgroundColor: "var(--vscode-editor-background)",
                }}
              >
                <div style={{ color: "#569cd6" }}>
                  Type: {message.type} | From: {message.senderId}
                </div>
                <div style={{ color: "#608b4e", fontSize: "11px" }}>
                  ID: {message.messageId} | Time:{" "}
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ marginTop: "4px", wordBreak: "break-word" }}>
                  <strong>Payload:</strong>{" "}
                  {JSON.stringify(message.payload, null, 2)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Test Message Sender */}
      <div
        style={{
          borderTop: "1px solid var(--vscode-panel-border)",
          paddingTop: "10px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0" }}>Send Test Message</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: "1" }}>
            <VSCodeTextArea
              value={testMessage}
              onChange={(e: any) => setTestMessage(e.target.value)}
              placeholder="Enter test message content..."
              rows={2}
              style={{ width: "100%" }}
            />
          </div>
          <VSCodeButton
            onClick={handleSendTestMessage}
            disabled={!connectionStatus.thorConnected || !testMessage.trim()}
          >
            Send Test
          </VSCodeButton>
        </div>
        {!connectionStatus.thorConnected && (
          <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "5px" }}>
            Must be connected to send messages
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerConsole;
