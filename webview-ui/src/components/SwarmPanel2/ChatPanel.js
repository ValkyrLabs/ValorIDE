import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Empty, Input, List, Space, Typography, message as antdMessage } from "antd";
const { Text } = Typography;
const { TextArea } = Input;
const SWARM_API_BASE = "http://localhost:8080/v1/swarm";
const fetchChatHistory = async (agentId, conversationId) => {
    try {
        const url = new URL(`${SWARM_API_BASE}/agent/${encodeURIComponent(agentId)}/chat/history`);
        url.searchParams.set("conversationId", conversationId);
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`History fetch failed (${response.status})`);
        }
        const payload = await response.json();
        if (Array.isArray(payload)) {
            return payload;
        }
        if (Array.isArray(payload?.content)) {
            return payload.content;
        }
        return [];
    }
    catch (error) {
        console.warn("Failed to fetch chat history", error);
        return [];
    }
};
const sendChatMessage = async (agentId, conversationId, message, senderId) => {
    try {
        const response = await fetch(`${SWARM_API_BASE}/agent/${encodeURIComponent(agentId)}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                conversationId,
                organizationId: window.__valkyr_organizationId || "org-default",
                senderId,
                message,
                senderType: "USER",
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP ${response.status}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.warn("Failed to send chat message", error);
        antdMessage.error("Failed to send message. Please try again.");
        return null;
    }
};
const ChatPanel = ({ agentId, userId, conversationId }) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [draft, setDraft] = useState("");
    const [isSending, setIsSending] = useState(false);
    const containerRef = useRef(null);
    const sortedMessages = useMemo(() => [...messages].sort((a, b) => {
        return a.timestamp - b.timestamp;
    }), [messages]);
    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            const node = containerRef.current;
            if (node) {
                node.scrollTop = node.scrollHeight;
            }
        });
    }, []);
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        fetchChatHistory(agentId, conversationId)
            .then((history) => {
            if (isMounted) {
                setMessages(history);
                scrollToBottom();
            }
        })
            .finally(() => {
            if (isMounted) {
                setIsLoading(false);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [agentId, conversationId, scrollToBottom]);
    useEffect(() => {
        if (!isLoading) {
            scrollToBottom();
        }
    }, [isLoading, sortedMessages, scrollToBottom]);
    const handleSend = async () => {
        const trimmed = draft.trim();
        if (!trimmed) {
            return;
        }
        setIsSending(true);
        const optimisticMessage = {
            id: `local_${Date.now()}`,
            conversationId,
            senderId: userId,
            senderType: "USER",
            message: trimmed,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        setDraft("");
        scrollToBottom();
        const response = await sendChatMessage(agentId, conversationId, trimmed, userId);
        if (response) {
            setMessages((prev) => prev.map((msg) => (msg.id === optimisticMessage.id ? response : msg)));
        }
        else {
            setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
        }
        setIsSending(false);
    };
    return (_jsxs(Card, { className: "swarm-chat-panel", loading: isLoading, children: [_jsx("div", { className: "swarm-chat-history", ref: containerRef, children: sortedMessages.length === 0 && !isLoading ? (_jsx(Empty, { description: "No messages yet. Say hello to this agent!" })) : (_jsx(List, { dataSource: sortedMessages, renderItem: (item) => (_jsx(List.Item, { className: `swarm-chat-message ${item.senderType.toLowerCase()}`, children: _jsxs(Space, { direction: "vertical", size: 0, style: { width: "100%" }, children: [_jsxs(Text, { type: "secondary", children: [item.senderType === "USER" ? "You" : item.senderType, " \u2022", " ", new Date(item.timestamp).toLocaleTimeString()] }), _jsx(Text, { children: item.message })] }) })) })) }), _jsxs("div", { className: "swarm-chat-input", children: [_jsx(TextArea, { autoSize: { minRows: 2, maxRows: 4 }, placeholder: "Type a message\u2026", value: draft, onChange: (event) => setDraft(event.target.value), disabled: isSending }), _jsx(Button, { type: "primary", onClick: handleSend, loading: isSending, disabled: !draft.trim(), children: "Send" })] })] }));
};
export default ChatPanel;
//# sourceMappingURL=ChatPanel.js.map