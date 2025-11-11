import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as StompJs from "@stomp/stompjs";
import { useEffect, useState } from "react";
import { Badge, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FiTerminal, FiWifi, FiWifiOff, FiActivity, FiMaximize2, FiMinimize2, FiList } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { WebsocketMessageFromJSON, WebsocketMessageToJSON, WebsocketMessageTypeEnum } from "../../thor/model";
import { WEBSOCKET_URL, isValidWsUrl } from "../../websocket/websocket";
import { useMothership } from "../../context/MothershipContext";
import { addMessage, setConnected } from "./websocketSlice";
import { BASE_PATH } from "@/thor/src";
import SystemAlerts from "@/components/SystemAlerts";
import "./ServerConsole.css";
import { FaPaperPlane } from "react-icons/fa";
import CoolButton from "../CoolButton";
const { Client } = StompJs;
const deriveWsBase = (input) => {
    if (!input)
        return undefined;
    const trimmed = input.trim();
    if (!trimmed)
        return undefined;
    if (/^wss?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    try {
        const url = new URL(trimmed);
        if (url.protocol === "https:" || url.protocol === "http:") {
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        }
        return url.toString();
    }
    catch {
        return undefined;
    }
};
const FALLBACK_WS_BASE = deriveWsBase(BASE_PATH) ?? "ws://localhost:8080";
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
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
    const connected = useAppSelector((state) => state.websocket.connected);
    const messages = useAppSelector((state) => state.websocket.messages);
    const { isConnected: mothershipConnected } = useMothership();
    const dispatch = useAppDispatch();
    // Determine connection state for styling
    const connectionState = isConnecting
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
            }));
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
    const handleInputChange = (e) => {
        setChatText(e.target.value);
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    const sendMessage = () => {
        if (!chatText.trim() || !connected)
            return;
        const message = {
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
        if (isConnecting)
            return 'Connecting...';
        if (connected && mothershipConnected)
            return 'Connected to Mothership';
        if (connected)
            return 'Awaiting Mothership';
        if (mothershipConnected)
            return 'Mothership Connected (console offline)';
        return 'Disconnected';
    };
    const getStatusIcon = () => {
        if (isConnecting)
            return _jsx(FiActivity, {});
        if (connected && mothershipConnected)
            return _jsx(FiWifi, {});
        if (connected)
            return _jsx(FiActivity, {});
        if (mothershipConnected)
            return _jsx(FiWifi, {});
        return _jsx(FiWifiOff, {});
    };
    return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsxs(Card, { className: `server-console ${isCompact ? 'compact' : ''} ${isMaximized ? 'maximized' : ''} connection-${connectionState}`, children: [_jsx(Card.Header, { className: "console-header p-3", children: _jsxs(Row, { className: "align-items-center", children: [_jsx(Col, { children: _jsxs("h6", { className: "console-title d-flex align-items-center mb-0", children: [_jsx(FiTerminal, { className: "icon", size: 18 }), "ValkyrAI Chat"] }) }), _jsx(Col, { xs: "auto", children: _jsxs("div", { className: "connection-status d-flex align-items-center", children: [_jsx("div", { className: `status-icon ${isConnecting ? 'connecting' : ''}`, children: getStatusIcon() }), getStatusText()] }) }), _jsx(Col, { xs: "auto", children: _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(CoolButton, { size: "sm", className: "control-btn", onClick: () => setIsCompact(!isCompact), children: _jsx(FiList, { size: 14 }) }), _jsx(CoolButton, { size: "sm", className: "control-btn", onClick: () => setIsMaximized(!isMaximized), children: isMaximized ? _jsx(FiMinimize2, { size: 14 }) : _jsx(FiMaximize2, { size: 14 }) })] }) })] }) }), _jsx(Card.Body, { className: "messages-container p-0", children: Array.isArray(messages) && messages.length > 0 ? (messages.map((message, index) => {
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
                            const variant = typeMap[type] || "secondary";
                            return (_jsxs("div", { className: "message-row", children: [_jsx(Badge, { className: `message-badge badge-${variant}`, children: type || 'msg' }), _jsx("div", { className: "message-time", children: time ? new Date(time).toLocaleTimeString() : 'now' }), _jsxs("div", { className: "message-user", children: [_jsx("div", { className: "user-avatar", children: message.user?.username?.charAt(0)?.toUpperCase() || '?' }), _jsx("span", { style: { fontSize: '10px', fontWeight: 800 }, children: message.user?.username || 'anon' })] }), _jsx("div", { className: "message-content", children: payload || 'Empty message' })] }, index));
                        })) : (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: _jsx(FiActivity, {}) }), _jsxs("div", { children: ["Waiting for mothership communications...", _jsx("br", {}), _jsx("span", { style: { fontSize: '12px', opacity: 0.6 }, children: "Connect to start receiving real-time updates" })] })] })) }), _jsx(Card.Footer, { className: "input-container", children: _jsxs(InputGroup, { children: [_jsx(Form.Control, { className: "message-input", type: "text", value: chatText, onChange: handleInputChange, onKeyPress: handleKeyPress, placeholder: connected && mothershipConnected
                                        ? "Send message to mothership..."
                                        : connected
                                            ? "Waiting for mothership..."
                                            : "Connecting...", disabled: !connected || !mothershipConnected }), _jsx("button", { style: { cursor: "pointer", padding: "3px", width: "28px", height: "28px", backgroundColor: "darkblue", borderRadius: "14px" }, className: "send-btn", onClick: sendMessage, disabled: !connected || !mothershipConnected || !chatText.trim(), title: "Send Message", children: _jsx(FaPaperPlane, {}) })] }) })] })] }));
};
export default ServerConsole;
//# sourceMappingURL=index.js.map