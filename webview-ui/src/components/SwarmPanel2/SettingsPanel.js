import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Typography, message as antdMessage, } from "antd";
const { Text } = Typography;
const SWARM_API_BASE = "http://localhost:8080/v1/swarm";
const SettingsPanel = ({ organizationId, onAgentAdded, }) => {
    const [form] = Form.useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastError, setLastError] = useState(null);
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
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Failed to provision agent. Please try again.";
            setLastError(message);
            antdMessage.error(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx(Card, { className: "swarm-settings-panel", title: "Agent Settings", children: _jsxs(Space, { direction: "vertical", size: "large", style: { width: "100%" }, children: [_jsx(Text, { type: "secondary", children: "Provision new agents or update their presence status. These actions sync with the swarm service." }), lastError ? _jsx(Alert, { type: "error", showIcon: true, message: lastError }) : null, _jsxs(Form, { form: form, layout: "vertical", requiredMark: "optional", onFinish: handleSubmit, initialValues: { status: "ONLINE" }, children: [_jsx(Form.Item, { label: "Display Name", name: "displayName", rules: [
                                {
                                    required: true,
                                    message: "Please provide a human-friendly name for the agent.",
                                },
                            ], children: _jsx(Input, { placeholder: "e.g. Research Assistant" }) }), _jsx(Form.Item, { label: "Model", name: "model", rules: [
                                {
                                    required: true,
                                    message: "Specify which model powers this agent.",
                                },
                            ], children: _jsx(Input, { placeholder: "gpt-4o, claude-3-sonnet, etc." }) }), _jsx(Form.Item, { label: "Initial Status", name: "status", children: _jsx(Select, { options: [
                                    { label: "Online", value: "ONLINE" },
                                    { label: "Idle", value: "IDLE" },
                                    { label: "Busy", value: "BUSY" },
                                    { label: "Offline", value: "OFFLINE" },
                                ] }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: isSubmitting, children: "Create Agent" }) })] })] }) }));
};
export default SettingsPanel;
//# sourceMappingURL=SettingsPanel.js.map