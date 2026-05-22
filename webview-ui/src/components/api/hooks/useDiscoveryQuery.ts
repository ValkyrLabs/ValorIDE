import { useCallback, useEffect, useState } from "react";
import {
  buildSwarmDiscoveryUrl,
  classifySwarmDiscoveryStatus,
  getSwarmDiscoveryEndpointType,
  getSwarmDiscoveryHeaders,
  getSwarmDiscoveryRecoveryActions,
  type AgentDiscoveryRecord,
  type SwarmDiscoveryErrorKind,
  type SwarmDiscoveryRecoveryAction,
} from "../../../api/hooks/useDiscoveryQuery";
import {
  getValkyraiHost,
  subscribeToValkyraiHost,
} from "../../../utils/valkyraiHost";

export type { AgentDiscoveryRecord };

export interface UseDiscoveryQueryParams {
  organizationId: string;
  status?: string;
}

export const useDiscoveryQuery = ({
  organizationId,
  status,
}: UseDiscoveryQueryParams) => {
  const [apiHost, setApiHost] = useState(() => getValkyraiHost());
  const [data, setData] = useState<AgentDiscoveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorKind, setErrorKind] = useState<SwarmDiscoveryErrorKind | null>(
    null,
  );
  const [recoveryActions, setRecoveryActions] = useState<
    SwarmDiscoveryRecoveryAction[]
  >([]);

  const fetchAgents = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setErrorKind("empty");
      setRecoveryActions(getSwarmDiscoveryRecoveryActions("empty"));
      return;
    }

    let failureKind: SwarmDiscoveryErrorKind | null = null;
    const endpointType = getSwarmDiscoveryEndpointType(apiHost);

    try {
      setIsLoading(true);
      setError(null);
      setErrorKind(null);
      setRecoveryActions([]);
      const response = await fetch(
        buildSwarmDiscoveryUrl({
          organizationId,
          status,
          apiHost,
          path: "agents/discovery",
        }),
        { headers: getSwarmDiscoveryHeaders() },
      );
      if (!response.ok) {
        failureKind = classifySwarmDiscoveryStatus(
          response.status,
          endpointType,
        );
        throw new Error(`Discovery failed: ${response.status}`);
      }

      const payload = await response.json();
      const agents = Array.isArray(payload)
        ? payload
        : payload.data || payload.agents || [];
      const nextKind = agents.length === 0 ? "empty" : null;
      setData(agents);
      setErrorKind(nextKind);
      setRecoveryActions(
        nextKind ? getSwarmDiscoveryRecoveryActions(nextKind) : [],
      );
    } catch (err) {
      const kind =
        failureKind ??
        (endpointType === "local" ? "local_unavailable" : "cloud_unavailable");
      setError(err as Error);
      setErrorKind(kind);
      setRecoveryActions(getSwarmDiscoveryRecoveryActions(kind));
      setData([]);
      // In a webview context we cannot rely on console availability, but this is helpful during dev.
      console.warn("Failed to fetch swarm discovery data", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiHost, organizationId, status]);

  useEffect(() => subscribeToValkyraiHost(setApiHost), []);

  useEffect(() => {
    void fetchAgents();
    return undefined;
  }, [fetchAgents]);

  return {
    data,
    isLoading,
    error,
    errorKind,
    endpoint: organizationId
      ? buildSwarmDiscoveryUrl({
          organizationId,
          status,
          apiHost,
          path: "agents/discovery",
        })
      : undefined,
    endpointType: getSwarmDiscoveryEndpointType(apiHost),
    recoveryActions,
    refetch: fetchAgents,
  };
};

export type UseDiscoveryQueryResult = ReturnType<typeof useDiscoveryQuery>;
