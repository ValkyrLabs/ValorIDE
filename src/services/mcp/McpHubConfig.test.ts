import { parseMcpServerConfigs } from "./McpServerConfig";

describe("McpHub configuration isolation", () => {
  it("migrates legacy remote baseUrl entries without dropping valid servers", () => {
    const parsed = parseMcpServerConfigs({
      "graymatter-memory": {
        args: ["--stdio"],
        command: "/opt/graymatter/scripts/gm-mcp-launcher",
      },
      exa: {
        baseUrl: "https://mcp.exa.ai/mcp",
        description: "Legacy marketplace record",
      },
    });

    expect(parsed.invalidServers).toEqual([]);
    expect(parsed.migratedServers).toEqual(["exa"]);
    expect(parsed.servers["graymatter-memory"]).toMatchObject({
      command: "/opt/graymatter/scripts/gm-mcp-launcher",
      transportType: "stdio",
    });
    expect(parsed.servers.exa).toMatchObject({
      transportType: "sse",
      url: "https://mcp.exa.ai/mcp",
    });
    expect(parsed.migratedFileConfigs.exa).toMatchObject({
      description: "Legacy marketplace record",
      url: "https://mcp.exa.ai/mcp",
    });
  });

  it("isolates malformed entries instead of failing the entire MCP hub", () => {
    const parsed = parseMcpServerConfigs({
      broken: { description: "missing transport" },
      healthy: { url: "https://example.com/mcp" },
    });

    expect(parsed.invalidServers).toHaveLength(1);
    expect(parsed.invalidServers[0].name).toBe("broken");
    expect(parsed.servers.healthy).toMatchObject({
      transportType: "sse",
      url: "https://example.com/mcp",
    });
  });
});
