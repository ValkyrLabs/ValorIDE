import { convertO1ResponseToAnthropicMessage } from "./o1-format";

describe("convertO1ResponseToAnthropicMessage", () => {
  it("defaults missing execute_command requires_approval to true", () => {
    const message = convertO1ResponseToAnthropicMessage({
      id: "chatcmpl-test",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          logprobs: null,
          message: {
            role: "assistant",
            refusal: null,
            content:
              "Checking the workspace.\n\n<execute_command>\n<command>pwd</command>\n</execute_command>",
          },
        },
      ],
      created: 0,
      model: "openai-codex-test",
      object: "chat.completion",
      usage: {
        completion_tokens: 1,
        prompt_tokens: 1,
        total_tokens: 2,
      },
    });

    expect(message.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool_use",
          name: "execute_command",
          input: {
            command: "pwd",
            requires_approval: "true",
          },
        }),
      ]),
    );
  });
});
