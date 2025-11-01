import React from "react";
import { McpServer, McpTool } from "@shared/mcp";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

export const McpToolPalette: React.FC<{
    server: McpServer | undefined;
    onToolClick: (tool: McpTool) => void;
}> = ({ server, onToolClick }) => {
    if (!server || !server.tools || server.tools.length === 0) {
        return <div style={{ opacity: 0.7, fontSize: 13 }}>No tools available for this server.</div>;
    }
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
            {server.tools.map(tool => (
                <VSCodeButton
                    key={tool.name}
                    appearance="secondary"
                    style={{ minWidth: 120 }}
                    onClick={() => onToolClick(tool)}
                >
                    {tool.name}
                </VSCodeButton>
            ))}
        </div>
    );
};

export default McpToolPalette;
