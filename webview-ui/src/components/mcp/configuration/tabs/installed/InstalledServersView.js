import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { VSCodeButton, VSCodeLink, VSCodeProgressRing, } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import ServersToggleList from "./ServersToggleList";
import { useGetMcpServersQuery } from "@/thor/redux/services/McpServerService";
import { convertThorMcpServersToShared } from "@/utils/mcpTypeConversions";
import { formatError, getErrorTitle, isRetryableError, safeConvert, } from "@/utils/errorHandling";
import Tooltip from "@/components/common/Tooltip";
import SystemAlerts from "@/components/SystemAlerts";
import { VscRefresh, VscServer } from "react-icons/vsc";
const InstalledServersView = () => {
    const { data: mcpServers, error, isLoading, refetch, } = useGetMcpServersQuery();
    const handleRefresh = React.useCallback(() => {
        try {
            refetch();
            vscode.postMessage({ type: "fetchLatestMcpServersFromHub" });
        }
        catch (error) {
            console.error("Failed to refresh MCP servers:", error);
        }
    }, [refetch]);
    // Convert Thor MCP servers to shared format with error handling
    const sharedMcpServers = React.useMemo(() => {
        return safeConvert(mcpServers, convertThorMcpServersToShared, [], "InstalledServersView");
    }, [mcpServers]);
    return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsxs("div", { style: { padding: "16px 20px" }, children: [_jsxs("div", { style: {
                            color: "var(--vscode-foreground)",
                            fontSize: "13px",
                            marginBottom: "16px",
                            marginTop: "5px",
                        }, children: ["The", " ", _jsx(VSCodeLink, { href: "https://github.com/modelcontextprotocol", style: { display: "inline" }, children: "Model Context Protocol" }), " ", "enables communication with locally running MCP servers that provide additional tools and resources to extend ValorIDE's capabilities. You can use", " ", _jsx(VSCodeLink, { href: "https://github.com/modelcontextprotocol/servers", style: { display: "inline" }, children: "community-made servers" }), " ", "or ask ValorIDE to create new tools specific to your workflow (e.g., \"add a tool that gets the latest npm docs\").", " ", _jsx(VSCodeLink, { href: "https://x.com/sdrzn/status/1867271665086074969", style: { display: "inline" }, children: "See a demo here." })] }), _jsx("div", { style: {
                            marginBottom: "16px",
                            display: "flex",
                            justifyContent: "flex-end",
                        }, children: _jsx(Tooltip, { tipText: "Refresh MCP Servers", children: _jsxs(VSCodeButton, { appearance: "secondary", onClick: handleRefresh, disabled: isLoading, style: { display: "flex", alignItems: "center", gap: "6px" }, children: [isLoading ? (_jsx(VSCodeProgressRing, { style: { width: "14px", height: "14px" } })) : (_jsx(VscRefresh, {})), "Refresh"] }) }) }), isLoading && !mcpServers ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8", children: [_jsx(VSCodeProgressRing, {}), _jsx("span", { children: "Loading MCP servers..." })] })) : error ? (_jsxs("div", { className: "error-message py-4", style: {
                            color: "var(--vscode-errorForeground)",
                            backgroundColor: "var(--vscode-inputValidation-errorBackground)",
                            border: "1px solid var(--vscode-inputValidation-errorBorder)",
                            borderRadius: "4px",
                            padding: "12px",
                        }, children: [_jsxs("div", { style: { marginBottom: "8px", fontWeight: "bold" }, children: [getErrorTitle(error), ": Failed to load MCP servers"] }), _jsx("div", { style: { fontSize: "12px", opacity: 0.9, marginBottom: "12px" }, children: formatError(error) }), isRetryableError(error) && (_jsxs(VSCodeButton, { appearance: "secondary", onClick: handleRefresh, disabled: isLoading, style: { fontSize: "11px", padding: "4px 12px" }, children: [_jsx(VscRefresh, { style: { marginRight: "4px" } }), isLoading ? "Retrying..." : "Retry"] }))] })) : (_jsx(ServersToggleList, { servers: sharedMcpServers, isExpandable: true, hasTrashIcon: false })), _jsxs("div", { style: { marginBottom: "20px", marginTop: 10 }, children: [_jsxs(VSCodeButton, { appearance: "secondary", style: { width: "100%", marginBottom: "5px" }, onClick: () => {
                                    vscode.postMessage({ type: "openMcpSettings" });
                                }, children: [_jsx(VscServer, { style: { marginRight: "6px" } }), "Configure MCP Servers"] }), _jsx("div", { style: { textAlign: "center" }, children: _jsx(VSCodeLink, { onClick: () => {
                                        vscode.postMessage({
                                            type: "openExtensionSettings",
                                            text: "valoride.mcp",
                                        });
                                    }, style: { fontSize: "12px" }, children: "Advanced MCP Settings" }) })] })] })] }));
};
export default InstalledServersView;
//# sourceMappingURL=InstalledServersView.js.map