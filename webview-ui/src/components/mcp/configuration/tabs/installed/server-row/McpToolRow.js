import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { VscSymbolMethod } from "react-icons/vsc";
const McpToolRow = ({ tool, serverName }) => {
    const { autoApprovalSettings } = useExtensionState();
    // Accept the event object
    const handleAutoApproveChange = (event) => {
        // Only proceed if the event was triggered by a direct user interaction
        if (!serverName) {
            return;
        }
        vscode.postMessage({
            type: "toggleToolAutoApprove",
            serverName,
            toolNames: [tool.name],
            autoApprove: !tool.autoApprove,
        });
    };
    return (_jsxs("div", { style: {
            padding: "3px 0",
        }, children: [_jsxs("div", { "data-testid": "tool-row-container", style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [_jsx(VscSymbolMethod, { style: { marginRight: "6px" } }), _jsx("span", { style: { fontWeight: 500 }, children: tool.name })] }), serverName &&
                        autoApprovalSettings.enabled &&
                        autoApprovalSettings.actions.useMcp && (_jsx(VSCodeCheckbox, { checked: tool.autoApprove ?? false, onChange: handleAutoApproveChange, "data-tool": tool.name, children: "Auto-approve" }))] }), tool.description && (_jsx("div", { style: {
                    marginLeft: "0px",
                    marginTop: "4px",
                    opacity: 0.8,
                    fontSize: "12px",
                }, children: tool.description })), tool.inputSchema &&
                "properties" in tool.inputSchema &&
                Object.keys(tool.inputSchema.properties).length >
                    0 && (_jsxs("div", { style: {
                    marginTop: "8px",
                    fontSize: "12px",
                    border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 30%, transparent)",
                    borderRadius: "3px",
                    padding: "8px",
                }, children: [_jsx("div", { style: {
                            marginBottom: "4px",
                            opacity: 0.8,
                            fontSize: "11px",
                            textTransform: "uppercase",
                        }, children: "Parameters" }), Object.entries(tool.inputSchema.properties).map(([paramName, schema]) => {
                        const isRequired = tool.inputSchema &&
                            "required" in tool.inputSchema &&
                            Array.isArray(tool.inputSchema.required) &&
                            tool.inputSchema.required.includes(paramName);
                        return (_jsxs("div", { style: {
                                display: "flex",
                                alignItems: "baseline",
                                marginTop: "4px",
                            }, children: [_jsxs("code", { style: {
                                        color: "var(--vscode-textPreformat-foreground)",
                                        marginRight: "8px",
                                    }, children: [paramName, isRequired && (_jsx("span", { style: {
                                                color: "var(--vscode-errorForeground)",
                                            }, children: "*" }))] }), _jsx("span", { style: {
                                        opacity: 0.8,
                                        overflowWrap: "break-word",
                                        wordBreak: "break-word",
                                    }, children: schema.description || "No description" })] }, paramName));
                    })] }))] }, tool.name));
};
export default McpToolRow;
//# sourceMappingURL=McpToolRow.js.map