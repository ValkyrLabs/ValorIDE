import { parseAssistantMessage } from "./parse-assistant-message";

describe("parseAssistantMessage", () => {
  it("returns only the actual tool for tool-only output surrounded by whitespace", () => {
    expect(
      parseAssistantMessage(
        ' \n<use_procedure><action>status</action><arguments>{"executionId":"test"}</arguments></use_procedure>\n ',
      ),
    ).toEqual([
      {
        type: "tool_use",
        name: "use_procedure",
        partial: false,
        params: { action: "status", arguments: '{"executionId":"test"}' },
      },
    ]);
  });

  it("preserves meaningful prose around completed tools and streamed partial parameters", () => {
    const result = parseAssistantMessage(
      "Before. <read_file><path>README.md</path></read_file> After.",
    );
    expect(
      result.map((item) => (item.type === "text" ? item.content : item.name)),
    ).toEqual(["Before.", "read_file", "After."]);
    expect(parseAssistantMessage("<read_file><path>READ")).toEqual([
      {
        type: "tool_use",
        name: "read_file",
        partial: true,
        params: { path: "READ" },
      },
    ]);
    expect(parseAssistantMessage(" \n ")).toEqual([]);
  });

  it("normalizes legacy <invoke> function call syntax", () => {
    const message = `<function_calls>
<invoke name="execute_command">
  <parameter name="command">cd /workspace && ls</parameter>
  <parameter name="requires_approval">false</parameter>
</invoke>
</function_calls>`;

    const result = parseAssistantMessage(message);

    expect(result).toEqual([
      {
        type: "tool_use",
        name: "execute_command",
        params: {
          command: "cd /workspace && ls",
          requires_approval: "false",
        },
        partial: false,
      },
    ]);
  });
});

describe("canonical tool identity", () => {
  for (const name of ["use_mcp_server", "USE_MCP_SERVER", "Use_Mcp_Tool"]) {
    it(`parses ${name} with the canonical MCP identity`, () => {
      expect(
        parseAssistantMessage(
          `<${name}><server_name>demo</server_name><tool_name>inspect</tool_name><arguments>{"id":"one"}</arguments></${name}>`,
        ),
      ).toEqual([
        {
          type: "tool_use",
          name: "use_mcp_tool",
          partial: false,
          params: {
            server_name: "demo",
            tool_name: "inspect",
            arguments: '{"id":"one"}',
          },
        },
      ]);
    });
  }

  it("normalizes a legacy invoke before it reaches permission checks", () => {
    expect(
      parseAssistantMessage(
        '<function_calls><invoke name="USE_MCP_SERVER"><parameter name="server_name">demo</parameter><parameter name="tool_name">inspect</parameter><parameter name="arguments">{}</parameter></invoke></function_calls>',
      ),
    ).toEqual([
      {
        type: "tool_use",
        name: "use_mcp_tool",
        partial: false,
        params: { server_name: "demo", tool_name: "inspect", arguments: "{}" },
      },
    ]);
  });

  it("retains one canonical partial tool as parameters stream", () => {
    expect(
      parseAssistantMessage("Before. <USE_MCP_SERVER><server_name>dem"),
    ).toEqual([
      { type: "text", content: "Before.", partial: false },
      {
        type: "tool_use",
        name: "use_mcp_tool",
        partial: true,
        params: { server_name: "dem" },
      },
    ]);
  });

  it("leaves tool-like text inside file content unchanged", () => {
    const source =
      'const example = "<USE_MCP_SERVER><tool_name>inspect</tool_name></USE_MCP_SERVER>";';
    expect(
      parseAssistantMessage(
        `<write_to_file><path>example.ts</path><content>${source}</content></write_to_file>`,
      ),
    ).toEqual([
      {
        type: "tool_use",
        name: "write_to_file",
        partial: false,
        params: { path: "example.ts", content: source },
      },
    ]);
  });

  it("keeps unrecognized names as text without inventing an executable tool", () => {
    const message = "<UNKNOWN_TOOL><path>example.ts</path></UNKNOWN_TOOL>";
    expect(parseAssistantMessage(message)).toEqual([
      { type: "text", content: message, partial: true },
    ]);
  });
});
