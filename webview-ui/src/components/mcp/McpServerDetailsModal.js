import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { VSCodeButton, VSCodeTextField, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import StatusBadge from "@/components/common/StatusBadge";
export const McpServerDetailsModal = ({ server, visible, isOwner, onClose, onSave }) => {
    const [editState, setEditState] = useState({ ...server, userRating: undefined });
    const [editing, setEditing] = useState(false);
    if (!visible)
        return null;
    const handleChange = (key, value) => {
        setEditState(prev => ({ ...prev, [key]: value }));
    };
    const handleSave = () => {
        if (onSave)
            onSave(editState);
        setEditing(false);
        onClose();
    };
    return (_jsx("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsxs("div", { style: { background: "var(--vscode-editor-background)", padding: 28, borderRadius: 10, minWidth: 400, boxShadow: "0 2px 24px rgba(0,0,0,0.18)" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }, children: [_jsx("h2", { style: { margin: 0 }, children: editState.name }), _jsx(StatusBadge, { label: editState.status, value: editState.status, kind: editState.status === "connected" ? "ok" : editState.status === "connecting" ? "warn" : "error" })] }), _jsx("div", { style: { fontSize: 13, opacity: 0.8, marginBottom: 18 }, children: editState.error ? _jsx("span", { style: { color: "var(--vscode-errorForeground)" }, children: editState.error }) : "" }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontWeight: 500 }, children: "Config" }), isOwner && editing ? (_jsx(VSCodeTextField, { value: editState.config, onInput: e => handleChange("config", e.target.value), style: { width: "100%" } })) : (_jsx("pre", { style: { background: "var(--vscode-textCodeBlock-background)", padding: 8, borderRadius: 4, fontSize: 12 }, children: editState.config }))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontWeight: 500 }, children: "Timeout" }), isOwner && editing ? (_jsx(VSCodeTextField, { value: String(editState.timeout ?? ""), onInput: e => handleChange("timeout", Number(e.target.value)), style: { width: 120 } })) : (_jsxs("span", { children: [editState.timeout ?? "Default", " seconds"] }))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontWeight: 500 }, children: "Disabled" }), isOwner && editing ? (_jsx(VSCodeCheckbox, { checked: !!editState.disabled, onChange: e => handleChange("disabled", e.target.checked), children: "Disabled" })) : (_jsx("span", { children: editState.disabled ? "Yes" : "No" }))] }), _jsxs("div", { style: { marginBottom: 18 }, children: [_jsx("label", { style: { fontWeight: 500 }, children: "Tools" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }, children: (editState.tools && editState.tools.length > 0) ? (editState.tools.map(tool => (_jsx("span", { style: { background: "var(--vscode-sideBarSection-background)", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 500, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer" }, title: tool.description || "", children: tool.name }, tool.name)))) : (_jsx("span", { style: { opacity: 0.7, fontSize: 12 }, children: "No tools registered" })) })] }), _jsxs("div", { style: { marginBottom: 18 }, children: [_jsx("label", { style: { fontWeight: 500 }, children: "Tool Quick Actions" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }, children: (editState.tools && editState.tools.length > 0) ? (editState.tools.map(tool => (_jsx("button", { style: { background: "var(--vscode-button-secondaryBackground)", color: "var(--vscode-button-foreground)", border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }, title: tool.description || "", onClick: () => alert(`Invoke tool: ${tool.name}`), children: tool.name }, tool.name)))) : (_jsx("span", { style: { opacity: 0.7, fontSize: 12 }, children: "No tools available" })) })] }), _jsx("div", { style: { marginBottom: 12, fontSize: 12, color: "var(--vscode-descriptionForeground)" }, children: _jsxs("span", { children: ["Last health check: ", " ", _jsx("span", { style: { fontWeight: 500 }, children: "just now" })] }) }), _jsxs("div", { style: { marginBottom: 18 }, children: [_jsx("label", { style: { fontWeight: 500 }, children: "Your Rating" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 6 }, children: [[1, 2, 3, 4, 5].map(star => (_jsx("span", { style: {
                                        fontSize: 22,
                                        color: star <= (editState.userRating || 0) ? "#FFD700" : "#222",
                                        cursor: "pointer",
                                        transition: "color 0.2s, text-shadow 0.2s",
                                        textShadow: star <= (editState.userRating || 0) ? "0 0 8px #FFD700, 0 0 16px #FFB300" : "0 0 4px #333",
                                        filter: star <= (editState.userRating || 0) ? "drop-shadow(0 0 6px #FFB300)" : "none",
                                        background: "linear-gradient(90deg, #FFB300 0%, #FFD700 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        opacity: 1,
                                    }, title: `Rate ${star} star${star > 1 ? 's' : ''}`, onClick: () => {
                                        setEditState(prev => ({ ...prev, userRating: star }));
                                    }, onMouseEnter: e => {
                                        e.target.style.opacity = "1";
                                        e.target.style.textShadow = "0 0 12px #FFD700, 0 0 24px #FFB300";
                                        e.target.style.filter = "drop-shadow(0 0 12px #FFB300)";
                                    }, onMouseLeave: e => {
                                        e.target.style.opacity = "1";
                                        e.target.style.textShadow = star <= (editState.userRating || 0) ? "0 0 8px #FFD700, 0 0 16px #FFB300" : "0 0 4px #333";
                                        e.target.style.filter = star <= (editState.userRating || 0) ? "drop-shadow(0 0 6px #FFB300)" : "none";
                                    }, children: "\u2605" }, star))), _jsx("span", { style: { fontSize: 13, marginLeft: 8, color: "var(--vscode-descriptionForeground)" }, children: editState.userRating ? `${editState.userRating}/5` : "Not rated" })] })] }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }, children: [isOwner && !editing && _jsx(VSCodeButton, { appearance: "secondary", onClick: () => setEditing(true), children: "Edit" }), isOwner && editing && _jsx(VSCodeButton, { appearance: "primary", onClick: handleSave, children: "Save" }), _jsx(VSCodeButton, { appearance: "secondary", onClick: onClose, children: "Close" })] })] }) }));
};
export default McpServerDetailsModal;
//# sourceMappingURL=McpServerDetailsModal.js.map