import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSwarmDiscoveryUrl,
  classifySwarmDiscoveryStatus,
  getSwarmDiscoveryHeaders,
  getSwarmDiscoveryRecoveryActions,
  getSwarmDiscoveryEndpointType,
  useDiscoveryQuery,
} from "./useDiscoveryQuery";
import { setValkyraiHost } from "../../utils/valkyraiHost";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("useDiscoveryQuery host-aware Swarm discovery", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(jsonResponse([]))),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.sessionStorage.clear();
    window.localStorage.clear();
    setValkyraiHost("https://api-0.valkyrlabs.com/v1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("builds hosted and enterprise discovery URLs from the configured ValkyrAI API host", () => {
    expect(
      buildSwarmDiscoveryUrl({
        organizationId: "org-1",
        status: "ONLINE",
        apiHost: "https://api-0.valkyrlabs.com/v1",
      }),
    ).toBe(
      "https://api-0.valkyrlabs.com/v1/swarm/agents?organizationId=org-1&status=ONLINE",
    );

    expect(
      buildSwarmDiscoveryUrl({
        organizationId: "org-2",
        apiHost: "https://enterprise.example.com",
        path: "agents/discovery",
      }),
    ).toBe(
      "https://enterprise.example.com/v1/swarm/agents/discovery?organizationId=org-2",
    );
  });

  it("uses localhost only when an explicit local fallback is requested", () => {
    expect(
      buildSwarmDiscoveryUrl({
        organizationId: "org-local",
        apiHost: undefined,
        allowLocalFallback: true,
      }),
    ).toBe("http://localhost:8080/v1/swarm/agents?organizationId=org-local");
  });

  it("attaches the stored ValorIDE auth token to discovery requests", () => {
    window.sessionStorage.setItem("jwtToken", "session-token");

    expect(getSwarmDiscoveryHeaders().get("Authorization")).toBe(
      "Bearer session-token",
    );
  });

  it("classifies auth, RBAC, cloud, local, and empty recovery states", () => {
    expect(classifySwarmDiscoveryStatus(401, "hosted")).toBe("auth_needed");
    expect(classifySwarmDiscoveryStatus(403, "enterprise")).toBe("rbac_denied");
    expect(classifySwarmDiscoveryStatus(503, "hosted")).toBe(
      "cloud_unavailable",
    );
    expect(classifySwarmDiscoveryStatus(503, "local")).toBe(
      "local_unavailable",
    );
    expect(getSwarmDiscoveryRecoveryActions("empty")).toContainEqual({
      id: "swarm-setup",
      label: "Register first Swarm agent",
    });
  });

  it("refreshes discovery when the configured ValkyrAI host changes", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse([{ id: "agent-1" }])),
    );

    const { result } = renderHook(() =>
      useDiscoveryQuery({ organizationId: "org-1" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api-0.valkyrlabs.com/v1/swarm/agents?organizationId=org-1",
    );
    expect(result.current.endpointType).toBe("hosted");

    act(() => {
      setValkyraiHost("https://enterprise.example.com/v1");
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://enterprise.example.com/v1/swarm/agents?organizationId=org-1",
    );
    expect(result.current.endpointType).toBe("enterprise");
  });

  it("surfaces actionable auth and empty-agent states", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { message: "login required" },
        { status: 401, statusText: "Unauthorized" },
      ),
    );

    const { result, rerender } = renderHook(() =>
      useDiscoveryQuery({ organizationId: "org-1" }),
    );

    await waitFor(() => expect(result.current.errorKind).toBe("auth_needed"));
    expect(result.current.recoveryActions).toContainEqual({
      id: "connect-account",
      label: "Connect ValkyrAI account",
    });

    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await act(async () => {
      await result.current.refetch();
    });
    rerender();

    await waitFor(() => expect(result.current.errorKind).toBe("empty"));
    expect(result.current.recoveryActions).toContainEqual({
      id: "swarm-setup",
      label: "Register first Swarm agent",
    });
  });

  it("does not regress hosted/local endpoint type detection", () => {
    expect(
      getSwarmDiscoveryEndpointType("https://api-0.valkyrlabs.com/v1"),
    ).toBe("hosted");
    expect(getSwarmDiscoveryEndpointType("http://localhost:8080/v1")).toBe(
      "local",
    );
  });
});
