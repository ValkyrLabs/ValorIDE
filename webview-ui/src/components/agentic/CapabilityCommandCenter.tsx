import React from "react";
import {
  FaBrain,
  FaCreditCard,
  FaNetworkWired,
  FaPlug,
  FaTimes,
  FaTerminal,
} from "react-icons/fa";
import type { AgenticCapabilityCommandCenterState } from "@shared/AgenticState";
import type { McpServer } from "@shared/mcp";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import { useMothershipOptional } from "@thorapi/context/MothershipContext";
import { vscode } from "@thorapi/utils/vscode";
import "./CapabilityCommandCenter.css";

type GrayMatterLike = {
  balanceCredits?: number;
  capabilities?: Record<string, boolean | undefined>;
  error?: string;
  estimatedUnlockCredits?: number;
  lastBlockedAction?: {
    capabilityId?: string;
    commandId?: string;
    label?: string;
  };
  status?: string;
};

type PillTone = "ok" | "warn" | "error";

const capabilityLabels: Array<[string, string]> = [
  ["agent", "agent"],
  ["grayMatter", "graymatter"],
  ["memoryQuery", "memory query"],
  ["memoryRead", "memory read"],
  ["memoryWrite", "memory write"],
  ["memoryEntry", "memory entry"],
  ["swarmOps", "swarm ops"],
  ["swarmGraph", "swarm graph"],
];

const titleCaseStatus = (value?: string): string => {
  if (!value) {
    return "Unknown";
  }
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const grayMatterLabel = (
  grayMatterSession?: GrayMatterLike,
): { detail: string; status: string; tone: PillTone } => {
  switch (grayMatterSession?.status) {
    case "ready":
      return { detail: "", status: "Ready", tone: "ok" };
    case "unauthenticated":
      return {
        detail: "Sign in to enable memory",
        status: "Sign in needed",
        tone: "warn",
      };
    case "forbidden":
      return { detail: "RBAC denied", status: "RBAC blocked", tone: "error" };
    case "quota":
      return { detail: "Quota reached", status: "Quota blocked", tone: "warn" };
    case "unavailable":
      return {
        detail: grayMatterSession?.error ?? "Capability discovery unavailable",
        status: "Unavailable",
        tone: "warn",
      };
    default:
      return {
        detail: "No capability check yet",
        status: "Unknown",
        tone: "warn",
      };
  }
};

const enabledCapabilityLabel = (grayMatterSession?: GrayMatterLike): string => {
  const capabilities = grayMatterSession?.capabilities ?? {};
  const labels = capabilityLabels
    .filter(([key]) => capabilities[key])
    .map(([, label]) => label);
  return labels.length > 0 ? labels.join(", ") : "No remote capabilities";
};

const mcpSummary = (
  servers?: McpServer[],
): { label: string; tone: PillTone } => {
  const list = Array.isArray(servers) ? servers : [];
  const connected = list.filter(
    (server) => !server.disabled && server.status === "connected",
  ).length;
  const hasFailure = list.some(
    (server) => !server.disabled && server.status === "disconnected",
  );
  return {
    label: `MCP ${connected}/${list.length}`,
    tone: hasFailure ? "warn" : connected > 0 ? "ok" : "warn",
  };
};

const swarmSummary = (
  agenticState?: AgenticCapabilityCommandCenterState,
  websocketState?: { instanceId?: string | null; isConnected?: boolean },
): { detail: string; label: string; tone: PillTone } => {
  const swarm = agenticState?.swarm;
  const status =
    websocketState?.isConnected &&
    (!swarm?.status || swarm.status === "offline")
      ? "online"
      : (swarm?.status ?? "offline");
  const tone: PillTone =
    status === "online" || status === "busy"
      ? "ok"
      : status === "error" || status === "rejected"
        ? "error"
        : "warn";
  return {
    detail:
      websocketState?.instanceId ??
      swarm?.instanceId ??
      swarm?.lastError ??
      "No registration ACK",
    label: `SWARM ${titleCaseStatus(status)}`,
    tone,
  };
};

const formatElapsed = (elapsedMs?: number): string => {
  if (typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs)) {
    return "";
  }
  if (elapsedMs < 1000) {
    return `${Math.max(0, Math.round(elapsedMs))}ms`;
  }
  return `${(elapsedMs / 1000).toFixed(1)}s`;
};

const commandStatus = (
  command: AgenticCapabilityCommandCenterState["recentCommands"][number],
): string => {
  const elapsed = formatElapsed(command.elapsedMs);
  return elapsed && command.status === "completed"
    ? `completed in ${elapsed}`
    : titleCaseStatus(command.status);
};

