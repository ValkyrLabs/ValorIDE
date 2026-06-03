import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import {
  VscAdd,
  VscChecklist,
  VscRocket,
  VscSettingsGear,
} from "react-icons/vsc";
import { vscode } from "@thorapi/utils/vscode";

export type SubmitAction = {
  label: string;
  telemetryEvent: string;
  message:
    | { type: "fetchLatestMcpServersFromHub" }
    | { type: "openMcpSettings" }
    | { type: "openInBrowser"; url: string };
};

export const mcpSubmitActions: SubmitAction[] = [
  {
    label: "Detect local servers",
    telemetryEvent: "mcp_submit_started",
    message: { type: "fetchLatestMcpServersFromHub" },
  },
  {
    label: "Review MCP settings",
    telemetryEvent: "mcp_manifest_validated",
    message: { type: "openMcpSettings" },
  },
  {
    label: "Create listing draft",
    telemetryEvent: "mcp_submit_completed",
    message: {
      type: "openInBrowser",
      url: "https://valkyrlabs.com/mcp/marketplace/submit?source=valoride",
    },
  },
];

const readinessChecks = [
  "Manifest and tool schema ready",
  "Pricing, support, and docs captured",
  "Review status returns to this marketplace",
];

export const dispatchMcpSubmitAction = (action: SubmitAction) => {
  vscode.postMessage({
    type: "displayVSCodeInfo",
    text: `${action.telemetryEvent}:mcp-marketplace-submit`,
    telemetryEvent: action.telemetryEvent,
    telemetryProperties: { surface: "mcp_marketplace_submit_card" },
  });
  vscode.postMessage(action.message);
};

const McpSubmitCard = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "15px",
        margin: "20px",
        backgroundColor: "var(--vscode-textBlockQuote-background)",
        borderRadius: "6px",
        border: "1px solid var(--vscode-panel-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <VscAdd
          aria-hidden="true"
          style={{
            color: "var(--vscode-foreground)",
            flexShrink: 0,
            fontSize: "18px",
            marginTop: "1px",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            minWidth: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--vscode-foreground)",
            }}
          >
            Publish MCP server
          </h3>
          <p
            style={{
              fontSize: "13px",
              margin: 0,
              color: "var(--vscode-descriptionForeground)",
              lineHeight: 1.4,
            }}
          >
            Package, validate, price, and submit an MCP server from ValorIDE
            without losing marketplace context.
          </p>
        </div>
      </div>

      <div
        aria-label="MCP submission readiness checks"
        style={{
          display: "grid",
          gap: "6px",
          fontSize: "12px",
          color: "var(--vscode-descriptionForeground)",
        }}
      >
        {readinessChecks.map((check) => (
          <div
            key={check}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <VscChecklist aria-hidden="true" />
            <span>{check}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {mcpSubmitActions.map((action, index) => (
          <VSCodeButton
            key={action.label}
            appearance={index === 0 ? "primary" : "secondary"}
            onClick={() => dispatchMcpSubmitAction(action)}
          >
            {index === 1 ? <VscSettingsGear /> : <VscRocket />}
            {action.label}
          </VSCodeButton>
        ))}
      </div>
    </div>
  );
};

export default McpSubmitCard;
