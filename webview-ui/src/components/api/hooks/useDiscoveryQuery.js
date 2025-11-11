import { useCallback, useEffect, useState } from "react";
const SWARM_API_BASE = "http://localhost:8080/v1/swarm";
const buildDiscoveryUrl = ({ organizationId, status }) => {
    const url = new URL(`${SWARM_API_BASE}/agents/discovery`);
    url.searchParams.set("organizationId", organizationId);
    if (status) {
        url.searchParams.set("status", status);
    }
    return url.toString();
};
export const useDiscoveryQuery = ({ organizationId, status }) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetchAgents = useCallback(async () => {
        if (!organizationId) {
            setData([]);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(buildDiscoveryUrl({ organizationId, status }));
            if (!response.ok) {
                throw new Error(`Discovery failed: ${response.status}`);
            }
            const payload = (await response.json());
            setData(Array.isArray(payload) ? payload : []);
        }
        catch (err) {
            setError(err);
            setData([]);
            // In a webview context we cannot rely on console availability, but this is helpful during dev.
            console.warn("Failed to fetch swarm discovery data", err);
        }
        finally {
            setIsLoading(false);
        }
    }, [organizationId, status]);
    useEffect(() => {
        void fetchAgents();
        return undefined;
    }, [fetchAgents]);
    return {
        data,
        isLoading,
        error,
        refetch: fetchAgents,
    };
};
//# sourceMappingURL=useDiscoveryQuery.js.map