import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

export type CapabilityId = "graymatter" | "mcp" | "swarm";

export type CapabilityStatus =
  | "ready"
  | "unauthenticated"
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

type CapabilityCommandCenterProps = {
  snapshots: CapabilitySnapshot[];
  onAction: (action: CapabilityAction, capability: CapabilityCardModel) => void;
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
      detail: "Authenticate ValorIDE before using agentic capabilities.",
      variant: "primary",
    },
    {
      action: "setupGrayMatter",
      label: "Create workspace",
      detail: "Start the GrayMatter workspace activation path.",
      variant: "secondary",
    },
  ],
  rbacDenied: [
    {
      action: "teamPlan",
      label: "Request team access",
      detail: "Open the team-plan path for RBAC and entitlement recovery.",
      variant: "primary",
    },
    {
      action: "openDiagnostics",
      label: "Open diagnostics",
      detail: "Inspect the active account, workspace, and API host state.",
      variant: "secondary",
    },
  ],
  quotaBlocked: [
    {
      action: "buyCredits",
      label: "Buy credits",
      detail: "Preserve the blocked action and route to credit recovery.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry after purchase",
      detail: "Refresh balance, usage, payments, and MCP discovery.",
      variant: "secondary",
    },
  ],
  lowCredit: [
    {
      action: "buyCredits",
      label: "Add credits",
      detail: "Top up before longer agentic runs exhaust the balance.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Refresh balance",
      detail: "Reconcile the latest account balance and usage.",
      variant: "secondary",
    },
  ],
  unavailable: [
    {
      action: "openDiagnostics",
      label: "Open diagnostics",
      detail: "Inspect local transport and backend availability.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry discovery",
      detail: "Retry capability discovery after the service recovers.",
      variant: "secondary",
    },
  ],
  disconnected: [
    {
      action: "openMcpMarketplace",
      label: "Open MCP marketplace",
      detail: "Connect or repair MCP tools for the current workspace.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry MCP",
      detail: "Refresh the latest MCP server catalog.",
      variant: "secondary",
    },
  ],
  offline: [
    {
      action: "openDiagnostics",
      label: "Open diagnostics",
      detail: "Inspect SWARM presence and connection state.",
      variant: "primary",
    },
    {
      action: "retry",
      label: "Retry discovery",
      detail: "Refresh capability state after reconnecting.",
      variant: "secondary",
    },
  ],
};

const toneColor: Record<CapabilityCardModel["tone"], string> = {
  ready: "var(--vscode-testing-iconPassed)",
  warning: "var(--vscode-editorWarning-foreground)",
  danger: "var(--vscode-errorForeground)",
};

export const deriveCapabilityCards = (
  snapshots: CapabilitySnapshot[],
): CapabilityCardModel[] =>
  snapshots.map((snapshot) => {
    const status = STATUS_COPY[snapshot.status];
    return {
      ...snapshot,
      tone: status.tone,
      statusLabel: status.label,
      actions: ACTIONS_BY_STATUS[snapshot.status],
    };
  });

const safeFailureMessage = (message: string) =>
  message.replace(/(token|jwt|secret|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");

const CapabilityCommandCenter = ({
  snapshots,
  onAction,
}: CapabilityCommandCenterProps) => {
  const cards = deriveCapabilityCards(snapshots);

  return (
    <section
      aria-label="ValorIDE command center"
      style={{
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: 8,
        background: "var(--vscode-sideBar-background)",
        display: "grid",
        gap: 10,
        marginBottom: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, margin: 0 }}>Command Center</h2>
          <p
            style={{
              color: "var(--vscode-descriptionForeground)",
              fontSize: 12,
              margin: "4px 0 0",
            }}
          >
            Account, credits, MCP, SWARM, and GrayMatter capability state.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        }}
      >
        {cards.map((card) => (
          <article
            key={`${card.id}-${card.label}`}
            style={{
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: 8,
              padding: 10,
              background: "var(--vscode-editor-background)",
              display: "grid",
              gap: 8,
              minWidth: 0,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>{card.label}</strong>
                <span
                  style={{
                    color: toneColor[card.tone],
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.statusLabel}
                </span>
              </div>
              {card.detail && (
                <p
                  style={{
                    color: "var(--vscode-descriptionForeground)",
                    fontSize: 12,
                    margin: 0,
                  }}
                >
                  {card.detail}
                </p>
              )}
              {card.latestFailure && (
                <p
                  style={{
                    color: "var(--vscode-descriptionForeground)",
                    fontSize: 12,
                    margin: 0,
                  }}
                >
                  <strong>Latest failure:</strong> {card.latestFailure.command} -{" "}
                  {safeFailureMessage(card.latestFailure.message)}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {card.actions.map((action) => (
                <VSCodeButton
                  key={action.action}
                  appearance={action.variant === "primary" ? "primary" : "secondary"}
                  onClick={() => onAction(action.action, card)}
                  title={action.detail}
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
};

export default CapabilityCommandCenter;
