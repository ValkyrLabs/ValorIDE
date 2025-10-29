import * as StompJs from "@stomp/stompjs";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FiTerminal, FiWifi, FiWifiOff, FiActivity, FiMaximize2, FiMinimize2, FiList } from "react-icons/fi";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "../../redux/store";
import { WebsocketMessage, WebsocketMessageFromJSON, WebsocketMessageToJSON, WebsocketMessageTypeEnum } from "../../thor/model";
import { WEBSOCKET_URL, isValidWsUrl } from "../../websocket/websocket";
import { useMothership } from "../../context/MothershipContext";
import { addMessage, setConnected } from "./websocketSlice";
import { BASE_PATH } from "@/thor/src";
import SystemAlerts from "@/components/SystemAlerts";
import "./ServerConsole.css";
import { FaPaperPlane } from "react-icons/fa";
import CoolButton from "../CoolButton";

const { Client } = StompJs;

const deriveWsBase = (input?: string): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") {
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    }
    return url.toString();
  } catch {
    return undefined;
  }
};

const FALLBACK_WS_BASE = deriveWsBase(BASE_PATH) ?? "ws://localhost:8080";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Create client without brokerURL; we will configure it once URL is validated.
const stompClient = new Client({
  reconnectDelay: 5000,
  onConnect: () => {
    console.log("Connected to WebSocket");
  },
  onDisconnect: () => {
    console.log("Disconnected from WebSocket");
  },
  onStompError: (frame) => {
    console.error("Broker reported error: " + frame.headers["message"]);
    console.error("Additional details: " + frame.body);
  },
});

