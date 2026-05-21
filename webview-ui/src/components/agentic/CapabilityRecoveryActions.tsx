import { memo, useCallback, useMemo } from "react";

import { vscode } from "@thorapi/utils/vscode";

export type CapabilityKind = "graymatter" | "mcp" | "swarm" | "credits";

export type CapabilityStatus =
  | "ready"
  | "unauthenticated"
  | "rbac_denied"
  | "quota_blocked"
  | "low_credit"
  | "unavailable"
  | "disconnected"
  | "offline";

export type CapabilityFailure = {
  code?: string;
  message?: string;
  commandId?: string;
  occurredAt?: string;
};

export type CapabilityRecoveryAction = {
  id: string;
  label: string;
  command: string;
  route?: string;
  telemetryIntent: "activation" | "upsell" | "diagnostic" | "retry";
  detail: string;
};

export type CapabilityRecoveryActionsProps = {
  capability: CapabilityKind;
  status: CapabilityStatus;
  latestFailure?: CapabilityFailure;
  source?: string;
};

const SECRETISH = /(bearer\s+)?[A-Za-z0-9_=-]{24,}\.[A-Za-z0-9_=-]{12,}\.[A-Za-z0-9_=-]{12,}|sk_(live|test)_[A-Za-z0-9]+|xox[baprs]-[A-Za-z0-9-]+|gh[pousr]_[A-Za-z0-9_]+/gi;

export const sanitizeCapabilityText = (value?: string): string => {
  if (!value) {
    return "";
  }

  return value.replace(SECRETISH, "[redacted]");
};

export const getCapabilityRecoveryActions = (
  capability: CapabilityKind,
  status: CapabilityStatus,
): CapabilityRecoveryAction[] => {
  if (status === "ready") {
    return [];
  }

  if (capability === "graymatter") {
    if (status === "unauthenticated") {
      return [
        {
          id: "graymatter-sign-in",
          label: "Sign in",
          command: "valoride.account.signIn",
          route: "account:login",
          telemetryIntent: "activation",
          detail: "Connect your Valkyr account before memory writes leave this workspace.",
        },
        {
          id: "graymatter-setup",
          label: "Open setup",
          command: "valoride.graymatter.openSetup",
          route: "graymatter:setup",
          telemetryIntent: "activation",
          detail: "Finish GrayMatter workspace activation without exposing tokens in the webview.",
        },
      ];
    }

    if (status === "rbac_denied") {
      return [
        {
          id: "graymatter-team-plan",
          label: "Request team access",
          command: "valoride.billing.openTeamPlan",
          route: "billing:team-plan?intent=graymatter-rbac",
          telemetryIntent: "upsell",
          detail: "Your account is signed in, but this workspace needs a role or team plan with memory access.",
        },
        {
          id: "graymatter-diagnostics",
          label: "Open diagnostics",
          command: "valoride.diagnostics.open",
          route: "diagnostics:graymatter-rbac",
          telemetryIntent: "diagnostic",
          detail: "Show safe role and workspace checks without printing secrets.",
        },
      ];
    }

    if (status === "quota_blocked" || status === "low_credit") {
      return [
        {
          id: "graymatter-buy-credits",
          label: "Buy credits",
          command: "valoride.billing.buyCredits",
          route: "billing:buy-credits?intent=graymatter-memory",
          telemetryIntent: "upsell",
          detail: "Recharge and return to the blocked memory command.",
        },
        {
          id: "graymatter-team-plan",
          label: "Upgrade team plan",
          command: "valoride.billing.openTeamPlan",
          route: "billing:team-plan?intent=graymatter-quota",
          telemetryIntent: "upsell",
          detail: "Move recurring memory usage to a team plan instead of one-off top-ups.",
        },
      ];
    }

    return [
      {
        id: "graymatter-retry",
        label: "Retry memory check",
        command: "valoride.graymatter.retry",
        route: "graymatter:retry",
        telemetryIntent: "retry",
        detail: "Retry the memory health check after the service recovers.",
      },
      {
        id: "graymatter-diagnostics",
        label: "Open diagnostics",
        command: "valoride.diagnostics.open",
        route: "diagnostics:graymatter",
        telemetryIntent: "diagnostic",
        detail: "Inspect safe service health, auth, and workspace signals.",
      },
    ];
  }

  if (capability === "mcp") {
    return [
      {
        id: "mcp-marketplace",
        label: "Open MCP marketplace",
        command: "valoride.mcp.openMarketplace",
        route: "mcp:marketplace",
        telemetryIntent: "activation",
        detail: "Install or reconnect MCP services from the marketplace.",
      },
      {
        id: "mcp-diagnostics",
        label: "Check connection",
        command: "valoride.diagnostics.open",
        route: "diagnostics:mcp",
        telemetryIntent: "diagnostic",
        detail: "Verify MCP server configuration without showing credentials.",
      },
    ];
  }

  if (capability === "swarm") {
    return [
      {
        id: "swarm-reconnect",
        label: "Reconnect SWARM",
        command: "valoride.swarm.reconnect",
        route: "swarm:reconnect",
        telemetryIntent: "activation",
        detail: "Reconnect the local SWARM bridge and refresh agent presence.",
      },
      {
        id: "swarm-diagnostics",
        label: "Open diagnostics",
        command: "valoride.diagnostics.open",
        route: "diagnostics:swarm",
        telemetryIntent: "diagnostic",
        detail: "Inspect offline SWARM state with token-safe logs.",
      },
    ];
  }

  return [
    {
      id: "credits-buy",
      label: "Buy credits",
      command: "valoride.billing.buyCredits",
      route: "billing:buy-credits?intent=capability-shortfall",
      telemetryIntent: "upsell",
      detail: "Recharge credits and resume the blocked capability command.",
    },
  ];
};

const titleCase = (value: string) =>
  value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const CapabilityRecoveryActions = ({
  capability,
  status,
  latestFailure,
  source = "capability-command-center",
}: CapabilityRecoveryActionsProps) => {
  const actions = useMemo(
    () => getCapabilityRecoveryActions(capability, status),
    [capability, status],
  );

  const safeFailure = sanitizeCapabilityText(latestFailure?.message);
  const safeCode = sanitizeCapabilityText(latestFailure?.code);

  const sendAction = useCallback(
    (action: CapabilityRecoveryAction) => {
      vscode.postMessage({
        type: "capabilityRecoveryActionClicked",
        payload: {
          actionId: action.id,
          capability,
          command: action.command,
          failureCode: safeCode || undefined,
          intent: action.telemetryIntent,
          route: action.route,
          source,
          status,
        },
      });
    },
    [capability, safeCode, source, status],
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={`${titleCase(capability)} recovery actions`}
      style={{
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: 8,
        padding: 12,
        background: "var(--vscode-editor-background)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <strong>{titleCase(capability)} needs attention</strong>
        <span style={{ color: "var(--vscode-descriptionForeground)" }}>
          {titleCase(status)}. Choose a safe next step to recover without exposing secrets.
        </span>
        {(safeFailure || safeCode) && (
          <span
            title={safeFailure || safeCode}
            style={{ color: "var(--vscode-descriptionForeground)", fontSize: 12 }}
          >
            Latest failure: {safeCode ? `${safeCode} — ` : ""}
            {safeFailure || "See diagnostics for details."}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-intent={action.telemetryIntent}
            title={action.detail}
            onClick={() => sendAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default memo(CapabilityRecoveryActions);
