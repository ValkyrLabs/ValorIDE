import React from "react";
import {
  FaBrain,
  FaCreditCard,
  FaNetworkWired,
  FaPlug,
  FaRobot,
  FaTerminal,
} from "react-icons/fa";
import type { AgenticCapabilityCommandCenterState } from "@shared/AgenticState";
import type { ApiConfiguration } from "@shared/api";
import type { McpServer } from "@shared/mcp";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
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

const providerModelFields: Array<keyof ApiConfiguration> = [
  "apiModelId",
  "openRouterModelId",
  "requestyModelId",
  "togetherModelId",
  "ollamaModelId",
  "lmStudioModelId",
  "openAiModelId",
  "liteLlmModelId",
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

const hostLabel = (host?: string): string => {
  if (!host) {
    return "Host not set";
  }
  try {
    return new URL(host).host;
  } catch {
    return host.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || host;
  }
};

const userLabel = (state: Record<string, any>): string => {
  const principal = state.authenticatedUser ?? state.userInfo;
  return (
    principal?.username ||
    principal?.email ||
    principal?.id ||
    principal?.subject ||
    "Not signed in"
  );
};

const modelLabel = (
  config?: ApiConfiguration,
  selectedLlmDetails?: { id?: string; name?: string },
): string => {
  const provider = config?.apiProvider ?? "provider";
  const selectedModel =
    providerModelFields
      .map((field) => config?.[field])
      .find(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ) ||
    config?.vsCodeLmModelSelector?.id ||
    selectedLlmDetails?.name ||
    selectedLlmDetails?.id ||
    "model not selected";

  return `${provider} / ${selectedModel}`;
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
): { detail: string; label: string; tone: PillTone } => {
  const swarm = agenticState?.swarm;
  const status = swarm?.status ?? "offline";
  const tone: PillTone =
    status === "online" || status === "busy"
      ? "ok"
      : status === "error" || status === "rejected"
        ? "error"
        : "warn";
  return {
    detail: swarm?.instanceId ?? swarm?.lastError ?? "No registration ACK",
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

  const openRecoveryUrl = (path: string) => {
    vscode.postMessage({
      type: "openInBrowser",
      url: quotaRecoveryUrl(path, state, grayMatterSession, latestCommand),
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
        <button type="button" onClick={() => openRecoveryUrl("/buy-credits")}>
          Recharge credits
        </button>
        <button type="button" onClick={() => openRecoveryUrl("/pricing")}>
          Upgrade plan
        </button>
        <button
          type="button"
          onClick={() => vscode.postMessage({ type: "showAccountViewClicked" })}
        >
          View usage
        </button>
      </div>
    </div>
  );
};

const CapabilityCommandCenter = () => {
  const state = useExtensionState() as Record<string, any>;
  const grayMatterSession = state.grayMatterSession as
    | GrayMatterLike
    | undefined;
  const agenticState = state.agenticState as
    | AgenticCapabilityCommandCenterState
    | undefined;
  const grayMatter = grayMatterLabel(grayMatterSession);
  const mcp = mcpSummary(state.mcpServers);
  const swarm = swarmSummary(agenticState);
  const recentCommands = agenticState?.recentCommands ?? [];
  const latestCommand = recentCommands[0];

  return (
    <section
      className="capability-command-center"
      aria-label="Agentic command center"
    >
      <div className="capability-command-center__topline">
        <div className="capability-command-center__identity">
          <FaRobot aria-hidden="true" />
          <strong>{userLabel(state)}</strong>
          <span className="capability-command-center__host">
            {hostLabel(state.apiConfiguration?.valkyraiHost)}
          </span>
        </div>
        <div className="capability-command-center__model">
          <FaTerminal aria-hidden="true" />
          <span>
            {modelLabel(state.apiConfiguration, state.selectedLlmDetails)}
          </span>
        </div>
      </div>

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
          </div>
        ) : (
          <div className="capability-command-center__command">
            <span className="capability-command-center__command-meta">
              <FaTerminal aria-hidden="true" />
              <span>No recent remote commands</span>
            </span>
          </div>
        )}
      </div>

      {grayMatterSession?.status === "quota" ? (
        <GrayMatterQuotaRecovery
          grayMatterSession={grayMatterSession}
          latestCommand={latestCommand}
          state={state}
        />
      ) : null}
    </section>
  );
};

export default CapabilityCommandCenter;
