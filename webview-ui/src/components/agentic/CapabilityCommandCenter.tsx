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
  | "rechargeCredits"
  | "upgradePlan"
  | "viewUsage"
  | "openMcpMarketplace"
  | "openDiagnostics"
  | "retry"
  | "retryAfterRecharge";

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
  balanceCredits?: number;
  estimatedUnlockCredits?: number;
  blockedAction?: string;
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
  recoverySummary?: string;
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
      action: "upgradePlan",
      label: "Team access",
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
      action: "rechargeCredits",
      label: "Recharge credits",
      detail: "Preserve the blocked action and route to credit recovery.",
      variant: "primary",
    },
    {
      action: "upgradePlan",
      label: "Upgrade plan",
      detail: "Open plan upgrade options for sustained memory usage.",
      variant: "secondary",
    },
    {
      action: "viewUsage",
      label: "View usage",
      detail: "Review balance, usage, and recent payments before checkout.",
      variant: "secondary",
    },
    {
      action: "retryAfterRecharge",
      label: "Retry after recharge",
      detail: "Refresh credits and retry the blocked capability context.",
      variant: "secondary",
    },
  ],
  lowCredit: [
    {
      action: "rechargeCredits",
      label: "Add credits",
      detail: "Top up before longer agentic runs exhaust the balance.",
      variant: "primary",
    },
    {
      action: "viewUsage",
      label: "View usage",
      detail: "Review balance, usage, and recent payments.",
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

const FALLBACK_DETAIL: Record<CapabilityId, string> = {
  graymatter:
    "Durable memory needs auth, entitlement, credits, and API reachability.",
  mcp: "MCP needs at least one connected server before tools can recover workflows.",
  swarm: "SWARM needs local and ValkyrAI connectivity for multi-agent handoff.",
};

const formatCredits = (credits?: number): string =>
  typeof credits === "number" && Number.isFinite(credits)
    ? credits.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "unknown";

const buildQuotaSummary = (snapshot: CapabilitySnapshot): string | undefined => {
  if (snapshot.status !== "quotaBlocked" && snapshot.status !== "lowCredit") {
    return undefined;
  }

  const action = snapshot.blockedAction || "GrayMatter memory";
  const balance = formatCredits(snapshot.balanceCredits);
  const cost = formatCredits(snapshot.estimatedUnlockCredits);

  if (snapshot.status === "quotaBlocked") {
    return `${action} is paused. Balance: ${balance} credits. Estimated unlock: ${cost} credits.`;
  }

  return `${action} is close to quota. Balance: ${balance} credits. Estimated next use: ${cost} credits.`;
};

export const deriveCapabilityCards = (
  snapshots: CapabilitySnapshot[],
): CapabilityCardModel[] =>
  snapshots.map((snapshot) => {
    const status = STATUS_COPY[snapshot.status];
    const recoverySummary = buildQuotaSummary(snapshot);
    return {
      ...snapshot,
      tone: status.tone,
      statusLabel: status.label,
      detail: snapshot.detail || recoverySummary || FALLBACK_DETAIL[snapshot.id],
      actions: ACTIONS_BY_STATUS[snapshot.status],
      recoverySummary,
    };
  });

const EXTERNAL_RECOVERY_ROUTES: Partial<Record<CapabilityAction, string>> = {
  signIn: "https://valkyrlabs.com/signup",
  setupGrayMatter: "https://valkyrlabs.com/graymatter/install",
  rechargeCredits: "https://valkyrlabs.com/buy-credits",
  upgradePlan: "https://valkyrlabs.com/pricing",
};

const INTENT_BY_ACTION: Partial<Record<CapabilityAction, string>> = {
  signIn: "valoride-signin",
  setupGrayMatter: "graymatter-activation",
  rechargeCredits: "credit-recovery",
  upgradePlan: "team-plan",
};

export const buildCapabilityRecoveryUrl = (
  action: CapabilityAction,
  capability: Pick<CapabilityCardModel, "id" | "status">,
) => {
  const baseUrl = EXTERNAL_RECOVERY_ROUTES[action];
  if (!baseUrl) {
    return undefined;
  }

  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    source: "valoride",
    utm_source: "valoride",
    utm_campaign: "capability-command-center",
    intent: INTENT_BY_ACTION[action] ?? action,
    product: "ValorIDE",
    capability: capability.id,
    blockedState: capability.status,
    returnTo: "valoride://capability-command-center",
  }).toString();

  return url.toString();
};

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