const ServerConsole = () => {
  const [isMaximized, setIsMaximized] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [chatText, setChatText] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const connected = useAppSelector((state: RootState) => state.websocket.connected);
  const messages = useAppSelector((state: RootState) => state.websocket.messages);
  const { isConnected: mothershipConnected } = useMothership();

  const dispatch = useAppDispatch();

  // Determine connection state for styling
  const connectionState: 'happy' | 'sad' | 'waiting' =
    isConnecting
      ? 'waiting'
      : connected && mothershipConnected
        ? 'happy'
        : connected
          ? 'waiting'
          : 'sad';

  useEffect(() => {
    const socketUrl = isValidWsUrl(WEBSOCKET_URL) ? WEBSOCKET_URL : FALLBACK_WS_BASE;
    if (!isValidWsUrl(socketUrl)) {
      console.warn("ServerConsole: WebSocket disabled (missing or invalid VITE_wssBasePath/base path).");
      dispatch(setConnected(false));
      dispatch(addMessage({
        type: "console",
        payload: "WebSocket disabled: configure VITE_wssBasePath or ensure VITE_basePath is an http(s) URL.",
        createdDate: new Date(),
      } as any));
      return undefined;
    }

    setIsConnecting(true);

    stompClient.configure({
      brokerURL: socketUrl,
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnecting(false);
        dispatch(setConnected(true));

        stompClient.subscribe("/topic/statuses", (message) => {
          const parsedMessage = WebsocketMessageFromJSON(JSON.parse(message.body));
          dispatch(addMessage(parsedMessage));
        });

        stompClient.subscribe("/topic/messages", (message) => {
          const parsedMessage = WebsocketMessageFromJSON(JSON.parse(message.body));
          dispatch(addMessage(parsedMessage));
        });
      },
      onDisconnect: () => {
        setIsConnecting(false);
        dispatch(setConnected(false));
      },
      onStompError: (frame) => {
        setIsConnecting(false);
        dispatch(setConnected(false));
        console.error("Broker error: " + frame.headers["message"]);
        console.error("Details: " + frame.body);
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatText(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = () => {
    if (!chatText.trim() || !connected) return;

    const message: WebsocketMessage = {
      type: WebsocketMessageTypeEnum.USER,
      payload: chatText.trim(),
    };

    stompClient.publish({
      destination: "/app/chat",
      body: JSON.stringify(WebsocketMessageToJSON(message)),
    });

    setChatText("");
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (connected && mothershipConnected) return 'Connected to Mothership';
    if (connected) return 'Awaiting Mothership';
    if (mothershipConnected) return 'Mothership Connected (console offline)';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnecting) return <FiActivity />;
    if (connected && mothershipConnected) return <FiWifi />;
    if (connected) return <FiActivity />;
    if (mothershipConnected) return <FiWifi />;
    return <FiWifiOff />;
  };

  return (
    <>
      <SystemAlerts />
      <Card className={`server-console ${isCompact ? 'compact' : ''} ${isMaximized ? 'maximized' : ''} connection-${connectionState}`}>
        <Card.Header className="console-header p-3">
          <Row className="align-items-center">
            <Col>
              <h6 className="console-title d-flex align-items-center mb-0">
                <FiTerminal className="icon" size={18} />
                ValkyrAI Chat
              </h6>
            </Col>
            <Col xs="auto">
              <div className="connection-status d-flex align-items-center">
                <div className={`status-icon ${isConnecting ? 'connecting' : ''}`}>
                  {getStatusIcon()}
                </div>
                {getStatusText()}
              </div>
            </Col>
            <Col xs="auto">
              <div style={{ display: 'flex', gap: 8 }}>
                <CoolButton
                  size="sm"
                  className="control-btn"
                  onClick={() => setIsCompact(!isCompact)}
                // title={isCompact ? 'Disable compact' : 'Enable compact'}
                >
                  <FiList size={14} />
                </CoolButton>

                <CoolButton
                  size="sm"
                  className="control-btn"
                  onClick={() => setIsMaximized(!isMaximized)}
                // title={isMaximized ? 'Minimize' : 'Maximize'}
                >
                  {isMaximized ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
                </CoolButton>
              </div>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="messages-container p-0">
          {Array.isArray(messages) && messages.length > 0 ? (
            messages.map((message: WebsocketMessage, index: number) => {
              const { payload, time, type } = message;
              const typeMap = {
                error: "danger",
                warn: "warning",
                success: "success",
                agent: "info",
                broadcast: "info",
                console: "info",
                debug: "info",
                info: "info",
                private: "info",
                room: "info",
                secure: "info",
                service: "info",
                user: "info",
              };

              const variant = typeMap[type as keyof typeof typeMap] || "secondary";

              return (
                <div key={index} className="message-row">
                  <Badge className={`message-badge badge-${variant}`}>
                    {type || 'msg'}
                  </Badge>

                  <div className="message-time">
                    {time ? new Date(time).toLocaleTimeString() : 'now'}
                  </div>

                  <div className="message-user">
                    <div className="user-avatar">
                      {message.user?.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800 }}>
                      {message.user?.username || 'anon'}
                    </span>
                  </div>

                  <div className="message-content">
                    {payload || 'Empty message'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <FiActivity />
              </div>
              <div>
                Waiting for mothership communications...
                <br />
                <span style={{ fontSize: '12px', opacity: 0.6 }}>
                  Connect to start receiving real-time updates
                </span>
              </div>
            </div>
          )}
        </Card.Body>

        <Card.Footer className="input-container">
          <InputGroup>
            <Form.Control
              className="message-input"
              type="text"
              value={chatText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                connected && mothershipConnected
                  ? "Send message to mothership..."
                  : connected
                    ? "Waiting for mothership..."
                    : "Connecting..."
              }
              disabled={!connected || !mothershipConnected}
            />

            <button
              style={{ cursor: "pointer", padding: "3px", width: "28px", height: "28px", backgroundColor: "darkblue", borderRadius: "14px" }}
              className="send-btn"
              onClick={sendMessage}
              disabled={!connected || !mothershipConnected || !chatText.trim()}
              title="Send Message"
            >
              <FaPaperPlane />
            </button>
          </InputGroup>
        </Card.Footer>
      </Card>
    </>
  );
};

export default ServerConsole;
