import React from "react";
import type { WebviewMessage } from "@shared/WebviewMessage";
import { vscode } from "../../utils/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

export type CapabilityId = "graymatter" | "mcp" | "swarm";

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
  | "rbacDenied"
  | "quotaBlocked"
  | "lowCredit"
  | "unavailable"
  | "disconnected"
  | "offline";

export type CapabilityAction =
  | "signIn"
  | "setupGrayMatter"
  | "buyCredits"
  | "teamPlan"
  | "openMcpMarketplace"
  | "openDiagnostics"
  | "retry";

export type LatestCommandFailure = {
  command: string;
  message: string;
  occurredAt?: string;
};

export type CapabilitySnapshot = {
  id: CapabilityId;
  label: string;
  status: CapabilityStatus;
  detail?: string;
  latestFailure?: LatestCommandFailure;
};

export type CapabilityActionModel = {
  action: CapabilityAction;
  label: string;
  detail: string;
  variant?: "primary" | "secondary";
};

export type CapabilityCardModel = CapabilitySnapshot & {
  tone: "ready" | "warning" | "danger";
  statusLabel: string;
  actions: CapabilityActionModel[];
};

const STATUS_COPY: Record<
  CapabilityStatus,
  { label: string; tone: CapabilityCardModel["tone"] }
> = {
  ready: { label: "Ready", tone: "ready" },
  unauthenticated: { label: "Sign in needed", tone: "warning" },
  rbacDenied: { label: "RBAC blocked", tone: "danger" },
  quotaBlocked: { label: "Quota blocked", tone: "danger" },
  lowCredit: { label: "Low credits", tone: "warning" },
  unavailable: { label: "Unavailable", tone: "danger" },
  disconnected: { label: "Disconnected", tone: "warning" },
  offline: { label: "Offline", tone: "warning" },
};

const ACTIONS_BY_STATUS: Record<CapabilityStatus, CapabilityActionModel[]> = {
  ready: [
    {
      action: "retry",
      label: "Refresh",
      detail: "Refresh live capability state.",
      variant: "secondary",
    },
  ],
  unauthenticated: [
    {
      action: "signIn",
      label: "Sign in to ValkyrAI",
      detail: "Authenticate ValorIDE before using GrayMatter memory.",
      variant: "primary",
    },
    {
      action: "setupGrayMatter",
      label: "Create workspace",
      detail: "Open the activation path and return to ValorIDE when setup completes.",
      variant: "secondary",
    },
  ],
  rbacDenied: [
    {
      action: "teamPlan",
      label: "Team access",
      detail:
        "Open the team-plan path when your org role blocks memory writes.",
      variant: "primary",
    },
    {
      action: "openDiagnostics",
      label: "Diagnostics",
      detail: "Open diagnostics without exposing tokens or secrets.",
      variant: "secondary",
    },
  ],
  quotaBlocked: [
    {
      action: "buyCredits",
      label: "Buy credits",
      detail: "Recharge credits before retrying the failed capability.",
      variant: "primary",
    },
    {
      action: "teamPlan",
      label: "Upgrade team plan",
      detail: "Open plan upgrade options for sustained memory usage.",
      variant: "secondary",
    },
  ],
  lowCredit: [
    {
      action: "buyCredits",
      label: "Add credits",
      detail: "Top up before the next agentic command is blocked.",
      variant: "primary",
    },
  ],
  unavailable: [
    {
      action: "openDiagnostics",
      label: "Diagnostics",
      detail: "Open server-console diagnostics for the unavailable service.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry",
      detail: "Retry capability discovery after diagnostics.",
      variant: "secondary",
    },
  ],
  disconnected: [
    {
      action: "openMcpMarketplace",
      label: "Open MCP marketplace",
      detail: "Install or reconnect MCP tools from the marketplace.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry connection",
      detail: "Refresh installed MCP server state.",
      variant: "secondary",
    },
  ],
  offline: [
    {
      action: "openDiagnostics",
      label: "Open diagnostics",
      detail: "Inspect SWARM and server-console connectivity.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry",
      detail: "Retry SWARM presence discovery.",
      variant: "secondary",
    },
  ],
};

const FALLBACK_DETAIL: Record<CapabilityId, string> = {
  graymatter:
    "Durable memory needs auth, entitlement, credits, and API reachability.",
  mcp: "MCP needs at least one connected server before tools can recover workflows.",
  swarm: "SWARM needs local and ValkyrAI connectivity for multi-agent handoff.",
};

export function deriveCapabilityCards(
  snapshots: CapabilitySnapshot[],
): CapabilityCardModel[] {
  return snapshots.map((snapshot) => {
    const copy = STATUS_COPY[snapshot.status];
    return {
      ...snapshot,
      tone: copy.tone,
      statusLabel: copy.label,
      detail: snapshot.detail || FALLBACK_DETAIL[snapshot.id],
      actions: ACTIONS_BY_STATUS[snapshot.status],
    };
  });
}

type CapabilityCommandCenterProps = {
  snapshots: CapabilitySnapshot[];
  onAction: (action: CapabilityAction, capability: CapabilityCardModel) => void;
};

export default function CapabilityCommandCenter({
  snapshots,
  onAction,
}: CapabilityCommandCenterProps) {
  const cards = deriveCapabilityCards(snapshots);

  return (
    <section
      aria-label="Capability Command Center"
      style={{
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: 10,
        padding: 12,
        margin: "0 0 16px",
        background: "var(--vscode-editor-background)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>Capability Command Center</h3>
          <p
            style={{
              margin: "4px 0 12px",
              color: "var(--vscode-descriptionForeground)",
              fontSize: 12,
            }}
          >
            Recovery actions stay inside ValorIDE and avoid exposing raw auth
            state.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {cards.map((card) => (
          <article
            key={card.id}
            data-testid={`capability-card-${card.id}`}
            style={{
              border: "1px solid var(--vscode-panel-border)",
              borderLeft: `4px solid ${
                card.tone === "ready"
                  ? "var(--vscode-testing-iconPassed)"
                  : card.tone === "danger"
                    ? "var(--vscode-testing-iconFailed)"
                    : "var(--vscode-testing-iconQueued)"
              }`,
              borderRadius: 8,
              padding: 10,
              background: "var(--vscode-sideBar-background)",
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
                gap: 10,
              }}
            >
              <strong>{card.label}</strong>
              <span
                aria-label={`${card.label} status`}
                style={{
                  border: "1px solid var(--vscode-panel-border)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                }}
              >
                {card.statusLabel}
              </span>
            </div>
            <p
              style={{
                margin: "6px 0",
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              {card.detail}
            </p>
            {card.latestFailure && (
              <div
                role="note"
                title={card.latestFailure.message}
                style={{
                  fontSize: 12,
                  color: "var(--vscode-descriptionForeground)",
                  marginBottom: 8,
                }}
              >
                Latest failure: <strong>{card.latestFailure.command}</strong> —{" "}
                {card.latestFailure.message}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {card.actions.map((action) => (
                <VSCodeButton
                  key={`${card.id}-${action.action}`}
                  appearance={
                    action.variant === "primary" ? "primary" : "secondary"
                  }
                  title={action.detail}
                  onClick={() => onAction(action.action, card)}
                >
                  {action.label}
                </VSCodeButton>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
