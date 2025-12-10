import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from "react";
const SWARM_API_BASE = "http://localhost:8080/v1/swarm";
function genMessageId() {
    return Math.random().toString(36).substring(2, 12);
}
/**
 * Get organization ID from auth context.
 * Falls back to 'org-default' if not available.
 */
function getOrganizationId() {
    return window.__valkyr_organizationId || "org-default";
}
// Async fetch helpers
const fetchAgentDiscovery = async (orgId) => {
    try {
        const org = orgId || getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agents/discovery?orgId=${encodeURIComponent(org)}`);
        if (!response.ok)
            throw new Error(`Discovery failed: ${response.status}`);
        return await response.json();
    }
    catch (e) {
        console.warn("Agent discovery failed:", e);
        return [];
    }
};
const fetchAgentHierarchy = async (orgId) => {
    try {
        const org = orgId || getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agents/hierarchy?orgId=${encodeURIComponent(org)}`);
        if (!response.ok)
            throw new Error(`Hierarchy fetch failed: ${response.status}`);
        return await response.json();
    }
    catch (e) {
        console.warn("Hierarchy fetch failed:", e);
        return [];
    }
};
const sendChatMessage = async (agentId, conversationId, message, senderId, senderType = "USER") => {
    try {
        const org = getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agent/${agentId}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                organizationId: org,
                conversationId,
                senderId,
                message,
                senderType,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Chat send failed (${response.status}): ${error}`);
        }
        return await response.json();
    }
    catch (e) {
        console.error("Chat send failed:", e);
        return null;
    }
};
const fetchChatHistory = async (agentId, conversationId, page = 0) => {
    try {
        const org = getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agent/${agentId}/chat/history?organizationId=${encodeURIComponent(org)}&conversationId=${encodeURIComponent(conversationId)}&page=${page}`);
        if (!response.ok)
            throw new Error(`History fetch failed: ${response.status}`);
        const data = await response.json();
        return data.content || data;
    }
    catch (e) {
        console.warn("Chat history fetch failed:", e);
        return [];
    }
};
const fetchBillingStatus = async (organizationId) => {
    try {
        const org = organizationId || getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/billing/status?organizationId=${encodeURIComponent(org)}`);
        if (!response.ok) {
            if (response.status === 402) {
                console.warn("Billing suspended");
            }
            return null;
        }
        return await response.json();
    }
    catch (e) {
        console.warn("Billing status fetch failed:", e);
        return null;
    }
};
/**
 * Parse HTTP error response and generate user-friendly message
 */
function getErrorMessage(status, errorText) {
    switch (status) {
        case 402:
            return "💳 Billing issue: Payment required. Check your account status.";
        case 403:
            return "🔒 Permission denied: You need MULTI_AGENT role to perform this action.";
        case 404:
            return "❌ Resource not found. It may have been deleted.";
        case 409:
            return "⚠️ Conflict: Invalid operation (e.g., circular dependency in hierarchy).";
        case 429:
            return "⏱️ Rate limited: Too many requests. Please wait a moment.";
        case 500:
            return "🚨 Server error: Please try again later or contact support.";
        default:
            return `Error: ${errorText || `HTTP ${status}`}`;
    }
}
const markMessageAsRead = async (messageId, readerId) => {
    try {
        const org = getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/chat/${messageId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organizationId: org, readerId }),
        });
        return response.ok;
    }
    catch (e) {
        console.warn("Mark read failed:", e);
        return false;
    }
};
export const SwarmPanel = () => {
    const [agents, setAgents] = useState([]);
    const [selected, setSelected] = useState(null);
    const [command, setCommand] = useState("ping");
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [activeTab, setActiveTab] = useState("agents");
    const [hierarchy, setHierarchy] = useState([]);
    const chatEndRef = React.useRef(null);
    const chatRefreshIntervalRef = React.useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId] = useState(genMessageId());
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [billingStatus, setBillingStatus] = useState(null);
    const [alerts, setAlerts] = useState([]);
    // Get userId/senderId from window or localStorage
    const getSenderId = useCallback(() => {
        return (window.__valoride_instanceId ||
            localStorage.getItem("valoride_senderId") ||
            "valoride-user-" + Math.random().toString(36).substring(2, 9));
    }, []);
    const addAlert = useCallback((type, message) => {
        const alert = { type, message, timestamp: Date.now() };
        setAlerts((prev) => [...prev, alert]);
        // Auto-dismiss after 5s
        setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.timestamp !== alert.timestamp));
        }, 5000);
    }, []); // Fetch agents from both WebSocket and REST API
    useEffect(() => {
        const refreshAgents = async () => {
            const discovered = await fetchAgentDiscovery();
            if (discovered.length > 0) {
                setAgents(discovered);
            }
        };
        refreshAgents();
        const interval = setInterval(refreshAgents, 5000); // Refresh every 5s
        const onWs = (ev) => {
            try {
                const ce = ev;
                const msg = ce.detail;
                if (!msg || !msg.payload)
                    return;
                let payload = msg.payload;
                if (typeof payload === "string") {
                    try {
                        payload = JSON.parse(payload);
                    }
                    catch {
                        /* ignore */
                    }
                }
                if (payload && payload.agents && Array.isArray(payload.agents)) {
                    setAgents(payload.agents.map((a) => ({
                        id: String(a.id || a.instanceId || a.name || a.key || ""),
                        ...a,
                    })));
                    return;
                }
                if (payload && payload.event === "valor.status" && payload.agents) {
                    setAgents(payload.agents);
                    return;
                }
            }
            catch (e) {
                // ignore
            }
        };
        window.addEventListener("websocket-message", onWs);
        const onHub = (ev) => {
            try {
                const data = ev.data;
                if (data?.type === "P2P:message" &&
                    data.message?.type === "presence:state" &&
                    Array.isArray(data.message.payload?.ids)) {
                    setAgents(data.message.payload.ids.map((id) => ({ id })));
                }
            }
            catch {
                /* ignore */
            }
        };
        window.addEventListener("message", onHub);
        return () => {
            window.removeEventListener("websocket-message", onWs);
            window.removeEventListener("message", onHub);
            clearInterval(interval);
        };
    }, []);
    // Load hierarchy
    useEffect(() => {
        const loadHierarchy = async () => {
            const h = await fetchAgentHierarchy();
            setHierarchy(h);
        };
        loadHierarchy();
    }, []);
    // Load billing status
    useEffect(() => {
        const loadBilling = async () => {
            try {
                const status = await fetchBillingStatus();
                setBillingStatus(status);
                if (status && status.billingStatus === "SUSPENDED") {
                    addAlert("warning", "🚨 Billing suspended - cannot create new agents. Contact support to reactivate.");
                }
                else if (status &&
                    status.activeAgentCount >= status.quotaAgents * 0.8) {
                    addAlert("warning", `⚠️ Quota warning: Using ${Math.round((status.activeAgentCount / status.quotaAgents) * 100)}% of your agent limit.`);
                }
            }
            catch (e) {
                console.error("Billing status load failed:", e);
                addAlert("error", "Failed to load billing status");
            }
        };
        loadBilling();
        const billingInterval = setInterval(loadBilling, 30000); // Refresh every 30s
        return () => clearInterval(billingInterval);
    }, [addAlert]);
    // Load chat history when agent is selected + auto-refresh every 5 seconds
    useEffect(() => {
        if (selected && activeTab === "chat") {
            setIsLoadingChat(true);
            const loadChat = async () => {
                try {
                    const msgs = await fetchChatHistory(selected, conversationId);
                    setChatMessages(msgs);
                    setIsLoadingChat(false);
                    setIsTyping(false);
                }
                catch (e) {
                    console.error("Chat load error:", e);
                    setIsLoadingChat(false);
                }
            };
            loadChat();
            // Set up auto-refresh every 5 seconds
            if (chatRefreshIntervalRef.current)
                clearInterval(chatRefreshIntervalRef.current);
            chatRefreshIntervalRef.current = setInterval(loadChat, 5000);
            return () => {
                if (chatRefreshIntervalRef.current)
                    clearInterval(chatRefreshIntervalRef.current);
            };
        }
        return undefined;
    }, [selected, activeTab, conversationId]);
    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);
    const sendApp = (type, payload) => {
        const appMsg = {
            type,
            payload,
            senderId: window.__valoride_senderId || "valoride-ui",
            messageId: genMessageId(),
            timestamp: Date.now(),
        };
        try {
            window.dispatchEvent(new CustomEvent("websocket-send", { detail: appMsg }));
        }
        catch {
            /* ignore */
        }
        try {
            window
                .acquireVsCodeApi?.()
                ?.postMessage?.({ type: "P2P:send", message: appMsg });
        }
        catch {
            /* ignore */
        }
    };
    const doRollcall = useCallback(() => sendApp("presence:rollcall", {
        id: window.__valoride_instanceId || "ui",
    }), []);
    const sendCommand = useCallback((targetId) => {
        const payload = {
            id: genMessageId(),
            type: "command",
            data: { cmd: command },
            sourceInstanceId: window.__valoride_instanceId || "ui",
            targetInstanceId: targetId,
        };
        sendApp("command", payload);
    }, [command]);
    const handleChatSend = useCallback(async () => {
        if (!chatInput.trim() || !selected)
            return;
        const senderId = getSenderId();
        try {
            const msg = await sendChatMessage(selected, conversationId, chatInput, senderId, "USER");
            if (msg) {
                setChatMessages((prev) => [...prev, msg]);
                setChatInput("");
                addAlert("success", "✉️ Message sent!");
                // Mark as read
                markMessageAsRead(msg.id, senderId);
            }
            else {
                addAlert("error", "❌ Failed to send message - please check connection and try again");
            }
        }
        catch (error) {
            const errorMsg = error?.message || String(error);
            const statusMatch = errorMsg.match(/\((\d+)\)/);
            const status = statusMatch ? parseInt(statusMatch[1]) : 500;
            const friendlyMsg = getErrorMessage(status, errorMsg);
            addAlert("error", friendlyMsg);
        }
    }, [chatInput, selected, conversationId, getSenderId, addAlert]);
    const renderHierarchyTree = (nodes, depth = 0) => {
        return nodes.map((node) => (_jsxs("div", { style: { marginLeft: depth * 20, padding: 4 }, children: [_jsxs("div", { onClick: () => setSelected(node.agentId), style: {
                        cursor: "pointer",
                        padding: 4,
                        backgroundColor: selected === node.agentId ? "#e3f2fd" : "transparent",
                        borderRadius: 4,
                    }, children: ["▶".repeat(Math.max(0, depth)), " ", _jsx("strong", { children: node.agentId }), " ", "(depth: ", node.depth, ")"] }), node.children &&
                    node.children.length > 0 &&
                    renderHierarchyTree(node.children, depth + 1)] }, node.agentId)));
    };
    const filteredAgents = agents.filter((a) => {
        if (!statusFilter)
            return true;
        return (a.status || "ONLINE") === statusFilter;
    });
    const tabStyle = (tab) => ({
        padding: "8px 16px",
        cursor: "pointer",
        borderBottom: activeTab === tab ? "2px solid #2196F3" : "1px solid #ddd",
        fontWeight: activeTab === tab ? "bold" : "normal",
        color: activeTab === tab ? "#2196F3" : "#666",
    });
    return (_jsxs("div", { style: {
            padding: 12,
            fontFamily: "Inter, Arial, sans-serif",
            height: "100%",
            display: "flex",
            flexDirection: "column",
        }, children: [_jsx("h3", { style: { margin: "0 0 12px 0" }, children: "Valor SWARM v2" }), _jsxs("div", { style: {
                    display: "flex",
                    borderBottom: "1px solid #ddd",
                    marginBottom: 12,
                }, children: [_jsxs("div", { onClick: () => setActiveTab("agents"), style: tabStyle("agents"), children: ["Agents (", filteredAgents.length, ")"] }), _jsx("div", { onClick: () => setActiveTab("hierarchy"), style: tabStyle("hierarchy"), children: "Hierarchy" }), _jsx("div", { onClick: () => setActiveTab("chat"), style: tabStyle("chat"), children: "Chat" }), _jsx("div", { onClick: () => setActiveTab("billing"), style: tabStyle("billing"), children: "\uD83D\uDCB0 Billing" })] }), _jsxs("div", { style: {
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }, children: [activeTab === "agents" && (_jsxs("div", { style: { display: "flex", gap: 12, height: "100%" }, children: [_jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("button", { onClick: doRollcall, style: { padding: "4px 12px", marginRight: 8 }, children: "\uD83D\uDD04 Refresh" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), style: { padding: "4px 8px" }, children: [_jsx("option", { value: "", children: "All Status" }), _jsx("option", { value: "ONLINE", children: "ONLINE" }), _jsx("option", { value: "OFFLINE", children: "OFFLINE" }), _jsx("option", { value: "IDLE", children: "IDLE" }), _jsx("option", { value: "BUSY", children: "BUSY" }), _jsx("option", { value: "ERROR", children: "ERROR" })] })] }), _jsx("div", { style: {
                                            flex: 1,
                                            overflowY: "auto",
                                            border: "1px solid #eee",
                                            borderRadius: 4,
                                            padding: 8,
                                        }, children: _jsx("ul", { style: { listStyle: "none", margin: 0, padding: 0 }, children: filteredAgents.map((a) => (_jsxs("li", { onClick: () => setSelected(a.agentId || a.id), style: {
                                                    padding: 8,
                                                    marginBottom: 4,
                                                    backgroundColor: selected === (a.agentId || a.id)
                                                        ? "#e3f2fd"
                                                        : "#f9f9f9",
                                                    border: selected === (a.agentId || a.id)
                                                        ? "2px solid #2196F3"
                                                        : "1px solid #eee",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                }, children: [_jsxs("div", { style: { fontWeight: "bold" }, children: [a.agentId || a.id, _jsx("span", { style: {
                                                                    marginLeft: 8,
                                                                    fontSize: "11px",
                                                                    color: "#999",
                                                                }, children: a.status && `[${a.status}]` })] }), _jsxs("div", { style: { fontSize: 11, color: "#666", marginTop: 4 }, children: [a.username && `👤 ${a.username}`, a.instanceId && ` • ${a.instanceId}`, a.location && ` • 📍 ${a.location}`] }), a.lastSeen && (_jsxs("div", { style: { fontSize: 11, color: "#999", marginTop: 2 }, children: ["Last seen: ", new Date(a.lastSeen).toLocaleTimeString()] }))] }, a.agentId || a.id))) }) })] }), _jsxs("div", { style: { width: 300 }, children: [_jsx("h4", { style: { margin: "0 0 12px 0" }, children: "Commands" }), _jsx("textarea", { value: command, onChange: (e) => setCommand(e.target.value), style: {
                                            width: "100%",
                                            height: 80,
                                            padding: 8,
                                            borderRadius: 4,
                                            border: "1px solid #ddd",
                                            fontFamily: "monospace",
                                            fontSize: 12,
                                        }, placeholder: "Enter command (e.g., ping) or JSON..." }), _jsxs("div", { style: {
                                            marginTop: 8,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                        }, children: [_jsx("button", { onClick: () => sendCommand(selected || undefined), disabled: !selected, style: {
                                                    padding: "8px 12px",
                                                    backgroundColor: selected ? "#4CAF50" : "#ccc",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: selected ? "pointer" : "not-allowed",
                                                }, children: "\uD83D\uDCE4 Send to Selected" }), _jsx("button", { onClick: () => sendCommand(undefined), style: {
                                                    padding: "8px 12px",
                                                    backgroundColor: "#2196F3",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                }, children: "\uD83D\uDCE2 Broadcast" })] })] })] })), activeTab === "hierarchy" && (_jsxs("div", { style: {
                            flex: 1,
                            overflowY: "auto",
                            border: "1px solid #eee",
                            borderRadius: 4,
                            padding: 12,
                        }, children: [_jsx("h4", { style: { marginTop: 0 }, children: "Agent Tree (Max 12 children, 12 levels)" }), hierarchy.length > 0 ? (renderHierarchyTree(hierarchy)) : (_jsx("p", { style: { color: "#999" }, children: "No hierarchy data available" }))] })), activeTab === "chat" && (_jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column" }, children: !selected ? (_jsx("p", { style: { color: "#999", textAlign: "center", padding: 20 }, children: "Select an agent to chat" })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                        flex: 1,
                                        overflowY: "auto",
                                        border: "1px solid #eee",
                                        borderRadius: 4,
                                        padding: 12,
                                        marginBottom: 12,
                                    }, children: isLoadingChat ? (_jsx("p", { style: { color: "#999", textAlign: "center" }, children: "Loading chat history..." })) : chatMessages.length > 0 ? (_jsxs(_Fragment, { children: [chatMessages.map((msg) => (_jsxs("div", { style: {
                                                    marginBottom: 12,
                                                    padding: 8,
                                                    backgroundColor: msg.senderType === "USER" ? "#e3f2fd" : "#f0f0f0",
                                                    borderRadius: 4,
                                                }, children: [_jsxs("div", { style: {
                                                            fontWeight: "bold",
                                                            fontSize: 12,
                                                            color: "#666",
                                                        }, children: [msg.senderType === "USER"
                                                                ? "👤"
                                                                : msg.senderType === "AGENT"
                                                                    ? "🤖"
                                                                    : "⚙️", " ", msg.senderType, msg.readBy && msg.readBy.length > 0 && " ✓✓"] }), _jsx("div", { style: { marginTop: 4 }, children: msg.message }), _jsx("div", { style: {
                                                            fontSize: 11,
                                                            color: "#999",
                                                            marginTop: 4,
                                                        }, children: new Date(msg.timestamp).toLocaleTimeString() })] }, msg.id))), isTyping && (_jsx("div", { style: {
                                                    marginBottom: 12,
                                                    padding: 8,
                                                    backgroundColor: "#f0f0f0",
                                                    borderRadius: 4,
                                                    fontStyle: "italic",
                                                    color: "#999",
                                                }, children: "\uD83E\uDD16 Agent is typing..." })), _jsx("div", { ref: chatEndRef })] })) : (_jsx("p", { style: { color: "#999", textAlign: "center" }, children: "No messages yet" })) }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { type: "text", value: chatInput, onChange: (e) => setChatInput(e.target.value), onKeyDown: (e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleChatSend();
                                                }
                                            }, placeholder: "Type message... (Enter to send)", style: {
                                                flex: 1,
                                                padding: "8px 12px",
                                                border: "1px solid #ddd",
                                                borderRadius: 4,
                                            } }), _jsx("button", { onClick: handleChatSend, disabled: !chatInput.trim(), style: {
                                                padding: "8px 16px",
                                                backgroundColor: chatInput.trim() ? "#4CAF50" : "#ccc",
                                                color: "white",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: chatInput.trim() ? "pointer" : "not-allowed",
                                            }, children: "Send" })] })] })) }))] }), activeTab === "billing" && (_jsx("div", { style: {
                    flex: 1,
                    overflowY: "auto",
                    border: "1px solid #eee",
                    borderRadius: 4,
                    padding: 12,
                }, children: billingStatus ? (_jsxs("div", { children: [_jsx("h4", { style: { marginTop: 0 }, children: "\uD83D\uDCB0 Billing Status" }), billingStatus.activeAgentCount >=
                            billingStatus.quotaAgents * 0.8 && (_jsxs("div", { style: {
                                padding: 12,
                                marginBottom: 16,
                                backgroundColor: billingStatus.activeAgentCount >=
                                    billingStatus.quotaAgents
                                    ? "#ffebee"
                                    : "#fff3e0",
                                borderRadius: 4,
                                border: `2px solid ${billingStatus.activeAgentCount >= billingStatus.quotaAgents ? "#FF6B6B" : "#FF9800"}`,
                            }, children: [_jsx("strong", { children: billingStatus.activeAgentCount >= billingStatus.quotaAgents
                                        ? "🚨 QUOTA EXHAUSTED"
                                        : "⚠️ QUOTA WARNING" }), _jsx("p", { style: { margin: "8px 0 0 0", fontSize: 12 }, children: billingStatus.activeAgentCount >= billingStatus.quotaAgents
                                        ? `You have reached your agent limit (${billingStatus.activeAgentCount}/${billingStatus.quotaAgents}). Upgrade your plan to add more agents.`
                                        : `You are using ${Math.round((billingStatus.activeAgentCount / billingStatus.quotaAgents) * 100)}% of your quota (${billingStatus.activeAgentCount}/${billingStatus.quotaAgents} agents).` })] })), _jsxs("div", { style: {
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                                marginBottom: 16,
                            }, children: [_jsxs("div", { style: {
                                        padding: 12,
                                        backgroundColor: "#f9f9f9",
                                        borderRadius: 4,
                                        border: "1px solid #eee",
                                    }, children: [_jsx("div", { style: { fontSize: 12, color: "#999" }, children: "Active Agents" }), _jsxs("div", { style: {
                                                fontSize: 24,
                                                fontWeight: "bold",
                                                color: "#2196F3",
                                            }, children: [billingStatus.activeAgentCount, "/", billingStatus.quotaAgents] })] }), _jsxs("div", { style: {
                                        padding: 12,
                                        backgroundColor: "#f9f9f9",
                                        borderRadius: 4,
                                        border: "1px solid #eee",
                                    }, children: [_jsx("div", { style: { fontSize: 12, color: "#999" }, children: "Remaining Quota" }), _jsxs("div", { style: {
                                                fontSize: 24,
                                                fontWeight: "bold",
                                                color: billingStatus.remainingQuota > 0
                                                    ? "#4CAF50"
                                                    : "#FF6B6B",
                                            }, children: [billingStatus.remainingQuota, " agents"] })] }), _jsxs("div", { style: {
                                        padding: 12,
                                        backgroundColor: "#f9f9f9",
                                        borderRadius: 4,
                                        border: "1px solid #eee",
                                    }, children: [_jsx("div", { style: { fontSize: 12, color: "#999" }, children: "Total Charges" }), _jsxs("div", { style: {
                                                fontSize: 24,
                                                fontWeight: "bold",
                                                color: "#FF9800",
                                            }, children: ["$", billingStatus.totalCharges.toFixed(2)] })] }), _jsxs("div", { style: {
                                        padding: 12,
                                        backgroundColor: "#f9f9f9",
                                        borderRadius: 4,
                                        border: "1px solid #eee",
                                    }, children: [_jsx("div", { style: { fontSize: 12, color: "#999" }, children: "Status" }), _jsx("div", { style: {
                                                fontSize: 16,
                                                fontWeight: "bold",
                                                color: billingStatus.billingStatus === "ACTIVE"
                                                    ? "#4CAF50"
                                                    : billingStatus.billingStatus === "SUSPENDED"
                                                        ? "#FF6B6B"
                                                        : "#FF9800",
                                            }, children: billingStatus.billingStatus })] })] }), _jsxs("div", { style: {
                                padding: 12,
                                backgroundColor: billingStatus.billingStatus === "ACTIVE"
                                    ? "#e8f5e9"
                                    : "#ffebee",
                                borderRadius: 4,
                                border: `2px solid ${billingStatus.billingStatus === "ACTIVE" ? "#4CAF50" : "#FF6B6B"}`,
                            }, children: [_jsx("strong", { children: billingStatus.billingStatus === "ACTIVE"
                                        ? "✓ Billing Active"
                                        : "✗ Billing Suspended" }), _jsx("p", { style: { margin: "8px 0 0 0", fontSize: 12 }, children: billingStatus.billingStatus === "ACTIVE"
                                        ? `$0.05 per agent instantiation. ${billingStatus.remainingQuota} slots remaining.`
                                        : "Cannot create new agents. Contact support to reactivate." })] }), _jsxs("div", { style: {
                                marginTop: 16,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }, children: [_jsx("button", { onClick: () => {
                                        addAlert("info", "Opening upgrade dialog...");
                                        // TODO: Open billing/upgrade modal
                                    }, style: {
                                        padding: "10px 16px",
                                        backgroundColor: "#FF9800",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                    }, children: "\uD83D\uDCB3 Upgrade Quota" }), _jsx("button", { onClick: () => {
                                        addAlert("info", "Opening billing history...");
                                        // TODO: Open billing history modal
                                    }, style: {
                                        padding: "10px 16px",
                                        backgroundColor: "#2196F3",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                    }, children: "\uD83D\uDCCB View Billing History" })] })] })) : (_jsx("p", { style: { color: "#999", textAlign: "center" }, children: "Loading billing status..." })) })), alerts.length > 0 && (_jsx("div", { style: {
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }, children: alerts.map((alert, idx) => (_jsx("div", { style: {
                        padding: 10,
                        borderRadius: 4,
                        backgroundColor: alert.type === "error"
                            ? "#ffebee"
                            : alert.type === "warning"
                                ? "#fff3e0"
                                : alert.type === "success"
                                    ? "#e8f5e9"
                                    : "#e3f2fd",
                        borderLeft: `4px solid ${alert.type === "error"
                            ? "#FF6B6B"
                            : alert.type === "warning"
                                ? "#FF9800"
                                : alert.type === "success"
                                    ? "#4CAF50"
                                    : "#2196F3"}`,
                        fontSize: 12,
                    }, children: alert.message }, idx))) }))] }));
};
export default SwarmPanel;
//# sourceMappingURL=SwarmPanel.js.map