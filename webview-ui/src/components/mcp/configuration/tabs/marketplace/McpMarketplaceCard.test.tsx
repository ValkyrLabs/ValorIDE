import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import McpMarketplaceCard from "./McpMarketplaceCard";

const mockPostMessage = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (...args: unknown[]) => mockPostMessage(...args),
  },
}));

const baseItem = {
  mcpId: "mcp-graymatter",
  githubUrl: "https://github.com/ValkyrLabs/graymatter-mcp",
  name: "GrayMatter MCP",
  author: "ValkyrLabs",
  description: "First-party MCP",
  icon: "",
  logoUrl: "",
  category: "memory",
  tags: ["graymatter"],
  requiresApiKey: false,
  isRecommended: true,
  githubStars: 42,
  downloadCount: 7,
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  lastGithubSync: "2026-05-24T00:00:00.000Z",
};

describe("McpMarketplaceCard", () => {
  beforeEach(() => {
    mockPostMessage.mockReset();
  });

  it("routes internal app cards to hosted application detail with attribution", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <McpMarketplaceCard
        item={{ ...baseItem, applicationId: "app-123" } as any}
        installedServers={[]}
      />,
    );

    await user.click(container.querySelector(".mcp-card") as HTMLAnchorElement);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "openInBrowser",
        url: expect.stringContaining("https://valkyrlabs.com/application-detail/app-123?"),
      }),
    );

    const payload = mockPostMessage.mock.calls[0][0] as { url: string };
    const url = new URL(payload.url);
    expect(url.searchParams.get("source")).toBe("valoride");
    expect(url.searchParams.get("surface")).toBe("mcp_marketplace");
    expect(url.searchParams.get("mcpId")).toBe("mcp-graymatter");
    expect(url.searchParams.get("applicationId")).toBe("app-123");
    expect(payload.url).not.toContain("localhost:5173");
  });

  it("keeps external/community cards on github links", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <McpMarketplaceCard item={baseItem as any} installedServers={[]} />,
    );

    await user.click(container.querySelector(".mcp-card") as HTMLAnchorElement);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "openInBrowser",
        url: "https://github.com/ValkyrLabs/graymatter-mcp",
      }),
    );
  });
});
