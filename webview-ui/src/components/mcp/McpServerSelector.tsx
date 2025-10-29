import React, { useState } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import StatusBadge from "@/components/common/StatusBadge";
import McpServerDetailsModal from "@/components/mcp/McpServerDetailsModal";
import type { McpServer } from "@shared/mcp";

export const McpServerSelector: React.FC<{
    selectedServer: string | undefined;
    onSelect: (serverName: string) => void;
    isOwner?: (serverName: string) => boolean;
}> = ({ selectedServer, onSelect, isOwner }) => {
    const { mcpServers } = useExtensionState();
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [detailsServer, setDetailsServer] = useState<McpServer | undefined>(undefined);

    const handleServerClick = (server: McpServer) => {
        setDetailsServer(server);
        setDetailsVisible(true);
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VSCodeDropdown
                value={selectedServer}
                onChange={e => {
                    const value = (e.target as HTMLSelectElement).value;
                    onSelect(value);
                }}
                style={{ minWidth: 180 }}
            >
                {mcpServers.map(server => (
                    <VSCodeOption key={server.name} value={server.name} onClick={() => handleServerClick(server)}>
                        {server.name}
                        {" "}
                        <StatusBadge
                            label={server.status}
                            value={server.status}
                            kind={server.status === "connected" ? "ok" : server.status === "connecting" ? "warn" : "error"}
                            style={{ marginLeft: 6 }}
                        />
                    </VSCodeOption>
                ))}
            </VSCodeDropdown>
            {detailsServer && (
                <McpServerDetailsModal
                    server={detailsServer}
                    visible={detailsVisible}
                    isOwner={isOwner ? isOwner(detailsServer.name) : false}
                    onClose={() => setDetailsVisible(false)}
                    onSave={updated => {
                        // TODO: Wire up save logic (call backend, update context)
                        setDetailsVisible(false);
                    }}
                />
            )}
        </div>
    );
};

export default McpServerSelector;
