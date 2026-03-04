import type { McpServer } from "@shared/mcp";
import { validateMcpToolCall } from "../mcpToolValidation";

describe("validateMcpToolCall", () => {
  const buildServer = (overrides: Partial<McpServer> = {}): McpServer => ({
    name: "alpha",
    config: "{}",
    status: "connected",
    tools: [],
    ...overrides,
  });

  it("rejects unknown server names", () => {
    const result = validateMcpToolCall(
      [buildServer()],
      "server_name",
      "doThing",
      {},
    );

    expect(result.ok).toBe(false);
    if ("error" in result) {
      expect(result.error).toContain("server_name");
      expect(result.error).toContain("alpha");
    }
  });

  it("rejects unknown tool names for a connected server", () => {
    const result = validateMcpToolCall(
      [
        buildServer({
          tools: [{ name: "doThing" }],
        }),
      ],
      "alpha",
      "missingTool",
      {},
    );

    expect(result.ok).toBe(false);
    if ("error" in result) {
      expect(result.error).toContain("missingTool");
      expect(result.error).toContain("doThing");
    }
  });

  it("rejects missing required arguments from input schema", () => {
    const result = validateMcpToolCall(
      [
        buildServer({
          tools: [
            {
              name: "search",
              inputSchema: {
                type: "object",
                required: ["query"],
              },
            },
          ],
        }),
      ],
      "alpha",
      "search",
      {},
    );

    expect(result.ok).toBe(false);
    if ("error" in result) {
      expect(result.error).toContain("query");
    }
  });

  it("accepts known server/tool with required arguments", () => {
    const result = validateMcpToolCall(
      [
        buildServer({
          tools: [
            {
              name: "search",
              inputSchema: {
                type: "object",
                required: ["query"],
              },
            },
          ],
        }),
      ],
      "alpha",
      "search",
      { query: "shipping status" },
    );

    expect(result.ok).toBe(true);
    if (!("error" in result)) {
      expect(result.server.name).toBe("alpha");
      expect(result.tool.name).toBe("search");
    }
  });
});
