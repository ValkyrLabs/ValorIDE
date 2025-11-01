import React from "react";
import { Badge, List, Space, Tag, Typography } from "antd";
import type { AgentDiscoveryRecord } from "../../api/hooks/useDiscoveryQuery";

const { Text } = Typography;

interface AgentListPanelProps {
	agents: AgentDiscoveryRecord[];
	selectedAgentId: string | null;
	onSelectAgent: (agentId: string) => void;
}

const statusColorMap: Record<string, string> = {
	ONLINE: "green",
	online: "green",
	BUSY: "orange",
	busy: "orange",
	IDLE: "gold",
	idle: "gold",
	OFFLINE: "gray",
	offline: "gray",
};

const renderStatus = (status?: string) => {
	if (!status) {
		return <Tag color="default">UNKNOWN</Tag>;
	}
	const color = statusColorMap[status] ?? "default";
	const label = status.toUpperCase();
	return <Tag color={color}>{label}</Tag>;
};

const AgentListPanel: React.FC<AgentListPanelProps> = ({ agents, selectedAgentId, onSelectAgent }) => {
	return (
		<List
			dataSource={agents}
			locale={{ emptyText: "No agents discovered" }}
			renderItem={(agent) => {
				const isSelected = agent.id === selectedAgentId;
				const title = agent.displayName || agent.username || agent.id;
				const location = agent.location || agent.region;
				return (
					<List.Item
						onClick={() => onSelectAgent(agent.id)}
						className={isSelected ? "swarm-agent-item selected" : "swarm-agent-item"}
					>
						<Space direction="vertical" style={{ width: "100%" }}>
							<Space align="center">
								<Text strong>{title}</Text>
								{renderStatus(agent.status)}
								{typeof agent.version === "string" && agent.version.length > 0 ? (
									<Tag color="blue">v{agent.version}</Tag>
								) : null}
							</Space>
							<Space split={<span>•</span>} size="small">
								<Text type="secondary">{agent.id}</Text>
								{location ? <Text type="secondary">{location}</Text> : null}
								{typeof agent.latency === "number" ? (
									<Text type="secondary">{agent.latency.toFixed(0)} ms</Text>
								) : null}
							</Space>
						</Space>
						<Badge status={isSelected ? "processing" : "default"} />
					</List.Item>
				);
			}}
		/>
	);
};

export default AgentListPanel;

