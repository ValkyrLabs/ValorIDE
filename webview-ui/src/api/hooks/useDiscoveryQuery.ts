import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getValkyraiHost,
  subscribeToValkyraiHost,
} from "../../utils/valkyraiHost";

const LOCAL_SWARM_API_BASE = "http://localhost:8080/v1/swarm";

export type SwarmDiscoveryEndpointType = "hosted" | "enterprise" | "local";
export type SwarmDiscoveryErrorKind =
  | "auth_needed"
  | "rbac_denied"
  | "cloud_unavailable"
  | "local_unavailable"
  | "empty"
  | "unknown";

export interface AgentDiscoveryRecord {
  id: string;
  displayName?: string;
  username?: string;
  status?: "ONLINE" | "OFFLINE" | "IDLE" | "BUSY" | string;
  version?: string;
  location?: string;
  region?: string;
  latency?: number;
  [key: string]: any;
}

export interface UseDiscoveryQueryOptions {
  organizationId: string;
  status?: "ONLINE" | "OFFLINE" | "IDLE" | "BUSY" | "all" | string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface SwarmDiscoveryRecoveryAction {
  id: "connect-account" | "swarm-setup" | "buy-credits" | "retry";
  label: string;
}

export interface UseDiscoveryQueryResult {
  data: AgentDiscoveryRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  errorKind: SwarmDiscoveryErrorKind | null;
  endpoint: string;
  endpointType: SwarmDiscoveryEndpointType;
  recoveryActions: SwarmDiscoveryRecoveryAction[];
  refetch: () => Promise<void>;
}

interface BuildDiscoveryUrlOptions {
  organizationId: string;
  status?: string;
  apiHost?: string | null;
  path?: "agents" | "agents/discovery";
  allowLocalFallback?: boolean;
}

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const normalizeApiHost = (host?: string | null) => {
  const candidate = (host || "").trim();
  if (!candidate) {
    return undefined;
  }
  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = pathname && pathname !== "/" ? pathname : "/v1";
    return trimTrailingSlashes(
      `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
    );
  } catch {
    return undefined;
  }
};

export const getSwarmDiscoveryEndpointType = (
  apiHost?: string | null,
): SwarmDiscoveryEndpointType => {
  const normalized = normalizeApiHost(apiHost);
  if (
    !normalized ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(normalized)
  ) {
    return "local";
  }
  if (/\.valkyrlabs\.com\b/i.test(new URL(normalized).host)) {
    return "hosted";
  }
  return "enterprise";
};

export const buildSwarmDiscoveryUrl = ({
  organizationId,
  status,
  apiHost,
  path = "agents",
  allowLocalFallback = false,
}: BuildDiscoveryUrlOptions) => {
  const normalizedHost = normalizeApiHost(apiHost);
  const base = normalizedHost
    ? `${normalizedHost}/swarm`
    : allowLocalFallback
      ? LOCAL_SWARM_API_BASE
      : `${normalizeApiHost(getValkyraiHost())}/swarm`;
  const url = new URL(`${base}/${path}`);
  url.searchParams.set("organizationId", organizationId);

  if (status && status !== "all") {
    url.searchParams.set("status", status);
  }

  return url.toString();
};

const readAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const storageKeys = [
    "jwtToken",
    "jwtSession",
    "authToken",
    "auth_token",
    "valoride_jwt",
    "temp_auth_token",
    "VALKYR_AUTH",
  ];
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (const key of storageKeys) {
      try {
        const value = storage?.getItem?.(key);
        if (value?.trim()) {
          return value.replace(/^Bearer\s+/i, "").trim();
        }
      } catch {
        // Ignore unavailable storage in webview/test sandboxes.
      }
    }
  }
  return null;
};

export const getSwarmDiscoveryHeaders = () => {
  const headers = new Headers({ Accept: "application/json" });
  const token = readAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

export const classifySwarmDiscoveryStatus = (
  status: number,
  endpointType: SwarmDiscoveryEndpointType,
): SwarmDiscoveryErrorKind => {
  if (status === 401 || status === 419) return "auth_needed";
  if (status === 402 || status === 429) return "cloud_unavailable";
  if (status === 403) return "rbac_denied";
  if (endpointType === "local") return "local_unavailable";
  if (status >= 500) return "cloud_unavailable";
  return "unknown";
};

export const getSwarmDiscoveryRecoveryActions = (
  errorKind: SwarmDiscoveryErrorKind | null,
): SwarmDiscoveryRecoveryAction[] => {
  switch (errorKind) {
    case "auth_needed":
      return [{ id: "connect-account", label: "Connect ValkyrAI account" }];
    case "rbac_denied":
      return [{ id: "swarm-setup", label: "Open Swarm access setup" }];
    case "cloud_unavailable":
      return [
        { id: "retry", label: "Retry discovery" },
        { id: "buy-credits", label: "Upgrade or buy credits" },
      ];
    case "local_unavailable":
      return [{ id: "swarm-setup", label: "Start or register a local agent" }];
    case "empty":
      return [{ id: "swarm-setup", label: "Register first Swarm agent" }];
    default:
      return [{ id: "retry", label: "Retry discovery" }];
  }
};

const emitSwarmDiscoveryTelemetry = (
  eventName: string,
  detail: Record<string, unknown>,
) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("valoride:swarm-discovery", {
      detail: {
        eventName,
        ...detail,
      },
    }),
  );
};

export function useDiscoveryQuery(
  options: UseDiscoveryQueryOptions,
): UseDiscoveryQueryResult {
  const {
    organizationId,
    status,
    enabled = true,
    refetchInterval = 0,
  } = options;

  const [apiHost, setApiHost] = useState(() => getValkyraiHost());
  const [data, setData] = useState<AgentDiscoveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorKind, setErrorKind] = useState<SwarmDiscoveryErrorKind | null>(
    null,
  );

  const endpointType = useMemo(
    () => getSwarmDiscoveryEndpointType(apiHost),
    [apiHost],
  );
  const endpoint = useMemo(
    () =>
      organizationId
        ? buildSwarmDiscoveryUrl({ organizationId, status, apiHost })
        : `${normalizeApiHost(apiHost)}/swarm/agents`,
    [apiHost, organizationId, status],
  );

  const fetchAgents = useCallback(async () => {
    if (!enabled || !organizationId) {
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);
    setErrorKind(null);

    let failureKind: SwarmDiscoveryErrorKind | null = null;

    try {
      const url = buildSwarmDiscoveryUrl({ organizationId, status, apiHost });
      emitSwarmDiscoveryTelemetry("discovery_endpoint_selected", {
        endpointType,
        hasStatusFilter: Boolean(status && status !== "all"),
      });

      const response = await fetch(url, {
        headers: getSwarmDiscoveryHeaders(),
      });

      if (!response.ok) {
        failureKind = classifySwarmDiscoveryStatus(
          response.status,
          endpointType,
        );
        setErrorKind(failureKind);
        throw new Error(
          `Failed to fetch agents: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      const agents = Array.isArray(result)
        ? result
        : result.data || result.agents || [];
      const nextKind = agents.length === 0 ? "empty" : null;
      setData(agents);
      setErrorKind(nextKind);
      emitSwarmDiscoveryTelemetry(
        agents.length > 0 ? "discovery_success" : "empty_state_shown",
        {
          endpointType,
          agentCount: agents.length,
        },
      );
      if (agents.length > 0) {
        emitSwarmDiscoveryTelemetry("first_agent_connected", {
          endpointType,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      const kind =
        failureKind ??
        (endpointType === "local" ? "local_unavailable" : "cloud_unavailable");
      setIsError(true);
      setError(error);
      setErrorKind(kind);
      console.error("[useDiscoveryQuery] Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiHost, enabled, endpointType, organizationId, status]);

  useEffect(() => subscribeToValkyraiHost(setApiHost), []);

  useEffect(() => {
    fetchAgents();

    let interval: ReturnType<typeof setInterval> | null = null;
    if (refetchInterval > 0) {
      interval = setInterval(fetchAgents, refetchInterval);
    }

    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [fetchAgents, refetchInterval]);

  return {
    data,
    isLoading,
    isError,
    error,
    errorKind,
    endpoint,
    endpointType,
    recoveryActions: getSwarmDiscoveryRecoveryActions(errorKind),
    refetch: fetchAgents,
  };
}
