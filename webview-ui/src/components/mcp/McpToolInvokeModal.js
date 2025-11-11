import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
export const McpToolInvokeModal = ({ tool, visible, onClose, onInvoke }) => {
    const [input, setInput] = useState({});
    if (!visible)
        return null;
    const handleChange = (key, value) => {
        setInput(prev => ({ ...prev, [key]: value }));
    };
    const properties = (tool.inputSchema && tool.inputSchema.properties) || {};
    const required = (tool.inputSchema && tool.inputSchema.required) || [];
    return (_jsx("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsxs("div", { style: { background: "var(--vscode-editor-background)", padding: 24, borderRadius: 8, minWidth: 340, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }, children: [_jsx("h3", { style: { marginTop: 0 }, children: tool.name }), _jsx("div", { style: { marginBottom: 16, fontSize: 13, opacity: 0.8 }, children: tool.description }), Object.entries(properties).map(([key, schema]) => {
                    const schemaObj = schema;
                    return (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("label", { style: { fontWeight: 500 }, children: [key, required.includes(key) && _jsx("span", { style: { color: "var(--vscode-errorForeground)", marginLeft: 4 }, children: "*" })] }), _jsx(VSCodeTextField, { value: input[key] || "", onInput: e => handleChange(key, e.target.value), placeholder: schemaObj && typeof schemaObj.description === "string" ? schemaObj.description : "", style: { width: "100%" } })] }, key));
                }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }, children: [_jsx(VSCodeButton, { appearance: "secondary", onClick: onClose, children: "Cancel" }), _jsx(VSCodeButton, { appearance: "primary", onClick: () => onInvoke(input), children: "Invoke" })] })] }) }));
};
export default McpToolInvokeModal;
//# sourceMappingURL=McpToolInvokeModal.js.map