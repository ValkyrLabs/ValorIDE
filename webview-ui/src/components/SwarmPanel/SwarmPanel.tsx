import React, { useEffect, useState, useCallback } from 'react';

type AgentMeta = {
    id: string;
    userId?: string;
    version?: string;
    lastSeen?: string;
    status?: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'BUSY' | 'ERROR';
    location?: string;
    agentId?: string;
    instanceId?: string;
    username?: string;
    [k: string]: any;
};

type ChatMessage = {
    id: string;
    conversationId: string;
    senderId: string;
    senderType: 'AGENT' | 'USER' | 'SYSTEM';
    message: string;
    timestamp: number;
    readBy?: string[];
};

type AgentHierarchy = {
    agentId: string;
    parentAgentId?: string;
    children?: AgentHierarchy[];
    depth: number;
};

type BillingStatus = {
    activeAgentCount: number;
    quotaAgents: number;
    totalCharges: number;
    billingStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
    remainingQuota: number;
};

type ErrorAlert = {
    type: 'error' | 'warning' | 'success' | 'info';
    message: string;
    timestamp: number;
};

const SWARM_API_BASE = 'http://localhost:8080/v1/swarm';

function genMessageId() {
    return Math.random().toString(36).substring(2, 12);
}

/**
 * Get organization ID from auth context.
 * Falls back to 'org-default' if not available.
 */
function getOrganizationId(): string {
    return (window as any).__valkyr_organizationId || 'org-default';
}

// Async fetch helpers
const fetchAgentDiscovery = async (orgId?: string): Promise<AgentMeta[]> => {
    try {
        const org = orgId || getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agents/discovery?orgId=${encodeURIComponent(org)}`);
        if (!response.ok) throw new Error(`Discovery failed: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.warn('Agent discovery failed:', e);
        return [];
    }
};

const fetchAgentHierarchy = async (orgId?: string): Promise<AgentHierarchy[]> => {
    try {
        const org = orgId || getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agents/hierarchy?orgId=${encodeURIComponent(org)}`);
        if (!response.ok) throw new Error(`Hierarchy fetch failed: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.warn('Hierarchy fetch failed:', e);
        return [];
    }
};

const sendChatMessage = async (
    agentId: string,
    conversationId: string,
    message: string,
    senderId: string,
    senderType: 'USER' | 'AGENT' | 'SYSTEM' = 'USER'
): Promise<ChatMessage | null> => {
    try {
        const org = getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/agent/${agentId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId: org, conversationId, senderId, message, senderType }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Chat send failed (${response.status}): ${error}`);
        }
        return await response.json();
    } catch (e) {
        console.error('Chat send failed:', e);
        return null;
    }
};

const fetchChatHistory = async (
    agentId: string,
    conversationId: string,
    page: number = 0
): Promise<ChatMessage[]> => {
    try {
        const org = getOrganizationId();
        const response = await fetch(
            `${SWARM_API_BASE}/agent/${agentId}/chat/history?organizationId=${encodeURIComponent(org)}&conversationId=${encodeURIComponent(conversationId)}&page=${page}`
        );
        if (!response.ok) throw new Error(`History fetch failed: ${response.status}`);
        const data = await response.json();
        return data.content || data;
    } catch (e) {
        console.warn('Chat history fetch failed:', e);
        return [];
    }
};

const fetchBillingStatus = async (organizationId?: string): Promise<BillingStatus | null> => {
    try {
        const org = organizationId || getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/billing/status?organizationId=${encodeURIComponent(org)}`);
        if (!response.ok) {
            if (response.status === 402) {
                console.warn('Billing suspended');
            }
            return null;
        }
        return await response.json();
    } catch (e) {
        console.warn('Billing status fetch failed:', e);
        return null;
    }
};

/**
 * Parse HTTP error response and generate user-friendly message
 */
function getErrorMessage(status: number, errorText: string): string {
    switch (status) {
        case 402:
            return '💳 Billing issue: Payment required. Check your account status.';
        case 403:
            return '🔒 Permission denied: You need MULTI_AGENT role to perform this action.';
        case 404:
            return '❌ Resource not found. It may have been deleted.';
        case 409:
            return '⚠️ Conflict: Invalid operation (e.g., circular dependency in hierarchy).';
        case 429:
            return '⏱️ Rate limited: Too many requests. Please wait a moment.';
        case 500:
            return '🚨 Server error: Please try again later or contact support.';
        default:
            return `Error: ${errorText || `HTTP ${status}`}`;
    }
}

