import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, List, Space, Tag, Typography } from "antd";
const { Text } = Typography;
const statusColorMap = {
    ONLINE: "green",
    online: "green",
    BUSY: "orange",
    busy: "orange",
    IDLE: "gold",
    idle: "gold",
    OFFLINE: "gray",
    offline: "gray",
};
const renderStatus = (status) => {
    if (!status) {
        return _jsx(Tag, { color: "default", children: "UNKNOWN" });
    }
    const color = statusColorMap[status] ?? "default";
    const label = status.toUpperCase();
    return _jsx(Tag, { color: color, children: label });
};
const AgentListPanel = ({ agents, selectedAgentId, onSelectAgent }) => {
    return (_jsx(List, { dataSource: agents, locale: { emptyText: "No agents discovered" }, renderItem: (agent) => {
            const isSelected = agent.id === selectedAgentId;
            const title = agent.displayName || agent.username || agent.id;
            const location = agent.location || agent.region;
            return (_jsxs(List.Item, { onClick: () => onSelectAgent(agent.id), className: isSelected ? "swarm-agent-item selected" : "swarm-agent-item", children: [_jsxs(Space, { direction: "vertical", style: { width: "100%" }, children: [_jsxs(Space, { align: "center", children: [_jsx(Text, { strong: true, children: title }), renderStatus(agent.status), typeof agent.version === "string" && agent.version.length > 0 ? (_jsxs(Tag, { color: "blue", children: ["v", agent.version] })) : null] }), _jsxs(Space, { split: _jsx("span", { children: "\u2022" }), size: "small", children: [_jsx(Text, { type: "secondary", children: agent.id }), location ? _jsx(Text, { type: "secondary", children: location }) : null, typeof agent.latency === "number" ? (_jsxs(Text, { type: "secondary", children: [agent.latency.toFixed(0), " ms"] })) : null] })] }), _jsx(Badge, { status: isSelected ? "processing" : "default" })] }));
        } }));
};
export default AgentListPanel;
//# sourceMappingURL=AgentListPanel.js.map