const commandFailureDetail = (
  command:
    | AgenticCapabilityCommandCenterState["recentCommands"][number]
    | undefined,
): string | undefined => {
  if (!command || command.status !== "failed") {
    return undefined;
  }
  return [
    command.toolLabel,
    command.capabilityId,
    command.requiresApproval ? "approval required" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
};

const hostedUrl = (path: string, state: Record<string, any>): URL => {
  const configuredHost = state.apiConfiguration?.valkyraiHost;
  let origin = "https://valkyrlabs.com";
  if (typeof configuredHost === "string" && configuredHost.length > 0) {
    try {
      origin = new URL(configuredHost).origin;
    } catch {
      origin = "https://valkyrlabs.com";
    }
  }
  return new URL(path, origin);
};

const quotaActionContext = (
  grayMatterSession: GrayMatterLike | undefined,
  latestCommand:
    | AgenticCapabilityCommandCenterState["recentCommands"][number]
    | undefined,
) => {
  const blocked = grayMatterSession?.lastBlockedAction;
  return {
    capabilityId: blocked?.capabilityId ?? latestCommand?.capabilityId,
    commandId: blocked?.commandId ?? latestCommand?.commandId,
    label: blocked?.label ?? latestCommand?.toolLabel,
  };
};

const quotaRecoveryUrl = (
  path: string,
  state: Record<string, any>,
  grayMatterSession: GrayMatterLike | undefined,
  latestCommand:
    | AgenticCapabilityCommandCenterState["recentCommands"][number]
    | undefined,
): string => {
  const url = hostedUrl(path, state);
  const context = quotaActionContext(grayMatterSession, latestCommand);
  url.searchParams.set("source", "valoride-graymatter-quota");
  url.searchParams.set("intent", "resume-blocked-action");
  url.searchParams.set("returnTo", valorideReturnTo("resume_blocked_action"));
  if (context.capabilityId) {
    url.searchParams.set("capability", context.capabilityId);
  }
  if (context.commandId) {
    url.searchParams.set("resumeCommand", context.commandId);
  }
  if (context.label) {
    url.searchParams.set("action", context.label);
  }
  return url.toString();
};

const valorideReturnTo = (action: string): string =>
  `valoride://agentic-command-center/recovery?action=${encodeURIComponent(action)}`;

const trackRecoveryAction = (
  status: string | undefined,
  action: string,
  surface: "graymatter" | "mcp",
) => {
  vscode.postMessage({
    event: "valoride_activation_recovery_action",
    payload: {
      action,
      status: status ?? "unknown",
      surface,
    },
    type: "trackFunnelEvent",
  });
};

const formatCredits = (value?: number): string | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return `${value.toLocaleString()} credits`;
};

const StatusPill = ({
  detail,
  icon,
  title,
  tone,
}: {
  detail?: string;
  icon: React.ReactNode;
  title: string;
  tone: PillTone;
}) => (
  <div
    className={`capability-command-center__pill capability-command-center__pill--${tone}`}
  >
    {icon}
    <span className="capability-command-center__pill-title">{title}</span>
    {detail ? (
      <span className="capability-command-center__pill-detail">{detail}</span>
    ) : null}
  </div>
);

const GrayMatterQuotaRecovery = ({
  grayMatterSession,
  latestCommand,
  state,
}: {
  grayMatterSession?: GrayMatterLike;
  latestCommand?: AgenticCapabilityCommandCenterState["recentCommands"][number];
  state: Record<string, any>;
}) => {
  const balance = formatCredits(grayMatterSession?.balanceCredits);
  const unlockCost = formatCredits(grayMatterSession?.estimatedUnlockCredits);
  const context = quotaActionContext(grayMatterSession, latestCommand);
  const blockedAction = context.capabilityId ?? "GrayMatter action";

  const openRecoveryUrl = (path: string, action: string) => {
    trackRecoveryAction(grayMatterSession?.status, action, "graymatter");
    vscode.postMessage({
      type: "openInBrowser",
      url: quotaRecoveryUrl(path, state, grayMatterSession, latestCommand),
    });
  };
  const retryBlockedAction = () => {
    trackRecoveryAction(
      grayMatterSession?.status,
      "retry_after_recharge",
      "graymatter",
    );
    vscode.postMessage({
      type: "retryGrayMatterBlockedAction",
      resumeCommandId: context.commandId,
      resumeCapabilityId: context.capabilityId,
      resumeActionLabel: context.label,
    });
  };

  return (
    <div className="capability-command-center__quota" role="alert">
      <div className="capability-command-center__quota-copy">
        <FaCreditCard aria-hidden="true" />
        <span>
          GrayMatter is waiting on credits for <strong>{blockedAction}</strong>.
          {balance ? ` Balance: ${balance}.` : ""}
          {unlockCost ? ` Estimated unlock: ${unlockCost}.` : ""}
        </span>
      </div>
      <div className="capability-command-center__quota-actions">
        <button
          type="button"
          onClick={() => openRecoveryUrl("/buy-credits", "recharge_credits")}
        >
          Recharge credits
        </button>
        <button
          type="button"
          onClick={() => openRecoveryUrl("/pricing", "upgrade_plan")}
        >
          Upgrade plan
        </button>
        <button
          type="button"
          onClick={() => {
            trackRecoveryAction(
              grayMatterSession?.status,
              "view_usage",
              "graymatter",
            );
            vscode.postMessage({ type: "showAccountViewClicked" });
          }}
        >
          View usage
        </button>
        {context.commandId ? (
          <button type="button" onClick={retryBlockedAction}>
            Retry after recharge
          </button>
        ) : null}
      </div>
    </div>
  );
};

