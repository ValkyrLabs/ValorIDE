import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef, useState, useEffect } from "react";
import { useClickAway, useWindowSize } from "react-use";
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import ServersToggleList from "@/components/mcp/configuration/tabs/installed/ServersToggleList";
import { vscode } from "@/utils/vscode";
import { VSCodeButton, VSCodeProgressRing, } from "@vscode/webview-ui-toolkit/react";
import Tooltip from "@/components/common/Tooltip";
import { useGetMcpServersQuery } from "@/thor/redux/services/McpServerService";
import { convertThorMcpServersToShared } from "@/utils/mcpTypeConversions";
import { formatError, safeConvert, } from "@/utils/errorHandling";
import { FaServer, FaSync, FaCog } from "react-icons/fa";
const ServersToggleModal = () => {
    const { data: mcpServers, error, isLoading, refetch, } = useGetMcpServersQuery();
    const [isVisible, setIsVisible] = useState(false);
    const buttonRef = useRef(null);
    const modalRef = useRef(null);
    const { width: viewportWidth, height: viewportHeight } = useWindowSize();
    const [arrowPosition, setArrowPosition] = useState(0);
    const [menuPosition, setMenuPosition] = useState(0);
    // Close modal when clicking outside
    useClickAway(modalRef, () => {
        setIsVisible(false);
    });
    // Calculate positions for modal and arrow
    useEffect(() => {
        if (isVisible && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const buttonCenter = buttonRect.left + buttonRect.width / 2;
            const rightPosition = document.documentElement.clientWidth - buttonCenter - 5;
            setArrowPosition(rightPosition);
            setMenuPosition(buttonRect.top + 1);
        }
    }, [isVisible, viewportWidth, viewportHeight]);
    const handleRefresh = () => {
        refetch();
        vscode.postMessage({ type: "fetchLatestMcpServersFromHub" });
    };
    useEffect(() => {
        if (isVisible) {
            handleRefresh();
        }
    }, [isVisible]);
    // Convert Thor MCP servers to shared format with error handling
    const sharedMcpServers = React.useMemo(() => {
        return safeConvert(mcpServers, convertThorMcpServersToShared, [], "ServersToggleModal");
    }, [mcpServers]);
    return (_jsxs("div", { ref: modalRef, children: [_jsx("div", { ref: buttonRef, className: "inline-flex min-w-0 max-w-full", children: _jsx(Tooltip, { tipText: "Manage MCP Servers", children: _jsx(VSCodeButton, { appearance: "icon", "aria-label": "MCP Servers", onClick: () => setIsVisible(!isVisible), style: { padding: "0px 0px", height: "20px" }, children: _jsx("div", { className: "flex items-center gap-1 text-xs whitespace-nowrap min-w-0 w-full", children: _jsx(FaServer, { style: { fontSize: "12.5px", marginBottom: 1 } }) }) }) }) }), isVisible && (_jsxs("div", { className: "fixed left-[15px] right-[15px] border border-[var(--vscode-editorGroup-border)] p-3 rounded z-[1000] overflow-y-auto", style: {
                    bottom: `calc(100vh - ${menuPosition}px + 6px)`,
                    background: CODE_BLOCK_BG_COLOR,
                    maxHeight: "calc(100vh - 100px)",
                    overscrollBehavior: "contain",
                }, children: [_jsx("div", { className: "fixed w-[10px] h-[10px] z-[-1] rotate-45 border-r border-b border-[var(--vscode-editorGroup-border)]", style: {
                            bottom: `calc(100vh - ${menuPosition}px)`,
                            right: arrowPosition,
                            background: CODE_BLOCK_BG_COLOR,
                        } }), _jsxs("div", { className: "flex justify-between items-center mb-2.5", children: [_jsx("div", { className: "m-0 text-base font-semibold", children: "MCP Servers" }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Tooltip, { tipText: "Refresh MCP Servers", children: _jsx(VSCodeButton, { appearance: "icon", onClick: handleRefresh, disabled: isLoading, children: isLoading ? (_jsx(VSCodeProgressRing, { style: { width: "12px", height: "12px" } })) : (_jsx(FaSync, { style: { fontSize: "10px" } })) }) }), _jsx(VSCodeButton, { appearance: "icon", onClick: () => {
                                            vscode.postMessage({
                                                type: "showMcpView",
                                                tab: "installed",
                                            });
                                            setIsVisible(false);
                                        }, children: _jsx(FaCog, { style: { fontSize: "10px" } }) })] })] }), isLoading && !mcpServers ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-4", children: [_jsx(VSCodeProgressRing, {}), _jsx("span", { children: "Loading MCP servers..." })] })) : error ? (_jsxs("div", { className: "error-message py-2", style: { color: "var(--vscode-errorForeground)" }, children: [_jsx("div", { style: { marginBottom: "8px" }, children: _jsx("strong", { children: "Failed to load MCP servers:" }) }), _jsx("div", { style: { fontSize: "12px", opacity: 0.9 }, children: formatError(error) }), _jsx("div", { style: { marginTop: "8px" }, children: _jsxs(VSCodeButton, { appearance: "secondary", onClick: handleRefresh, style: { fontSize: "11px", padding: "2px 8px" }, children: [_jsx(FaSync, { style: { marginRight: "4px" } }), "Retry"] }) })] })) : (_jsx("div", { style: { marginBottom: -10 }, children: _jsx(ServersToggleList, { servers: sharedMcpServers, isExpandable: false, hasTrashIcon: false, listGap: "small" }) }))] }))] }));
};
export default ServersToggleModal;
//# sourceMappingURL=ServersToggleModal.js.map