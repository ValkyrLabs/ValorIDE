import { AnthropicHandler } from "../anthropic";
import { StreamingNarrative } from "../../../core/task/StreamingNarrative";
import type { ValorIDEMessage } from "../../../shared/ExtensionMessage";

describe("Anthropic visible summaries through the task transcript", () => {
  it("requests summarized adaptive thinking and retains interleaved blocks without replaying earlier content", async () => {
    const events = [
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "thinking", thinking: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: "Preparing" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: " " },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: "tests" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "signature_delta", signature: "SECRET" },
      },
      {
        type: "content_block_start",
        index: 1,
        content_block: { type: "redacted_thinking", data: "PRIVATE" },
      },
      {
        type: "content_block_delta",
        index: 2,
        delta: { type: "text_delta", text: "Visible " },
      },
      {
        type: "content_block_start",
        index: 3,
        content_block: { type: "thinking", thinking: "Checking" },
      },
      {
        type: "content_block_delta",
        index: 3,
        delta: { type: "thinking_delta", thinking: " results" },
      },
      {
        type: "content_block_delta",
        index: 4,
        delta: { type: "text_delta", text: "answer" },
      },
      { type: "message_stop" },
    ];
    const create = jest.fn().mockResolvedValue(events);
    const provider = new AnthropicHandler({
      apiModelId: "claude-opus-5-5",
      apiKey: "fixture",
    });
    Object.defineProperty(provider, "client", {
      value: { messages: { create } },
    });
    const rows: ValorIDEMessage[] = [];
    const posted: ValorIDEMessage[] = [];
    let persisted = "";
    const transcript = new StreamingNarrative(
      () => 101,
      async (row) => {
        rows.push(row);
        posted.push({ ...row });
      },
      async (row) => {
        posted.push(row);
      },
      async () => {
        persisted = JSON.stringify(rows);
      },
    );
    let answer = "";
    for await (const c of provider.createMessage("System", [])) {
      if (c.type === "reasoning") await transcript.append(c.reasoning);
      if (c.type === "text") {
        await transcript.seal();
        answer += c.text;
      }
    }
    await transcript.seal();
    transcript.dispose();
    expect(create.mock.calls[0][0].thinking).toEqual({
      type: "adaptive",
      display: "summarized",
    });
    expect(posted[0]).toMatchObject({ text: "Preparing", partial: true });
    expect(rows).toHaveLength(1);
    expect(JSON.parse(persisted)[0]).toMatchObject({
      ts: 101,
      text: "Preparing tests\n\nChecking results",
      partial: false,
    });
    expect(answer).toBe("Visible answer");
    expect(persisted).not.toMatch(/SECRET|PRIVATE|Redacted|Visible answer/);
  });
  it("shows no narrative for signature-only output and honors an explicit off setting", async () => {
    const create = jest.fn().mockResolvedValue([
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "thinking", thinking: "" },
      },
      {
        type: "content_block_start",
        index: 1,
        content_block: { type: "redacted_thinking", data: "opaque" },
      },
      {
        type: "content_block_delta",
        index: 2,
        delta: { type: "text_delta", text: "Hello" },
      },
    ]);
    const provider = new AnthropicHandler({
      apiModelId: "claude-haiku-4-5-20251001",
      thinkingBudgetTokens: 0,
    });
    Object.defineProperty(provider, "client", {
      value: { messages: { create } },
    });
    const chunks = [];
    for await (const chunk of provider.createMessage("", []))
      chunks.push(chunk);
    expect(create.mock.calls[0][0].thinking).toBeUndefined();
    expect(chunks).toEqual([{ type: "text", text: "Hello" }]);
  });
});
