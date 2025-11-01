import React, { useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Typography, message as antdMessage } from "antd";

const { Text } = Typography;

const SWARM_API_BASE = "http://localhost:8080/v1/swarm";

interface SettingsPanelProps {
	organizationId: string;
	onAgentAdded: () => void;
}

interface CreateAgentPayload {
	displayName: string;
	model: string;
	status: "ONLINE" | "OFFLINE" | "IDLE" | "BUSY";
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ organizationId, onAgentAdded }) => {
	const [form] = Form.useForm<CreateAgentPayload>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);

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
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to provision agent. Please try again.";
			setLastError(message);
			antdMessage.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="swarm-settings-panel" title="Agent Settings">
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<Text type="secondary">
					Provision new agents or update their presence status. These actions sync with the swarm service.
				</Text>

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
			</Space>
		</Card>
	);
};

export default SettingsPanel;

