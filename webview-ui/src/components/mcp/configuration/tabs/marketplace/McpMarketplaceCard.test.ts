import { describe, expect, it, vi } from "vitest";
import { getMarketplaceDetailUrl } from "./McpMarketplaceCard";

const createItem = (overrides: Record<string, unknown> = {}) =>
  ({
    mcpId: "mcp.internal.app",
    githubUrl: "https://github.com/ValkyrLabs/example-mcp",
    ...overrides,
  }) as any;

describe("getMarketplaceDetailUrl", () => {
  it("uses hosted app detail URL with attribution for internal apps", () => {
    vi.stubEnv("VITE_ENABLE_LOCALHOST_INTERNAL_APP_LINKS", "");
    vi.stubEnv("VITE_VALKYRAI_WEB_BASE_URL", "https://valkyrlabs.com");
    const url = new URL(
      getMarketplaceDetailUrl(createItem({ applicationId: "app-123" })),
    );

    expect(url.origin).toBe("https://valkyrlabs.com");
    expect(url.pathname).toBe("/application-detail/app-123");
    expect(url.searchParams.get("source")).toBe("valoride");
    expect(url.searchParams.get("surface")).toBe("mcp_marketplace");
    expect(url.searchParams.get("mcpId")).toBe("mcp.internal.app");
    expect(url.searchParams.get("applicationId")).toBe("app-123");
  });

  it("keeps localhost detail route only when explicit developer override is enabled", () => {
    vi.stubEnv("VITE_ENABLE_LOCALHOST_INTERNAL_APP_LINKS", "true");
    const url = new URL(
      getMarketplaceDetailUrl(createItem({ applicationId: "app-123" })),
    );

    expect(url.origin).toBe("http://localhost:5173");
    expect(url.pathname).toBe("/application-detail/app-123");
    expect(url.searchParams.get("source")).toBe("valoride");
  });

  it("falls back to github URL for external/community MCPs", () => {
    const fallback = getMarketplaceDetailUrl(createItem({ applicationId: "" }));
    expect(fallback).toBe("https://github.com/ValkyrLabs/example-mcp");
  });
});
