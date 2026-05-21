import React from "react";
import type { WebviewMessage } from "@shared/WebviewMessage";
import { vscode } from "../../utils/vscode";

export type CapabilityStatus =
  | "ready"
  | "unauthenticated"
  | "quota"
  | "forbidden"
  | "unavailable"
  | "mcp_disconnected"
  | "swarm_error";

export interface AgenticCapability {
  id: string;
  label: string;
  status: CapabilityStatus;
  detail?: string;
  workspaceId?: string;
  projectId?: string;
}

interface RecoveryAction {
  label: string;
  message: Pick<WebviewMessage, "type" | "url" | "text">;
  kind: "primary" | "secondary";
}

interface CapabilityCommandCenterProps {
  capabilities: AgenticCapability[];
  returnTo?: string;
}

const VALKYR_BASE = "https://valkyrlabs.com";

const withContext = (
  path: string,
  capability: AgenticCapability,
  returnTo = "valoride://capability-recovery",
) => {
  const url = new URL(path, VALKYR_BASE);
  url.searchParams.set("source", "valoride");
  url.searchParams.set("capability", capability.id);
  url.searchParams.set("returnTo", returnTo);
  if (capability.workspaceId)
    url.searchParams.set("workspaceId", capability.workspaceId);
  if (capability.projectId)
    url.searchParams.set("projectId", capability.projectId);
  return url.toString();
};

export const getRecoveryActions = (
  capability: AgenticCapability,
  returnTo?: string,
): RecoveryAction[] => {
  switch (capability.status) {
    case "unauthenticated":
      return [
        {
          label: "Sign in",
          kind: "primary",
          message: { type: "accountLoginClicked" },
        },
        {
          label: "Activate workspace",
          kind: "secondary",
          message: {
            type: "openInBrowser",
            url: withContext("/valoride/activate", capability, returnTo),
          },
        },
      ];
    case "quota":
      return [
        {
          label: "Buy credits",
          kind: "primary",
          message: {
            type: "openInBrowser",
            url: withContext("/buy-credits", capability, returnTo),
          },
        },
        {
          label: "Retry after purchase",
          kind: "secondary",
          message: {
            type: "displayVSCodeInfo",
            text: "Retry the blocked ValorIDE capability after checkout returns.",
          },
        },
      ];
    case "forbidden":
      return [
        {
          label: "Request access",
          kind: "primary",
          message: {
            type: "openInBrowser",
            url: withContext("/valoride/access-request", capability, returnTo),
          },
        },
        {
          label: "Admin guide",
          kind: "secondary",
          message: {
            type: "openInBrowser",
            url: withContext(
              "/v1/docs/Products/ValorIDE/team-access",
              capability,
              returnTo,
            ),
          },
        },
      ];
    case "mcp_disconnected":
      return [
        {
          label: "Retry MCP",
          kind: "primary",
          message: { type: "fetchLatestMcpServersFromHub" },
        },
        {
          label: "Setup guide",
          kind: "secondary",
          message: {
            type: "openInBrowser",
            url: withContext(
              "/v1/docs/Products/ValorIDE/mcp-setup",
              capability,
              returnTo,
            ),
          },
        },
      ];
    case "swarm_error":
    case "unavailable":
      return [
        {
          label: "Run diagnostics",
          kind: "primary",
          message: {
            type: "displayVSCodeInfo",
            text: `Run ValorIDE diagnostics for ${capability.label}.`,
          },
        },
        {
          label: "Recovery guide",
          kind: "secondary",
          message: {
            type: "openInBrowser",
            url: withContext(
              "/v1/docs/Products/ValorIDE/recovery",
              capability,
              returnTo,
            ),
          },
        },
      ];
    case "ready":
    default:
      return [];
  }
};

const statusCopy: Record<CapabilityStatus, string> = {
  ready: "Ready",
  unauthenticated: "Sign-in needed",
  quota: "Quota blocked",
  forbidden: "Access blocked",
  unavailable: "Unavailable",
  mcp_disconnected: "MCP disconnected",
  swarm_error: "SWARM needs attention",
};

export const CapabilityCommandCenter: React.FC<
  CapabilityCommandCenterProps
> = ({ capabilities, returnTo }) => {
  const handleAction = (
    capability: AgenticCapability,
    action: RecoveryAction,
  ) => {
    vscode.postMessage({
      type: "displayVSCodeInfo",
      text: `valoride_capability_recovery_clicked:${capability.id}:${action.label}`,
    });
    vscode.postMessage(action.message);
  };

  return (
    <section
      aria-label="Agentic capability command center"
      style={{ display: "grid", gap: 8 }}
    >
      {capabilities.map((capability) => {
        const actions = getRecoveryActions(capability, returnTo);
        return (
          <article
            key={capability.id}
            style={{
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <strong>{capability.label}</strong>
              <span>{statusCopy[capability.status]}</span>
            </div>
            {capability.detail && (
              <p style={{ margin: "6px 0" }}>{capability.detail}</p>
            )}
            {actions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleAction(capability, action)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
};

export default CapabilityCommandCenter;