const markMessageAsRead = async (messageId: string, readerId: string): Promise<boolean> => {
    try {
        const org = getOrganizationId();
        const response = await fetch(`${SWARM_API_BASE}/chat/${messageId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId: org, readerId }),
        });
        return response.ok;
    } catch (e) {
        console.warn('Mark read failed:', e);
        return false;
    }
};

export const SwarmPanel: React.FC = () => {
    const [agents, setAgents] = useState<AgentMeta[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [command, setCommand] = useState<string>('ping');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'agents' | 'chat' | 'hierarchy' | 'billing'>('agents');
    const [hierarchy, setHierarchy] = useState<AgentHierarchy[]>([]);
    const chatEndRef = React.useRef<HTMLDivElement>(null);
    const chatRefreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId] = useState<string>(genMessageId());
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
    const [alerts, setAlerts] = useState<ErrorAlert[]>([]);

    // Get userId/senderId from window or localStorage
    const getSenderId = useCallback(() => {
        return (window as any).__valoride_instanceId ||
            localStorage.getItem('valoride_senderId') ||
            'valoride-user-' + Math.random().toString(36).substring(2, 9);
    }, []);

    const addAlert = useCallback((type: ErrorAlert['type'], message: string) => {
        const alert: ErrorAlert = { type, message, timestamp: Date.now() };
        setAlerts((prev) => [...prev, alert]);
        // Auto-dismiss after 5s
        setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.timestamp !== alert.timestamp));
        }, 5000);
    }, []);    // Fetch agents from both WebSocket and REST API
    useEffect(() => {
        const refreshAgents = async () => {
            const discovered = await fetchAgentDiscovery();
            if (discovered.length > 0) {
                setAgents(discovered);
            }
        };

        refreshAgents();
        const interval = setInterval(refreshAgents, 5000); // Refresh every 5s

        const onWs = (ev: Event) => {
            try {
                const ce = ev as CustomEvent;
                const msg = ce.detail;
                if (!msg || !msg.payload) return;
                let payload: any = msg.payload;
                if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload); } catch { /* ignore */ }
                }

                if (payload && payload.agents && Array.isArray(payload.agents)) {
                    setAgents(payload.agents.map((a: any) => ({ id: String(a.id || a.instanceId || a.name || a.key || ''), ...a })));
                    return;
                }

                if (payload && payload.event === 'valor.status' && payload.agents) {
                    setAgents(payload.agents);
                    return;
                }
            } catch (e) {
                // ignore
            }
        };

        window.addEventListener('websocket-message', onWs as EventListener);
        const onHub = (ev: MessageEvent) => {
            try {
                const data = ev.data;
                if (data?.type === 'P2P:message' && data.message?.type === 'presence:state' && Array.isArray(data.message.payload?.ids)) {
                    setAgents(data.message.payload.ids.map((id: string) => ({ id })));
                }
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('message', onHub);

        return () => {
            window.removeEventListener('websocket-message', onWs as EventListener);
            window.removeEventListener('message', onHub);
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
                if (status && status.billingStatus === 'SUSPENDED') {
                    addAlert('warning', '🚨 Billing suspended - cannot create new agents. Contact support to reactivate.');
                } else if (status && status.activeAgentCount >= status.quotaAgents * 0.8) {
                    addAlert('warning', `⚠️ Quota warning: Using ${Math.round((status.activeAgentCount / status.quotaAgents) * 100)}% of your agent limit.`);
                }
            } catch (e) {
                console.error('Billing status load failed:', e);
                addAlert('error', 'Failed to load billing status');
            }
        };
        loadBilling();
        const billingInterval = setInterval(loadBilling, 30000); // Refresh every 30s
        return () => clearInterval(billingInterval);
    }, [addAlert]);

    // Load chat history when agent is selected + auto-refresh every 5 seconds
    useEffect(() => {
        if (selected && activeTab === 'chat') {
            setIsLoadingChat(true);
            const loadChat = async () => {
                try {
                    const msgs = await fetchChatHistory(selected, conversationId);
                    setChatMessages(msgs);
                    setIsLoadingChat(false);
                    setIsTyping(false);
                } catch (e) {
                    console.error('Chat load error:', e);
                    setIsLoadingChat(false);
                }
            };
            loadChat();

            // Set up auto-refresh every 5 seconds
            if (chatRefreshIntervalRef.current) clearInterval(chatRefreshIntervalRef.current);
            chatRefreshIntervalRef.current = setInterval(loadChat, 5000);

            return () => {
                if (chatRefreshIntervalRef.current) clearInterval(chatRefreshIntervalRef.current);
            };
        }

        return undefined;
    }, [selected, activeTab, conversationId]);

    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const sendApp = (type: string, payload: any) => {
        const appMsg = {
            type,
            payload,
            senderId: (window as any).__valoride_senderId || 'valoride-ui',
            messageId: genMessageId(),
            timestamp: Date.now(),
        };
        try { window.dispatchEvent(new CustomEvent('websocket-send', { detail: appMsg })); } catch { /* ignore */ }
        try { (window as any).acquireVsCodeApi?.()?.postMessage?.({ type: 'P2P:send', message: appMsg }); } catch { /* ignore */ }
    };

    const doRollcall = useCallback(() => sendApp('presence:rollcall', { id: (window as any).__valoride_instanceId || 'ui' }), []);

    const sendCommand = useCallback((targetId?: string) => {
        const payload = { id: genMessageId(), type: 'command', data: { cmd: command }, sourceInstanceId: (window as any).__valoride_instanceId || 'ui', targetInstanceId: targetId };
        sendApp('command', payload);
    }, [command]);

    const handleChatSend = useCallback(async () => {
        if (!chatInput.trim() || !selected) return;

        const senderId = getSenderId();
        try {
            const msg = await sendChatMessage(selected, conversationId, chatInput, senderId, 'USER');
            if (msg) {
                setChatMessages((prev) => [...prev, msg]);
                setChatInput('');
                addAlert('success', '✉️ Message sent!');
                // Mark as read
                markMessageAsRead(msg.id, senderId);
            } else {
                addAlert('error', '❌ Failed to send message - please check connection and try again');
            }
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            const statusMatch = errorMsg.match(/\((\d+)\)/);
            const status = statusMatch ? parseInt(statusMatch[1]) : 500;
            const friendlyMsg = getErrorMessage(status, errorMsg);
            addAlert('error', friendlyMsg);
        }
    }, [chatInput, selected, conversationId, getSenderId, addAlert]);

    const renderHierarchyTree = (nodes: AgentHierarchy[], depth: number = 0): React.ReactNode => {
        return nodes.map((node) => (
            <div key={node.agentId} style={{ marginLeft: depth * 20, padding: 4 }}>
                <div
                    onClick={() => setSelected(node.agentId)}
                    style={{
                        cursor: 'pointer',
                        padding: 4,
                        backgroundColor: selected === node.agentId ? '#e3f2fd' : 'transparent',
                        borderRadius: 4,
                    }}
                >
                    {'▶'.repeat(Math.max(0, depth))} <strong>{node.agentId}</strong> (depth: {node.depth})
                </div>
                {node.children && node.children.length > 0 && renderHierarchyTree(node.children, depth + 1)}
            </div>
        ));
    };

    const filteredAgents = agents.filter((a) => {
        if (!statusFilter) return true;
        return (a.status || 'ONLINE') === statusFilter;
    });

    const tabStyle = (tab: string) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: activeTab === tab ? '2px solid #2196F3' : '1px solid #ddd',
        fontWeight: activeTab === tab ? 'bold' : 'normal',
        color: activeTab === tab ? '#2196F3' : '#666',
    });

    return (
        <div style={{ padding: 12, fontFamily: 'Inter, Arial, sans-serif', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Valor SWARM v2</h3>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: 12 }}>
                <div onClick={() => setActiveTab('agents')} style={tabStyle('agents')}>
                    Agents ({filteredAgents.length})
                </div>
                <div onClick={() => setActiveTab('hierarchy')} style={tabStyle('hierarchy')}>
                    Hierarchy
                </div>
                <div onClick={() => setActiveTab('chat')} style={tabStyle('chat')}>
                    Chat
                </div>
                <div onClick={() => setActiveTab('billing')} style={tabStyle('billing')}>
                    💰 Billing
                </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Agents Tab */}
                {activeTab === 'agents' && (
                    <div style={{ display: 'flex', gap: 12, height: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: 8 }}>
                                <button onClick={doRollcall} style={{ padding: '4px 12px', marginRight: 8 }}>
                                    🔄 Refresh
                                </button>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ padding: '4px 8px' }}
                                >
                                    <option value="">All Status</option>
                                    <option value="ONLINE">ONLINE</option>
                                    <option value="OFFLINE">OFFLINE</option>
                                    <option value="IDLE">IDLE</option>
                                    <option value="BUSY">BUSY</option>
                                    <option value="ERROR">ERROR</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {filteredAgents.map((a) => (
                                        <li
                                            key={a.agentId || a.id}
                                            onClick={() => setSelected(a.agentId || a.id)}
                                            style={{
                                                padding: 8,
                                                marginBottom: 4,
                                                backgroundColor: selected === (a.agentId || a.id) ? '#e3f2fd' : '#f9f9f9',
                                                border: selected === (a.agentId || a.id) ? '2px solid #2196F3' : '1px solid #eee',
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>
                                                {a.agentId || a.id}
                                                <span style={{ marginLeft: 8, fontSize: '11px', color: '#999' }}>
                                                    {a.status && `[${a.status}]`}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                                                {a.username && `👤 ${a.username}`}
                                                {a.instanceId && ` • ${a.instanceId}`}
                                                {a.location && ` • 📍 ${a.location}`}
                                            </div>
                                            {a.lastSeen && (
                                                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                                                    Last seen: {new Date(a.lastSeen).toLocaleTimeString()}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div style={{ width: 300 }}>
                            <h4 style={{ margin: '0 0 12px 0' }}>Commands</h4>
                            <textarea
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: 80,
                                    padding: 8,
                                    borderRadius: 4,
                                    border: '1px solid #ddd',
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                }}
                                placeholder="Enter command (e.g., ping) or JSON..."
                            />
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button
                                    onClick={() => sendCommand(selected || undefined)}
                                    disabled={!selected}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: selected ? '#4CAF50' : '#ccc',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: selected ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    📤 Send to Selected
                                </button>
                                <button
                                    onClick={() => sendCommand(undefined)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: '#2196F3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                    }}
                                >
                                    📢 Broadcast
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hierarchy Tab */}
                {activeTab === 'hierarchy' && (
                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 12 }}>
                        <h4 style={{ marginTop: 0 }}>Agent Tree (Max 12 children, 12 levels)</h4>
                        {hierarchy.length > 0 ? (
                            renderHierarchyTree(hierarchy)
                        ) : (
                            <p style={{ color: '#999' }}>No hierarchy data available</p>
                        )}
                    </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {!selected ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>Select an agent to chat</p>
                        ) : (
                            <>
                                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 12, marginBottom: 12 }}>
                                    {isLoadingChat ? (
                                        <p style={{ color: '#999', textAlign: 'center' }}>Loading chat history...</p>
                                    ) : chatMessages.length > 0 ? (
                                        <>
                                            {chatMessages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    style={{
                                                        marginBottom: 12,
                                                        padding: 8,
                                                        backgroundColor: msg.senderType === 'USER' ? '#e3f2fd' : '#f0f0f0',
                                                        borderRadius: 4,
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 'bold', fontSize: 12, color: '#666' }}>
                                                        {msg.senderType === 'USER' ? '👤' : msg.senderType === 'AGENT' ? '🤖' : '⚙️'} {msg.senderType}
                                                        {msg.readBy && msg.readBy.length > 0 && ' ✓✓'}
                                                    </div>
                                                    <div style={{ marginTop: 4 }}>{msg.message}</div>
                                                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            ))}
                                            {isTyping && (
                                                <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4, fontStyle: 'italic', color: '#999' }}>
                                                    🤖 Agent is typing...
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </>
                                    ) : (
                                        <p style={{ color: '#999', textAlign: 'center' }}>No messages yet</p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleChatSend();
                                            }
                                        }}
                                        placeholder="Type message... (Enter to send)"
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            border: '1px solid #ddd',
                                            borderRadius: 4,
                                        }}
                                    />
                                    <button
                                        onClick={handleChatSend}
                                        disabled={!chatInput.trim()}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: chatInput.trim() ? '#4CAF50' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 4,
                                            cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        Send
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Billing Tab */}
            {activeTab === 'billing' && (
                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 12 }}>
                    {billingStatus ? (
                        <div>
                            <h4 style={{ marginTop: 0 }}>💰 Billing Status</h4>

                            {/* Quota Warning Alert */}
                            {billingStatus.activeAgentCount >= billingStatus.quotaAgents * 0.8 && (
                                <div style={{
                                    padding: 12,
                                    marginBottom: 16,
                                    backgroundColor: billingStatus.activeAgentCount >= billingStatus.quotaAgents ? '#ffebee' : '#fff3e0',
                                    borderRadius: 4,
                                    border: `2px solid ${billingStatus.activeAgentCount >= billingStatus.quotaAgents ? '#FF6B6B' : '#FF9800'}`,
                                }}>
                                    <strong>
                                        {billingStatus.activeAgentCount >= billingStatus.quotaAgents ? '🚨 QUOTA EXHAUSTED' : '⚠️ QUOTA WARNING'}
                                    </strong>
                                    <p style={{ margin: '8px 0 0 0', fontSize: 12 }}>
                                        {billingStatus.activeAgentCount >= billingStatus.quotaAgents
                                            ? `You have reached your agent limit (${billingStatus.activeAgentCount}/${billingStatus.quotaAgents}). Upgrade your plan to add more agents.`
                                            : `You are using ${Math.round((billingStatus.activeAgentCount / billingStatus.quotaAgents) * 100)}% of your quota (${billingStatus.activeAgentCount}/${billingStatus.quotaAgents} agents).`}
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div style={{ padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4, border: '1px solid #eee' }}>
                                    <div style={{ fontSize: 12, color: '#999' }}>Active Agents</div>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2196F3' }}>
                                        {billingStatus.activeAgentCount}/{billingStatus.quotaAgents}
                                    </div>
                                </div>
                                <div style={{ padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4, border: '1px solid #eee' }}>
                                    <div style={{ fontSize: 12, color: '#999' }}>Remaining Quota</div>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', color: billingStatus.remainingQuota > 0 ? '#4CAF50' : '#FF6B6B' }}>
                                        {billingStatus.remainingQuota} agents
                                    </div>
                                </div>
                                <div style={{ padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4, border: '1px solid #eee' }}>
                                    <div style={{ fontSize: 12, color: '#999' }}>Total Charges</div>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#FF9800' }}>
                                        ${billingStatus.totalCharges.toFixed(2)}
                                    </div>
                                </div>
                                <div style={{ padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4, border: '1px solid #eee' }}>
                                    <div style={{ fontSize: 12, color: '#999' }}>Status</div>
                                    <div style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: billingStatus.billingStatus === 'ACTIVE' ? '#4CAF50' :
                                            billingStatus.billingStatus === 'SUSPENDED' ? '#FF6B6B' : '#FF9800'
                                    }}>
                                        {billingStatus.billingStatus}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: 12, backgroundColor: billingStatus.billingStatus === 'ACTIVE' ? '#e8f5e9' : '#ffebee', borderRadius: 4, border: `2px solid ${billingStatus.billingStatus === 'ACTIVE' ? '#4CAF50' : '#FF6B6B'}` }}>
                                <strong>{billingStatus.billingStatus === 'ACTIVE' ? '✓ Billing Active' : '✗ Billing Suspended'}</strong>
                                <p style={{ margin: '8px 0 0 0', fontSize: 12 }}>
                                    {billingStatus.billingStatus === 'ACTIVE'
                                        ? `$0.05 per agent instantiation. ${billingStatus.remainingQuota} slots remaining.`
                                        : 'Cannot create new agents. Contact support to reactivate.'}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button
                                    onClick={() => {
                                        addAlert('info', 'Opening upgrade dialog...');
                                        // TODO: Open billing/upgrade modal
                                    }}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#FF9800',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    💳 Upgrade Quota
                                </button>
                                <button
                                    onClick={() => {
                                        addAlert('info', 'Opening billing history...');
                                        // TODO: Open billing history modal
                                    }}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#2196F3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    📋 View Billing History
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: '#999', textAlign: 'center' }}>Loading billing status...</p>
                    )}
                </div>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: 10,
                                borderRadius: 4,
                                backgroundColor:
                                    alert.type === 'error' ? '#ffebee' :
                                        alert.type === 'warning' ? '#fff3e0' :
                                            alert.type === 'success' ? '#e8f5e9' : '#e3f2fd',
                                borderLeft: `4px solid ${alert.type === 'error' ? '#FF6B6B' :
                                    alert.type === 'warning' ? '#FF9800' :
                                        alert.type === 'success' ? '#4CAF50' : '#2196F3'
                                    }`,
                                fontSize: 12,
                            }}
                        >
                            {alert.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SwarmPanel;
