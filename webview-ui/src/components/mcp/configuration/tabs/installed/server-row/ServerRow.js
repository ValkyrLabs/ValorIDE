import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DEFAULT_MCP_TIMEOUT_SECONDS } from "@shared/mcp";
import { useState, useCallback } from "react";
import { vscode } from "@/utils/vscode";
import { VSCodeButton, VSCodeCheckbox, VSCodeDropdown, VSCodeOption, VSCodePanels, VSCodePanelTab, VSCodePanelView, } from "@vscode/webview-ui-toolkit/react";
import { FaChevronDown, FaChevronRight, FaSync, FaTrash } from "react-icons/fa";
import { getMcpServerDisplayName } from "@/utils/mcp";
import DangerButton from "@/components/common/DangerButton";
import McpToolRow from "./McpToolRow";
import McpResourceRow from "./McpResourceRow";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { McpServiceClient } from "@/services/grpc-client";
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion";
// constant JSX.Elements
const TimeoutOptions = [
    { value: "30", label: "30 seconds" },
    { value: "60", label: "1 minute" },
    { value: "300", label: "5 minutes" },
    { value: "600", label: "10 minutes" },
    { value: "1800", label: "30 minutes" },
    { value: "3600", label: "1 hour" },
].map((option) => (_jsx(VSCodeOption, { value: option.value, children: option.label }, option.value)));
const ServerRow = ({ server, isExpandable = true, hasTrashIcon = true, }) => {
    const { mcpMarketplaceCatalog, autoApprovalSettings, setMcpServers } = useExtensionState();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const getStatusColor = useCallback((status) => {
        switch (status) {
            case "connected":
                return "var(--vscode-testing-iconPassed)";
            case "connecting":
                return "var(--vscode-charts-yellow)";
            case "disconnected":
                return "var(--vscode-testing-iconFailed)";
        }
    }, []);
    const handleRowClick = () => {
        if (!server.error && isExpandable) {
            setIsExpanded(!isExpanded);
        }
    };
    const [timeoutValue, setTimeoutValue] = useState(() => {
        try {
            const config = JSON.parse(server.config);
            return (config.timeout?.toString() || DEFAULT_MCP_TIMEOUT_SECONDS.toString());
        }
        catch {
            return DEFAULT_MCP_TIMEOUT_SECONDS.toString();
        }
    });
    const handleTimeoutChange = (e) => {
        const select = e.target;
        const value = select.value;
        const num = parseInt(value);
        setTimeoutValue(value);
        McpServiceClient.updateMcpTimeout({
            serverName: server.name,
            timeout: num,
        })
            .then((response) => {
            const mcpServers = convertProtoMcpServersToMcpServers(response.mcpServers);
            setMcpServers(mcpServers);
        })
            .catch((error) => {
            console.error("Error updating MCP server timeout", error);
        });
    };
    const handleRestart = () => {
        vscode.postMessage({
            type: "restartMcpServer",
            text: server.name,
        });
    };
    const handleDelete = () => {
        setIsDeleting(true);
        vscode.postMessage({
            type: "deleteMcpServer",
            serverName: server.name,
        });
    };
    const handleAutoApproveChange = () => {
        if (!server.name)
            return;
        vscode.postMessage({
            type: "toggleToolAutoApprove",
            serverName: server.name,
            toolNames: server.tools?.map((tool) => tool.name) || [],
            autoApprove: !server.tools?.every((tool) => tool.autoApprove),
        });
    };
    const handleToggleMcpServer = () => {
        McpServiceClient.toggleMcpServer({
            serverName: server.name,
            disabled: !server.disabled,
        })
            .then((response) => {
            const mcpServers = convertProtoMcpServersToMcpServers(response.mcpServers);
            setMcpServers(mcpServers);
        })
            .catch((error) => {
            console.error("Error toggling MCP server", error);
        });
    };
    return (_jsxs("div", { style: { marginBottom: "10px" }, children: [_jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    padding: "8px",
                    background: "var(--vscode-textCodeBlock-background)",
                    cursor: server.error
                        ? "default"
                        : isExpandable
                            ? "pointer"
                            : "default",
                    borderRadius: isExpanded || server.error ? "4px 4px 0 0" : "4px",
                    opacity: server.disabled ? 0.6 : 1,
                }, onClick: handleRowClick, children: [!server.error && isExpandable && (isExpanded
                        ? _jsx(FaChevronDown, { style: { marginRight: "8px" } })
                        : _jsx(FaChevronRight, { style: { marginRight: "8px" } })), _jsx("span", { style: {
                            flex: 1,
                            overflow: "hidden",
                            wordBreak: "break-all",
                            whiteSpace: "normal",
                            display: "flex",
                            alignItems: "center",
                            marginRight: "4px",
                        }, children: getMcpServerDisplayName(server.name, mcpMarketplaceCatalog) }), !server.error && (_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginLeft: "8px",
                        }, children: [_jsx(VSCodeButton, { appearance: "icon", title: "Restart Server", onClick: (e) => {
                                    e.stopPropagation();
                                    handleRestart();
                                }, disabled: server.status === "connecting", children: _jsx(FaSync, {}) }), hasTrashIcon && (_jsx(VSCodeButton, { appearance: "icon", title: "Delete Server", onClick: (e) => {
                                    e.stopPropagation();
                                    handleDelete();
                                }, disabled: isDeleting, children: _jsx(FaTrash, {}) }))] })), _jsx("div", { style: { display: "flex", alignItems: "center", marginLeft: "8px" }, onClick: (e) => e.stopPropagation(), children: _jsx("div", { role: "switch", "aria-checked": !server.disabled, tabIndex: 0, style: {
                                width: "20px",
                                height: "10px",
                                backgroundColor: server.disabled
                                    ? "var(--vscode-titleBar-inactiveForeground)"
                                    : "var(--vscode-testing-iconPassed)",
                                borderRadius: "5px",
                                position: "relative",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                opacity: server.disabled ? 0.5 : 0.9,
                            }, onClick: () => {
                                handleToggleMcpServer();
                            }, onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleToggleMcpServer();
                                }
                            }, children: _jsx("div", { style: {
                                    width: "6px",
                                    height: "6px",
                                    backgroundColor: "white",
                                    border: "1px solid color-mix(in srgb, #666666 65%, transparent)",
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "1px",
                                    left: server.disabled ? "2px" : "12px",
                                    transition: "left 0.2s",
                                } }) }) }), _jsx("div", { style: {
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: getStatusColor(server.status),
                            marginLeft: "8px",
                        } })] }), server.error ? (_jsxs("div", { style: {
                    fontSize: "13px",
                    background: "var(--vscode-textCodeBlock-background)",
                    borderRadius: "0 0 4px 4px",
                    width: "100%",
                }, children: [_jsx("div", { style: {
                            color: "var(--vscode-testing-iconFailed)",
                            marginBottom: "8px",
                            padding: "0 10px",
                            overflowWrap: "break-word",
                            wordBreak: "break-word",
                        }, children: server.error }), _jsx(VSCodeButton, { appearance: "secondary", onClick: handleRestart, disabled: server.status === "connecting", style: {
                            width: "calc(100% - 20px)",
                            margin: "0 10px 10px 10px",
                        }, children: server.status === "connecting"
                            ? "Retrying..."
                            : "Retry Connection" }), _jsx(DangerButton, { style: { width: "calc(100% - 20px)", margin: "0 10px 10px 10px" }, disabled: isDeleting, onClick: handleDelete, children: isDeleting ? "Deleting..." : "Delete Server" })] })) : (isExpanded && (_jsxs("div", { style: {
                    background: "var(--vscode-textCodeBlock-background)",
                    padding: "0 10px 10px 10px",
                    fontSize: "13px",
                    borderRadius: "0 0 4px 4px",
                }, children: [_jsxs(VSCodePanels, { children: [_jsxs(VSCodePanelTab, { id: "tools", children: ["Tools (", server.tools?.length || 0, ")"] }), _jsxs(VSCodePanelTab, { id: "resources", children: ["Resources (", [
                                        ...(server.resourceTemplates || []),
                                        ...(server.resources || []),
                                    ].length || 0, ")"] }), _jsx(VSCodePanelView, { id: "tools-view", children: server.tools && server.tools.length > 0 ? (_jsxs("div", { style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px",
                                        width: "100%",
                                    }, children: [server.tools.map((tool) => (_jsx(McpToolRow, { tool: tool, serverName: server.name }, tool.name))), server.name &&
                                            autoApprovalSettings.enabled &&
                                            autoApprovalSettings.actions.useMcp && (_jsx(VSCodeCheckbox, { style: { marginBottom: -10 }, checked: server.tools.every((tool) => tool.autoApprove), onChange: handleAutoApproveChange, "data-tool": "all-tools", children: "Auto-approve all tools" }))] })) : (_jsx("div", { style: {
                                        padding: "10px 0",
                                        color: "var(--vscode-descriptionForeground)",
                                    }, children: "No tools found" })) }), _jsx(VSCodePanelView, { id: "resources-view", children: (server.resources && server.resources.length > 0) ||
                                    (server.resourceTemplates &&
                                        server.resourceTemplates.length > 0) ? (_jsx("div", { style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px",
                                        width: "100%",
                                    }, children: [
                                        ...(server.resourceTemplates || []),
                                        ...(server.resources || []),
                                    ].map((item) => (_jsx(McpResourceRow, { item: item }, "uriTemplate" in item ? item.uriTemplate : item.uri))) })) : (_jsx("div", { style: {
                                        padding: "10px 0",
                                        color: "var(--vscode-descriptionForeground)",
                                    }, children: "No resources found" })) })] }), _jsxs("div", { style: { margin: "10px 7px" }, children: [_jsx("label", { style: {
                                    display: "block",
                                    marginBottom: "4px",
                                    fontSize: "13px",
                                }, children: "Request Timeout" }), _jsx(VSCodeDropdown, { style: { width: "100%" }, value: timeoutValue, onChange: handleTimeoutChange, children: TimeoutOptions })] }), _jsx(VSCodeButton, { appearance: "secondary", onClick: handleRestart, disabled: server.status === "connecting", style: {
                            width: "calc(100% - 14px)",
                            margin: "0 7px 3px 7px",
                        }, children: server.status === "connecting"
                            ? "Restarting..."
                            : "Restart Server" }), _jsx(DangerButton, { style: { width: "calc(100% - 14px)", margin: "5px 7px 3px 7px" }, disabled: isDeleting, onClick: handleDelete, children: isDeleting ? "Deleting..." : "Delete Server" })] })))] }));
};
export default ServerRow;
//# sourceMappingURL=ServerRow.js.map