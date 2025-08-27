import React from "react";
import {
  VSCodeButton,
  VSCodeLink,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import ServersToggleList from "./ServersToggleList";
import { useGetMcpServersQuery } from "@/thor/redux/services/McpServerService";
import { convertThorMcpServersToShared } from "@/utils/mcpTypeConversions";
import {
  formatError,
  getErrorTitle,
  isRetryableError,
  safeConvert,
} from "@/utils/errorHandling";
import Tooltip from "@/components/common/Tooltip";
import { VscRefresh, VscServer } from "react-icons/vsc";
const InstalledServersView = () => {
  const {
    data: mcpServers,
    error,
    isLoading,
    refetch,
  } = useGetMcpServersQuery();

  const handleRefresh = React.useCallback(() => {
    try {
      refetch();
      vscode.postMessage({ type: "fetchLatestMcpServersFromHub" });
    } catch (error) {
      console.error("Failed to refresh MCP servers:", error);
    }
  }, [refetch]);

  // Convert Thor MCP servers to shared format with error handling
  const sharedMcpServers = React.useMemo(() => {
    return safeConvert(
      mcpServers,
      convertThorMcpServersToShared,
      [],
      "InstalledServersView",
    );
  }, [mcpServers]);

  return (
    <div style={{ padding: "16px 20px" }}>
      <div
        style={{
          color: "var(--vscode-foreground)",
          fontSize: "13px",
          marginBottom: "16px",
          marginTop: "5px",
        }}
      >
        The{" "}
        <VSCodeLink
          href="https://github.com/modelcontextprotocol"
          style={{ display: "inline" }}
        >
          Model Context Protocol
        </VSCodeLink>{" "}
        enables communication with locally running MCP servers that provide
        additional tools and resources to extend ValorIDE's capabilities. You
        can use{" "}
        <VSCodeLink
          href="https://github.com/modelcontextprotocol/servers"
          style={{ display: "inline" }}
        >
          community-made servers
        </VSCodeLink>{" "}
        or ask ValorIDE to create new tools specific to your workflow (e.g.,
        "add a tool that gets the latest npm docs").{" "}
        <VSCodeLink
          href="https://x.com/sdrzn/status/1867271665086074969"
          style={{ display: "inline" }}
        >
          See a demo here.
        </VSCodeLink>
      </div>

      {/* Refresh Button */}
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Tooltip tipText="Refresh MCP Servers">
          <VSCodeButton
            appearance="secondary"
            onClick={handleRefresh}
            disabled={isLoading}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {isLoading ? (
              <VSCodeProgressRing style={{ width: "14px", height: "14px" }} />
            ) : (
              <VscRefresh />
            )}
            Refresh
          </VSCodeButton>
        </Tooltip>
      </div>

      {/* MCP Servers List */}
      {isLoading && !mcpServers ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <VSCodeProgressRing />
          <span>Loading MCP servers...</span>
        </div>
      ) : error ? (
        <div
          className="error-message py-4"
          style={{
            color: "var(--vscode-errorForeground)",
            backgroundColor: "var(--vscode-inputValidation-errorBackground)",
            border: "1px solid var(--vscode-inputValidation-errorBorder)",
            borderRadius: "4px",
            padding: "12px",
          }}
        >
          <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
            {getErrorTitle(error)}: Failed to load MCP servers
          </div>
          <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "12px" }}>
            {formatError(error)}
          </div>
          {isRetryableError(error) && (
            <VSCodeButton
              appearance="secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              style={{ fontSize: "11px", padding: "4px 12px" }}
            >
              <VscRefresh
                style={{ marginRight: "4px" }}
              />
              {isLoading ? "Retrying..." : "Retry"}
            </VSCodeButton>
          )}
        </div>
      ) : (
        <ServersToggleList
          servers={sharedMcpServers}
          isExpandable={true}
          hasTrashIcon={false}
        />
      )}

      {/* Settings Section */}
      <div style={{ marginBottom: "20px", marginTop: 10 }}>
        <VSCodeButton
          appearance="secondary"
          style={{ width: "100%", marginBottom: "5px" }}
          onClick={() => {
            vscode.postMessage({ type: "openMcpSettings" });
          }}
        >
          <VscServer
            style={{ marginRight: "6px" }}
          />
          Configure MCP Servers
        </VSCodeButton>

        <div style={{ textAlign: "center" }}>
          <VSCodeLink
            onClick={() => {
              vscode.postMessage({
                type: "openExtensionSettings",
                text: "valoride.mcp",
              });
            }}
            style={{ fontSize: "12px" }}
          >
            Advanced MCP Settings
          </VSCodeLink>
        </div>
      </div>
    </div>
  );
};

export default InstalledServersView;
