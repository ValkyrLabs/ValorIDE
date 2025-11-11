import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Typography, message as antdMessage, Modal, Table, Badge, Tooltip } from "antd";
import { CheckCircleOutlined, StopOutlined } from "@ant-design/icons";
const { Text } = Typography;
const SWARM_API_BASE = "http://localhost:8080/v1";
const SettingsPanel = ({ organizationId, userId, onAgentAdded }) => {
    const [form] = Form.useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastError, setLastError] = useState(null);
    const [agents, setAgents] = useState([]);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [billingInfo, setBillingInfo] = useState({
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
        }
        catch (error) {
            console.error("Failed to fetch agents", error);
        }
        finally {
            setAgentsLoading(false);
        }
    };
    const handleSubmit = async (values) => {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to provision agent. Please try again.";
            setLastError(message);
            antdMessage.error(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // Handle agent activation with confirmation modal
    const handleActivateAgent = (agent) => {
        const isMultiAgent = billingInfo.agentCount >= 4; // 4th+ agent
        const chargeUSD = billingInfo.chargePerActivation;
        Modal.confirm({
            title: `Activate Agent '${agent.displayName}'?`,
            content: (_jsxs("div", { children: [_jsx("p", { children: "This will instantiate the agent and connect it to the SWARM network." }), isMultiAgent && (_jsx(Alert, { type: "warning", showIcon: true, message: "Multi-Agent Activation", description: `This is your ${billingInfo.agentCount + 1} agent. You will be charged $${chargeUSD} USD. 
                Current monthly cost: $${(billingInfo.monthlyTotal + chargeUSD).toFixed(2)}`, style: { marginBottom: '12px' } })), _jsxs("p", { children: [_jsx("strong", { children: "Charge:" }), " $", chargeUSD, " USD"] })] })),
            okText: "Activate",
            cancelText: "Cancel",
            okButtonProps: { type: "primary", danger: false },
            onOk() {
                performActivation(agent);
            },
        });
    };
    const performActivation = async (agent) => {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Activation failed";
            antdMessage.error(message);
        }
    };
    // Handle agent suspension with confirmation modal
    const handleSuspendAgent = (agent) => {
        Modal.confirm({
            title: `Suspend Agent '${agent.displayName}'?`,
            content: (_jsxs("div", { children: [_jsx("p", { children: "This will disconnect the agent from the SWARM network and suspend all active workflows." }), _jsx("p", { children: "You can reactivate the agent later, but it will incur another $0.05 charge." }), _jsx(Alert, { type: "info", showIcon: true, message: "Note", description: "Suspending an agent does not affect your existing billing charges.", style: { marginTop: '12px' } })] })),
            okText: "Suspend",
            cancelText: "Cancel",
            okButtonProps: { type: "primary", danger: true },
            onOk() {
                performSuspension(agent);
            },
        });
    };
    const performSuspension = async (agent) => {
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
        }
        catch (error) {
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
            render: (status) => {
                let color = "default";
                let icon = null;
                if (status === "ACTIVE") {
                    color = "success";
                    icon = _jsx(CheckCircleOutlined, {});
                }
                else if (status === "SUSPENDED") {
                    color = "error";
                    icon = _jsx(StopOutlined, {});
                }
                return _jsx(Badge, { status: color, text: status });
            },
        },
        {
            title: "Charge",
            dataIndex: "chargeUSD",
            key: "chargeUSD",
            render: (charge) => charge ? `$${charge.toFixed(2)}` : "—",
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (_jsxs(Space, { children: [record.status === "SUSPENDED" && (_jsx(Tooltip, { title: "Activate this agent ($0.05 charge)", children: _jsx(Button, { type: "primary", size: "small", onClick: () => handleActivateAgent(record), icon: _jsx(CheckCircleOutlined, {}), children: "Activate" }) })), record.status === "ACTIVE" && (_jsx(Tooltip, { title: "Suspend this agent", children: _jsx(Button, { type: "primary", danger: true, size: "small", onClick: () => handleSuspendAgent(record), icon: _jsx(StopOutlined, {}), children: "Suspend" }) }))] })),
        },
    ];
    return (_jsx(Card, { className: "swarm-settings-panel", title: "Agent Settings", children: _jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [_jsx(Text, { type: "secondary", children: "Provision, activate, and manage agents. Manage billing and quota limits here." }), _jsx(Card, { size: "small", title: "Billing & Quota", children: _jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsxs("div", { children: [_jsx(Text, { strong: true, children: "Active Agents:" }), " ", billingInfo.agentCount, "/", 12, billingInfo.agentCount > 10 && _jsx(Badge, { status: "warning", text: "Near quota limit" })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Monthly Cost:" }), " $", billingInfo.monthlyTotal.toFixed(2), " USD", billingInfo.monthlyTotal > 100 && _jsx(Badge, { status: "warning", text: "High usage" })] }), _jsxs("div", { children: [_jsx(Text, { strong: true, children: "Per Activation:" }), " $", billingInfo.chargePerActivation, " USD", billingInfo.agentCount >= 4 && (_jsx(Tooltip, { title: "4th+ agents require ROLE_MULTI_AGENT membership", children: _jsx(Badge, { status: "processing", text: "Multi-agent rate", style: { marginLeft: '8px' } }) }))] })] }) }), _jsx(Card, { size: "small", title: "Active Agents", children: _jsx(Table, { columns: agentTableColumns, dataSource: agents, loading: agentsLoading, rowKey: "id", pagination: false, locale: { emptyText: "No agents provisioned yet" } }) }), _jsxs(Card, { size: "small", title: "Provision New Agent", children: [lastError ? _jsx(Alert, { type: "error", showIcon: true, message: lastError }) : null, _jsxs(Form, { form: form, layout: "vertical", requiredMark: "optional", onFinish: handleSubmit, initialValues: { status: "ONLINE" }, children: [_jsx(Form.Item, { label: "Display Name", name: "displayName", rules: [{ required: true, message: "Please provide a human-friendly name for the agent." }], children: _jsx(Input, { placeholder: "e.g. Research Assistant" }) }), _jsx(Form.Item, { label: "Model", name: "model", rules: [{ required: true, message: "Specify which model powers this agent." }], children: _jsx(Input, { placeholder: "gpt-4o, claude-3-sonnet, etc." }) }), _jsx(Form.Item, { label: "Initial Status", name: "status", children: _jsx(Select, { options: [
                                            { label: "Online", value: "ONLINE" },
                                            { label: "Idle", value: "IDLE" },
                                            { label: "Busy", value: "BUSY" },
                                            { label: "Offline", value: "OFFLINE" },
                                        ] }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: isSubmitting, children: "Create Agent" }) })] })] })] }) }));
};
export default SettingsPanel;
//# sourceMappingURL=SettingsPanel.js.map