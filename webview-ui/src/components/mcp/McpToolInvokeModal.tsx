import React, { useState } from "react";
import { McpTool } from "@shared/mcp";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

export const McpToolInvokeModal: React.FC<{
    tool: McpTool;
    visible: boolean;
    onClose: () => void;
    onInvoke: (input: Record<string, any>) => void;
}> = ({ tool, visible, onClose, onInvoke }) => {
    const [input, setInput] = useState<Record<string, any>>({});

    if (!visible) return null;

    const handleChange = (key: string, value: string) => {
        setInput(prev => ({ ...prev, [key]: value }));
    };

    const properties = (tool.inputSchema && (tool.inputSchema as any).properties) || {};
    const required = (tool.inputSchema && (tool.inputSchema as any).required) || [];

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--vscode-editor-background)", padding: 24, borderRadius: 8, minWidth: 340, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
                <h3 style={{ marginTop: 0 }}>{tool.name}</h3>
                <div style={{ marginBottom: 16, fontSize: 13, opacity: 0.8 }}>{tool.description}</div>
                {Object.entries(properties).map(([key, schema]) => {
                    const schemaObj = schema as Record<string, any>;
                    return (
                        <div key={key} style={{ marginBottom: 12 }}>
                            <label style={{ fontWeight: 500 }}>
                                {key}
                                {required.includes(key) && <span style={{ color: "var(--vscode-errorForeground)", marginLeft: 4 }}>*</span>}
                            </label>
                            <VSCodeTextField
                                value={input[key] || ""}
                                onInput={e => handleChange(key, (e.target as HTMLInputElement).value)}
                                placeholder={schemaObj && typeof schemaObj.description === "string" ? schemaObj.description : ""}
                                style={{ width: "100%" }}
                            />
                        </div>
                    );
                })}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                    <VSCodeButton appearance="secondary" onClick={onClose}>Cancel</VSCodeButton>
                    <VSCodeButton appearance="primary" onClick={() => onInvoke(input)}>Invoke</VSCodeButton>
                </div>
            </div>
        </div>
    );
};

export default McpToolInvokeModal;
