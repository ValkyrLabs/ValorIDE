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
