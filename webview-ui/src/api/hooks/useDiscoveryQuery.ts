import { useEffect, useState } from 'react';

const SWARM_API_BASE = 'http://localhost:8080/v1/swarm';

export interface AgentDiscoveryRecord {
    id: string;
    displayName?: string;
    username?: string;
    status?: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'BUSY' | string;
    version?: string;
    location?: string;
    region?: string;
    latency?: number;
    [key: string]: any;
}

export interface UseDiscoveryQueryOptions {
    organizationId: string;
    status?: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'BUSY' | 'all' | string;
    enabled?: boolean;
    refetchInterval?: number;
}

export interface UseDiscoveryQueryResult {
    data: AgentDiscoveryRecord[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useDiscoveryQuery(
    options: UseDiscoveryQueryOptions
): UseDiscoveryQueryResult {
    const { organizationId, status, enabled = true, refetchInterval = 0 } = options;

    const [data, setData] = useState<AgentDiscoveryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchAgents = async () => {
        if (!enabled || !organizationId) {
            return;
        }

        setIsLoading(true);
        setIsError(false);
        setError(null);

        try {
            const url = new URL(`${SWARM_API_BASE}/agents`);
            url.searchParams.set('organizationId', organizationId);

            if (status && status !== 'all') {
                url.searchParams.set('status', status);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Failed to fetch agents: ${response.statusText}`);
            }

            const result = await response.json();
            const agents = Array.isArray(result) ? result : result.data || result.agents || [];
            setData(agents);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setIsError(true);
            setError(error);
            console.error('[useDiscoveryQuery] Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
    }, [organizationId, status, enabled, refetchInterval]);

    return {
        data,
        isLoading,
        isError,
        error,
        refetch: fetchAgents,
    };
}