const GrayMatterRecoveryActions = ({
  grayMatterSession,
  isSignedIn,
}: {
  grayMatterSession?: GrayMatterLike;
  isSignedIn: boolean;
}) => {
  if (grayMatterSession?.status === "unauthenticated") {
    if (isSignedIn) {
      return null;
    }

    return (
      <div className="capability-command-center__quota" role="alert">
        <div className="capability-command-center__quota-copy">
          <FaCreditCard aria-hidden="true" />
          <span>Sign in to ValkyrAI to enable GrayMatter memory.</span>
        </div>
        <div className="capability-command-center__quota-actions">
          <button
            type="button"
            onClick={() => {
              trackRecoveryAction(
                grayMatterSession?.status,
                "sign_in",
                "graymatter",
              );
              vscode.postMessage({ type: "showAccountViewClicked" });
            }}
          >
            Sign in to ValkyrAI
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const CapabilityCommandCenter = () => {
  const state = useExtensionState() as Record<string, any>;
  const mothership = useMothershipOptional();
  const isSignedIn = Boolean(
    state.isLoggedIn ||
      state.jwtToken ||
      state.authenticatedUser ||
      state.userInfo ||
      state.authenticatedPrincipal,
  );
  const grayMatterSession = state.grayMatterSession as
    | GrayMatterLike
    | undefined;
  const agenticState = state.agenticState as
    | AgenticCapabilityCommandCenterState
    | undefined;
  const mcpServers = state.mcpServers;
  const grayMatter = grayMatterLabel(grayMatterSession);
  const mcp = mcpSummary(mcpServers);
  const swarm = swarmSummary(agenticState, {
    instanceId: mothership?.instanceId,
    isConnected: mothership?.isConnected,
  });
  const recentCommands = agenticState?.recentCommands ?? [];
  const latestCommand = recentCommands[0];
  const [dismissedPrompts, setDismissedPrompts] = React.useState<
    Record<string, boolean>
  >({});
  return (
    <section
      className="capability-command-center"
      aria-label="Agentic command center"
    >
      <div className="capability-command-center__grid">
        <StatusPill
          detail={enabledCapabilityLabel(grayMatterSession)}
          icon={<FaBrain aria-hidden="true" />}
          title={`GrayMatter ${grayMatter.status}`}
          tone={grayMatter.tone}
        />
        <StatusPill
          detail={swarm.detail}
          icon={<FaNetworkWired aria-hidden="true" />}
          title={swarm.label}
          tone={swarm.tone}
        />
        <StatusPill
          detail={
            state.agenticState?.approvalPolicy
              ? `approval: ${state.agenticState.approvalPolicy}`
              : undefined
          }
          icon={<FaPlug aria-hidden="true" />}
          title={mcp.label}
          tone={mcp.tone}
        />

        {latestCommand ? (
          <div className="capability-command-center__command">
            <span className="capability-command-center__command-meta">
              <FaTerminal aria-hidden="true" />
              <span className="capability-command-center__command-id">
                {latestCommand.capabilityId}
              </span>
            </span>
            <span className="capability-command-center__command-status">
              {commandStatus(latestCommand)}
            </span>
            {commandFailureDetail(latestCommand) ? (
              <span className="capability-command-center__command-detail">
                {commandFailureDetail(latestCommand)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {grayMatterSession?.status === "quota" ? (
        <GrayMatterQuotaRecovery
          grayMatterSession={grayMatterSession}
          latestCommand={latestCommand}
          state={state}
        />
      ) : null}
      {grayMatterSession?.status !== "quota" ? (
        <div className="capability-command-center__dismissible">
          {!dismissedPrompts[`graymatter-${grayMatterSession?.status}`] ? (
            <>
              <GrayMatterRecoveryActions
                grayMatterSession={grayMatterSession}
                isSignedIn={isSignedIn}
              />
              {grayMatterSession?.status === "unauthenticated" &&
              !isSignedIn ? (
                <button
                  aria-label="Dismiss GrayMatter sign-in prompt"
                  className="capability-command-center__dismiss"
                  type="button"
                  onClick={() =>
                    setDismissedPrompts((prev) => ({
                      ...prev,
                      [`graymatter-${grayMatterSession?.status}`]: true,
                    }))
                  }
                >
                  <FaTimes aria-hidden="true" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default CapabilityCommandCenter;
