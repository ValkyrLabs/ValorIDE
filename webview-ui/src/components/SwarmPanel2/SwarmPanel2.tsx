import React, { useState, useEffect } from 'react';
import { Tabs, Badge, Alert, Spin, Space, Select, Button, Empty, Tooltip } from 'antd';
import { UserAddOutlined, MessageOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import AgentListPanel from './AgentListPanel';
import ChatPanel from './ChatPanel';
import SettingsPanel from './SettingsPanel';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useDiscoveryQuery } from '../../api/hooks/useDiscoveryQuery';
import './SwarmPanel2.css';

/**
 * SwarmPanel v2: Multi-tabbed UI for agent management.
 *
 * Tabs:
 * 1. Agents: Hierarchical tree view with status badges
 * 2. Chat: Real-time messaging with selected agent
 * 3. Settings: Billing, quota, agent configuration
 *
 * Real-time: WebSocket integration for presence updates
 */
interface SwarmPanel2Props {
    organizationId: string;
    userId: string;
    workspaceId: string;
}

const SwarmPanel2: React.FC<SwarmPanel2Props> = ({
    organizationId,
    userId,
    workspaceId,
}) => {
    const [activeTab, setActiveTab] = useState<string>('agents');
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [status, setStatus] = useState<'online' | 'offline' | 'idle' | 'busy'>('offline');
    const [agentFilter, setAgentFilter] = useState<'all' | 'online' | 'offline' | 'busy'>('all');
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

    const handleAgentSelect = (agentId: string) => {
        setSelectedAgentId(agentId);
        setSelectedConversationId(null);
    };

    const handleChatSelect = (conversationId: string) => {
        setSelectedConversationId(conversationId);
        setActiveTab('chat');
    };

    const handleStatusChange = (newStatus: 'online' | 'offline' | 'idle' | 'busy') => {
        setStatus(newStatus);
        // Emit status change to backend
        // publishMessage(`/app/swarm/status`, { userId, status: newStatus });
    };

    const onlineCount = agents.filter((a) => a.status === 'ONLINE').length;
    const totalCount = agents.length;

    return (
        <div className="swarm-panel-v2">
            <div className="swarm-header">
                <div className="swarm-title">
                    <span>🚀 SWARM v2</span>
                    <Badge count={onlineCount} style={{ backgroundColor: '#52c41a', marginLeft: '10px' }} />
                </div>

                <Space>
                    <Tooltip title="Your Status">
                        <Select
                            value={status}
                            onChange={handleStatusChange}
                            options={[
                                { label: '🟢 Online', value: 'online' },
                                { label: '🟡 Idle', value: 'idle' },
                                { label: '🔴 Busy', value: 'busy' },
                                { label: '⚫ Offline', value: 'offline' },
                            ]}
                            style={{ width: 120 }}
                        />
                    </Tooltip>

                    <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
                        <Button
                            icon={<ReloadOutlined />}
                            size="small"
                            onClick={() => refetch()}
                            loading={agentsLoading}
                        />
                    </Tooltip>

                    <Badge
                        color={isConnected ? 'green' : 'red'}
                        text={isConnected ? 'Connected' : 'Disconnected'}
                    />
                </Space>
            </div>

            {/* Status Alert */}
            {!isConnected && (
                <Alert
                    message="WebSocket Disconnected"
                    description="Real-time updates are unavailable. Refresh to reconnect."
                    type="warning"
                    showIcon
                    closable
                    style={{ marginBottom: '10px' }}
                />
            )}

            {/* Main Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'agents',
                        label: (
                            <>
                                <UserAddOutlined /> Agents ({totalCount})
                            </>
                        ),
                        children: (
                            <Spin spinning={agentsLoading}>
                                <div className="swarm-tab-content">
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {/* Filter */}
                                        <Select
                                            value={agentFilter}
                                            onChange={setAgentFilter}
                                            options={[
                                                { label: 'All Agents', value: 'all' },
                                                { label: 'Online', value: 'online' },
                                                { label: 'Offline', value: 'offline' },
                                                { label: 'Busy', value: 'busy' },
                                            ]}
                                            style={{ width: '100%' }}
                                        />

                                        {/* Agent List */}
                                        {agents.length === 0 ? (
                                            <Empty description="No agents found" />
                                        ) : (
                                            <AgentListPanel
                                                agents={agents}
                                                selectedAgentId={selectedAgentId}
                                                onSelectAgent={handleAgentSelect}
                                            />
                                        )}
                                    </Space>
                                </div>
                            </Spin>
                        ),
                    },

                    {
                        key: 'chat',
                        label: (
                            <>
                                <MessageOutlined /> Chat
                            </>
                        ),
                        children: selectedAgentId ? (
                            <ChatPanel
                                agentId={selectedAgentId}
                                organizationId={organizationId}
                                userId={userId}
                                conversationId={
                                    selectedConversationId || `conv_${selectedAgentId}_${userId}`
                                }
                            />
                        ) : (
                            <Empty description="Select an agent to start chatting" />
                        ),
                    },

                    {
                        key: 'settings',
                        label: (
                            <>
                                <SettingOutlined /> Settings
                            </>
                        ),
                        children: (
                            <SettingsPanel
                                organizationId={organizationId}
                                onAgentAdded={() => refetch()}
                            />
                        ),
                    },
                ]}
            />
        </div>
    );
};

export default SwarmPanel2;
