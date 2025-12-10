import { parseAssistantMessage } from "./parse-assistant-message";
describe("parseAssistantMessage", () => {
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
//# sourceMappingURL=parse-assistant-message.test.js.map