import React, { useState } from "react";
import { McpServer } from "@shared/mcp";
import { VSCodeButton, VSCodeTextField, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import StatusBadge from "@/components/common/StatusBadge";

export const McpServerDetailsModal: React.FC<{
    server: McpServer;
    visible: boolean;
    isOwner: boolean;
    onClose: () => void;
    onSave?: (updated: McpServer) => void;
}> = ({ server, visible, isOwner, onClose, onSave }) => {
    const [editState, setEditState] = useState<McpServer & { userRating?: number }>({ ...server, userRating: undefined });
    const [editing, setEditing] = useState(false);

    if (!visible) return null;

    const handleChange = (key: keyof McpServer, value: any) => {
        setEditState(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        if (onSave) onSave(editState);
        setEditing(false);
        onClose();
    };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--vscode-editor-background)", padding: 28, borderRadius: 10, minWidth: 400, boxShadow: "0 2px 24px rgba(0,0,0,0.18)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <h2 style={{ margin: 0 }}>{editState.name}</h2>
                    <StatusBadge label={editState.status} value={editState.status} kind={editState.status === "connected" ? "ok" : editState.status === "connecting" ? "warn" : "error"} />
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 18 }}>{editState.error ? <span style={{ color: "var(--vscode-errorForeground)" }}>{editState.error}</span> : ""}</div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 500 }}>Config</label>
                    {isOwner && editing ? (
                        <VSCodeTextField value={editState.config} onInput={e => handleChange("config", (e.target as HTMLInputElement).value)} style={{ width: "100%" }} />
                    ) : (
                        <pre style={{ background: "var(--vscode-textCodeBlock-background)", padding: 8, borderRadius: 4, fontSize: 12 }}>{editState.config}</pre>
                    )}
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 500 }}>Timeout</label>
                    {isOwner && editing ? (
                        <VSCodeTextField value={String(editState.timeout ?? "")} onInput={e => handleChange("timeout", Number((e.target as HTMLInputElement).value))} style={{ width: 120 }} />
                    ) : (
                        <span>{editState.timeout ?? "Default"} seconds</span>
                    )}
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 500 }}>Disabled</label>
                    {isOwner && editing ? (
                        <VSCodeCheckbox checked={!!editState.disabled} onChange={e => handleChange("disabled", (e.target as HTMLInputElement).checked)}>Disabled</VSCodeCheckbox>
                    ) : (
                        <span>{editState.disabled ? "Yes" : "No"}</span>
                    )}
                </div>
                {/* Sweetness: Show live tool list for this server */}
                <div style={{ marginBottom: 18 }}>
                    <label style={{ fontWeight: 500 }}>Tools</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {(editState.tools && editState.tools.length > 0) ? (
                            editState.tools.map(tool => (
                                <span key={tool.name} style={{ background: "var(--vscode-sideBarSection-background)", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 500, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer" }} title={tool.description || ""}>
                                    {tool.name}
                                </span>
                            ))
                        ) : (
                            <span style={{ opacity: 0.7, fontSize: 12 }}>No tools registered</span>
                        )}
                    </div>
                </div>
                {/* Sweetness: Tool quick actions */}
                <div style={{ marginBottom: 18 }}>
                    <label style={{ fontWeight: 500 }}>Tool Quick Actions</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {(editState.tools && editState.tools.length > 0) ? (
                            editState.tools.map(tool => (
                                <button
                                    key={tool.name}
                                    style={{ background: "var(--vscode-button-secondaryBackground)", color: "var(--vscode-button-foreground)", border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                                    title={tool.description || ""}
                                    onClick={() => alert(`Invoke tool: ${tool.name}`)} // TODO: Wire up real invocation
                                >
                                    {tool.name}
                                </button>
                            ))
                        ) : (
                            <span style={{ opacity: 0.7, fontSize: 12 }}>No tools available</span>
                        )}
                    </div>
                </div>
                {/* Sweetness: Show live status and last health check */}
                <div style={{ marginBottom: 12, fontSize: 12, color: "var(--vscode-descriptionForeground)" }}>
                    <span>Last health check: {/* TODO: Wire up health check timestamp */} <span style={{ fontWeight: 500 }}>just now</span></span>
                </div>
                {/* Sweetness: Ratings Feedback with Valkyr LCARS shine */}
                <div style={{ marginBottom: 18 }}>
                    <label style={{ fontWeight: 500 }}>Your Rating</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <span
                                key={star}
                                style={{
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
                                }}
                                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                onClick={() => {
                                    setEditState(prev => ({ ...prev, userRating: star }));
                                }}
                                onMouseEnter={e => {
                                    (e.target as HTMLElement).style.opacity = "1";
                                    (e.target as HTMLElement).style.textShadow = "0 0 12px #FFD700, 0 0 24px #FFB300";
                                    (e.target as HTMLElement).style.filter = "drop-shadow(0 0 12px #FFB300)";
                                }}
                                onMouseLeave={e => {
                                    (e.target as HTMLElement).style.opacity = "1";
                                    (e.target as HTMLElement).style.textShadow = star <= (editState.userRating || 0) ? "0 0 8px #FFD700, 0 0 16px #FFB300" : "0 0 4px #333";
                                    (e.target as HTMLElement).style.filter = star <= (editState.userRating || 0) ? "drop-shadow(0 0 6px #FFB300)" : "none";
                                }}
                            >★</span>
                        ))}
                        <span style={{ fontSize: 13, marginLeft: 8, color: "var(--vscode-descriptionForeground)" }}>
                            {editState.userRating ? `${editState.userRating}/5` : "Not rated"}
                        </span>
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                    {isOwner && !editing && <VSCodeButton appearance="secondary" onClick={() => setEditing(true)}>Edit</VSCodeButton>}
                    {isOwner && editing && <VSCodeButton appearance="primary" onClick={handleSave}>Save</VSCodeButton>}
                    <VSCodeButton appearance="secondary" onClick={onClose}>Close</VSCodeButton>
                </div>
            </div>
        </div>
    );
};

export default McpServerDetailsModal;
