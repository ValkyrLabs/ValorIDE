import React, { useState, useEffect } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Typography, message as antdMessage, Modal, Table, Badge, Tooltip } from "antd";
import { DeleteOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons";

const { Text } = Typography;

const SWARM_API_BASE = "http://localhost:8080/v1";

interface SettingsPanelProps {
	organizationId: string;
	userId?: string;
	onAgentAdded: () => void;
}

interface CreateAgentPayload {
	displayName: string;
	model: string;
	status: "ONLINE" | "OFFLINE" | "IDLE" | "BUSY";
}

interface AgentInstance {
	id: string;
	displayName: string;
	model: string;
	status: "ACTIVE" | "SUSPENDED" | "PENDING";
	chargeUSD?: number;
	createdAt?: string;
	activatedAt?: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ organizationId, userId, onAgentAdded }) => {
	const [form] = Form.useForm<CreateAgentPayload>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);
	const [agents, setAgents] = useState<AgentInstance[]>([]);
	const [agentsLoading, setAgentsLoading] = useState(false);
	const [billingInfo, setBillingInfo] = useState<{ monthlyTotal: number; agentCount: number; chargePerActivation: number }>({
		monthlyTotal: 0,
		agentCount: 0,
		chargePerActivation: 0.05,
	});

	// Fetch active agents on mount
	useEffect(() => {
		fetchAgents();
	}, [organizationId]);

	const fetchAgents = async () => {
		setAgentsLoading(true);
		try {
			// In a real app, this would fetch from /v1/agents with filtering
			// For now, using mock data
			setAgents([]);
			setBillingInfo(prev => ({ ...prev, agentCount: 0 }));
		} catch (error) {
			console.error("Failed to fetch agents", error);
		} finally {
			setAgentsLoading(false);
		}
	};

	const handleSubmit = async (values: CreateAgentPayload) => {
		if (!organizationId) {
			setLastError("Missing organization context. Please sign in again.");
			return;
		}

		setIsSubmitting(true);
		setLastError(null);

		try {
			const response = await fetch(`${SWARM_API_BASE}/agents`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					organizationId,
					...values,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || `HTTP ${response.status}`);
			}

			antdMessage.success("Agent provisioned successfully");
			form.resetFields();
			onAgentAdded();
			fetchAgents();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to provision agent. Please try again.";
			setLastError(message);
			antdMessage.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle agent activation with confirmation modal
	const handleActivateAgent = (agent: AgentInstance) => {
		const isMultiAgent = billingInfo.agentCount >= 4; // 4th+ agent
		const chargeUSD = billingInfo.chargePerActivation;

		Modal.confirm({
			title: `Activate Agent '${agent.displayName}'?`,
			content: (
				<div>
					<p>This will instantiate the agent and connect it to the SWARM network.</p>
					{isMultiAgent && (
						<Alert
							type="warning"
							showIcon
							message="Multi-Agent Activation"
							description={`This is your ${billingInfo.agentCount + 1} agent. You will be charged $${chargeUSD} USD. 
                Current monthly cost: $${(billingInfo.monthlyTotal + chargeUSD).toFixed(2)}`}
							style={{ marginBottom: '12px' }}
						/>
					)}
					<p><strong>Charge:</strong> ${chargeUSD} USD</p>
				</div>
			),
			okText: "Activate",
			cancelText: "Cancel",
			okButtonProps: { type: "primary", danger: false },
			onOk() {
				performActivation(agent);
			},
		});
	};

	const performActivation = async (agent: AgentInstance) => {
		try {
			const response = await fetch(`${SWARM_API_BASE}/agents/${agent.id}/instantiate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: "User activated via UI" }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			const result = await response.json();
			antdMessage.success(`Agent activated! Charged: $${result.chargeUSD}`);
			fetchAgents();
			onAgentAdded();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Activation failed";
			antdMessage.error(message);
		}
	};

	// Handle agent suspension with confirmation modal
	const handleSuspendAgent = (agent: AgentInstance) => {
		Modal.confirm({
			title: `Suspend Agent '${agent.displayName}'?`,
			content: (
				<div>
					<p>This will disconnect the agent from the SWARM network and suspend all active workflows.</p>
					<p>You can reactivate the agent later, but it will incur another $0.05 charge.</p>
					<Alert
						type="info"
						showIcon
						message="Note"
						description="Suspending an agent does not affect your existing billing charges."
						style={{ marginTop: '12px' }}
					/>
				</div>
			),
			okText: "Suspend",
			cancelText: "Cancel",
			okButtonProps: { type: "primary", danger: true },
			onOk() {
				performSuspension(agent);
			},
		});
	};

	const performSuspension = async (agent: AgentInstance) => {
		try {
			const response = await fetch(`${SWARM_API_BASE}/agents/${agent.id}/suspend`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			antdMessage.success("Agent suspended");
			fetchAgents();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Suspension failed";
			antdMessage.error(message);
		}
	};

	const agentTableColumns = [
		{
			title: "Agent",
			dataIndex: "displayName",
			key: "displayName",
		},
		{
			title: "Model",
			dataIndex: "model",
			key: "model",
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			render: (status: string) => {
				let color = "default";
				let icon = null;
				if (status === "ACTIVE") {
					color = "success";
					icon = <CheckCircleOutlined />;
				} else if (status === "SUSPENDED") {
					color = "error";
					icon = <StopOutlined />;
				}
				return <Badge status={color as any} text={status} />;
			},
		},
		{
			title: "Charge",
			dataIndex: "chargeUSD",
			key: "chargeUSD",
			render: (charge?: number) => charge ? `$${charge.toFixed(2)}` : "—",
		},
		{
			title: "Actions",
			key: "actions",
			render: (_: any, record: AgentInstance) => (
				<Space>
					{record.status === "SUSPENDED" && (
						<Tooltip title="Activate this agent ($0.05 charge)">
							<Button
								type="primary"
								size="small"
								onClick={() => handleActivateAgent(record)}
								icon={<CheckCircleOutlined />}
							>
								Activate
							</Button>
						</Tooltip>
					)}
					{record.status === "ACTIVE" && (
						<Tooltip title="Suspend this agent">
							<Button
								type="primary"
								danger
								size="small"
								onClick={() => handleSuspendAgent(record)}
								icon={<StopOutlined />}
							>
								Suspend
							</Button>
						</Tooltip>
					)}
				</Space>
			),
		},
	];

	return (
		<Card className="swarm-settings-panel" title="Agent Settings">
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<Text type="secondary">
					Provision, activate, and manage agents. Manage billing and quota limits here.
				</Text>

				{/* Billing Info */}
				<Card size="small" title="Billing & Quota">
					<Space direction="vertical" style={{ width: "100%" }}>
						<div>
							<Text strong>Active Agents:</Text> {billingInfo.agentCount}/{12}
							{billingInfo.agentCount > 10 && <Badge status="warning" text="Near quota limit" />}
						</div>
						<div>
							<Text strong>Monthly Cost:</Text> ${billingInfo.monthlyTotal.toFixed(2)} USD
							{billingInfo.monthlyTotal > 100 && <Badge status="warning" text="High usage" />}
						</div>
						<div>
							<Text strong>Per Activation:</Text> ${billingInfo.chargePerActivation} USD
							{billingInfo.agentCount >= 4 && (
								<Tooltip title="4th+ agents require ROLE_MULTI_AGENT membership">
									<Badge status="processing" text="Multi-agent rate" style={{ marginLeft: '8px' }} />
								</Tooltip>
							)}
						</div>
					</Space>
				</Card>

				{/* Active Agents Table */}
				<Card size="small" title="Active Agents">
					<Table
						columns={agentTableColumns}
						dataSource={agents}
						loading={agentsLoading}
						rowKey="id"
						pagination={false}
						locale={{ emptyText: "No agents provisioned yet" }}
					/>
				</Card>

				{/* Provision New Agent Form */}
				<Card size="small" title="Provision New Agent">
					{lastError ? <Alert type="error" showIcon message={lastError} /> : null}

					<Form
						form={form}
						layout="vertical"
						requiredMark="optional"
						onFinish={handleSubmit}
						initialValues={{ status: "ONLINE" as CreateAgentPayload["status"] }}
					>
						<Form.Item
							label="Display Name"
							name="displayName"
							rules={[{ required: true, message: "Please provide a human-friendly name for the agent." }]}
						>
							<Input placeholder="e.g. Research Assistant" />
						</Form.Item>

						<Form.Item
							label="Model"
							name="model"
							rules={[{ required: true, message: "Specify which model powers this agent." }]}
						>
							<Input placeholder="gpt-4o, claude-3-sonnet, etc." />
						</Form.Item>

						<Form.Item label="Initial Status" name="status">
							<Select
								options={[
									{ label: "Online", value: "ONLINE" },
									{ label: "Idle", value: "IDLE" },
									{ label: "Busy", value: "BUSY" },
									{ label: "Offline", value: "OFFLINE" },
								]}
							/>
						</Form.Item>

						<Form.Item>
							<Button type="primary" htmlType="submit" loading={isSubmitting}>
								Create Agent
							</Button>
						</Form.Item>
					</Form>
				</Card>
			</Space>
		</Card>
	);
};

export default SettingsPanel;

