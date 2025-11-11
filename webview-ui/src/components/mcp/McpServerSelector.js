import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import StatusBadge from "@/components/common/StatusBadge";
import McpServerDetailsModal from "@/components/mcp/McpServerDetailsModal";
export const McpServerSelector = ({ selectedServer, onSelect, isOwner }) => {
    const { mcpServers } = useExtensionState();
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [detailsServer, setDetailsServer] = useState(undefined);
    const handleServerClick = (server) => {
        setDetailsServer(server);
        setDetailsVisible(true);
    };
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(VSCodeDropdown, { value: selectedServer, onChange: e => {
                    const value = e.target.value;
                    onSelect(value);
                }, style: { minWidth: 180 }, children: mcpServers.map(server => (_jsxs(VSCodeOption, { value: server.name, onClick: () => handleServerClick(server), children: [server.name, " ", _jsx(StatusBadge, { label: server.status, value: server.status, kind: server.status === "connected" ? "ok" : server.status === "connecting" ? "warn" : "error", style: { marginLeft: 6 } })] }, server.name))) }), detailsServer && (_jsx(McpServerDetailsModal, { server: detailsServer, visible: detailsVisible, isOwner: isOwner ? isOwner(detailsServer.name) : false, onClose: () => setDetailsVisible(false), onSave: updated => {
                    // TODO: Wire up save logic (call backend, update context)
                    setDetailsVisible(false);
                } }))] }));
};
export default McpServerSelector;
//# sourceMappingURL=McpServerSelector.js.map