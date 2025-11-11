import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Tabs, Badge, Alert, Spin, Space, Select, Button, Empty, Tooltip } from 'antd';
import { UserAddOutlined, MessageOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import AgentListPanel from './AgentListPanel';
import ChatPanel from './ChatPanel';
import SettingsPanel from './SettingsPanel';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useDiscoveryQuery } from '../../api/hooks/useDiscoveryQuery';
import './SwarmPanel2.css';
const SwarmPanel2 = ({ organizationId, userId, workspaceId, }) => {
    const [activeTab, setActiveTab] = useState('agents');
    const [selectedAgentId, setSelectedAgentId] = useState(null);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [status, setStatus] = useState('offline');
    const [agentFilter, setAgentFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    // WebSocket for real-time updates
    const { isConnected, lastMessage } = useWebSocket(`/topic/swarm/${organizationId}`);
    // Fetch agents via RTK Query
    const { data: agents = [], isLoading: agentsLoading, refetch } = useDiscoveryQuery({
        organizationId,
        status: agentFilter === 'all' ? undefined : agentFilter,
    });
    // Handle WebSocket agent presence updates
    useEffect(() => {
        if (lastMessage?.type === 'AGENT_PRESENCE_UPDATE') {
            refetch(); // Refresh agent list
        }
    }, [lastMessage, refetch]);
    const handleAgentSelect = (agentId) => {
        setSelectedAgentId(agentId);
        setSelectedConversationId(null);
    };
    const handleChatSelect = (conversationId) => {
        setSelectedConversationId(conversationId);
        setActiveTab('chat');
    };
    const handleStatusChange = (newStatus) => {
        setStatus(newStatus);
        // Emit status change to backend
        // publishMessage(`/app/swarm/status`, { userId, status: newStatus });
    };
    const onlineCount = agents.filter((a) => a.status === 'ONLINE').length;
    const totalCount = agents.length;
    return (_jsxs("div", { className: "swarm-panel-v2", children: [_jsxs("div", { className: "swarm-header", children: [_jsxs("div", { className: "swarm-title", children: [_jsx("span", { children: "\uD83D\uDE80 SWARM v2" }), _jsx(Badge, { count: onlineCount, style: { backgroundColor: '#52c41a', marginLeft: '10px' } })] }), _jsxs(Space, { children: [_jsx(Tooltip, { title: "Your Status", children: _jsx(Select, { value: status, onChange: handleStatusChange, options: [
                                        { label: '🟢 Online', value: 'online' },
                                        { label: '🟡 Idle', value: 'idle' },
                                        { label: '🔴 Busy', value: 'busy' },
                                        { label: '⚫ Offline', value: 'offline' },
                                    ], style: { width: 120 } }) }), _jsx(Tooltip, { title: isConnected ? 'Connected' : 'Disconnected', children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), size: "small", onClick: () => refetch(), loading: agentsLoading }) }), _jsx(Badge, { color: isConnected ? 'green' : 'red', text: isConnected ? 'Connected' : 'Disconnected' })] })] }), !isConnected && (_jsx(Alert, { message: "WebSocket Disconnected", description: "Real-time updates are unavailable. Refresh to reconnect.", type: "warning", showIcon: true, closable: true, style: { marginBottom: '10px' } })), _jsx(Tabs, { activeKey: activeTab, onChange: setActiveTab, items: [
                    {
                        key: 'agents',
                        label: (_jsxs(_Fragment, { children: [_jsx(UserAddOutlined, {}), " Agents (", totalCount, ")"] })),
                        children: (_jsx(Spin, { spinning: agentsLoading, children: _jsx("div", { className: "swarm-tab-content", children: _jsxs(Space, { direction: "vertical", style: { width: '100%' }, children: [_jsx(Select, { value: agentFilter, onChange: setAgentFilter, options: [
                                                { label: 'All Agents', value: 'all' },
                                                { label: 'Online', value: 'online' },
                                                { label: 'Offline', value: 'offline' },
                                                { label: 'Busy', value: 'busy' },
                                            ], style: { width: '100%' } }), agents.length === 0 ? (_jsx(Empty, { description: "No agents found" })) : (_jsx(AgentListPanel, { agents: agents, selectedAgentId: selectedAgentId, onSelectAgent: handleAgentSelect }))] }) }) })),
                    },
                    {
                        key: 'chat',
                        label: (_jsxs(_Fragment, { children: [_jsx(MessageOutlined, {}), " Chat"] })),
                        children: selectedAgentId ? (_jsx(ChatPanel, { agentId: selectedAgentId, organizationId: organizationId, userId: userId, conversationId: selectedConversationId || `conv_${selectedAgentId}_${userId}` })) : (_jsx(Empty, { description: "Select an agent to start chatting" })),
                    },
                    {
                        key: 'settings',
                        label: (_jsxs(_Fragment, { children: [_jsx(SettingOutlined, {}), " Settings"] })),
                        children: (_jsx(SettingsPanel, { organizationId: organizationId, onAgentAdded: () => refetch() })),
                    },
                ] })] }));
};
export default SwarmPanel2;
//# sourceMappingURL=SwarmPanel2.js.map