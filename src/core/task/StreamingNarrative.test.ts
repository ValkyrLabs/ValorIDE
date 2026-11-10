import { drainRequestTail, StreamingNarrative } from "./StreamingNarrative";
import type { ApiStream } from "../../api/transform/stream";
import type { ValorIDEMessage } from "../../shared/ExtensionMessage";

describe("reasoning and status lifecycle", () => {
  it("sends the latest snapshot while the provider is still streaming, then seals a single complete row", async () => {
    jest.useFakeTimers();
    try {
      const posts: ValorIDEMessage[] = [];
      const open = jest.fn(async () => {});
      const save = jest.fn(async () => {});
      const stream = new StreamingNarrative(
        () => 123,
        open,
        async (row) => {
          posts.push(row);
        },
        save,
      );
      await stream.append("A");
      await stream.append(" ");
      await stream.append("B");
      await jest.advanceTimersByTimeAsync(40);
      expect(posts).toEqual([
        expect.objectContaining({ ts: 123, text: "A B", partial: true }),
      ]);
      const tail = " nested".repeat(16000);
      await stream.append(tail);
      await stream.seal();
      await stream.seal();
      stream.dispose();
      expect(open).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledTimes(1);
      expect(posts.at(-1)).toMatchObject({
        ts: 123,
        text: "A B" + tail,
        partial: false,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps late public summaries after a tool alongside usage, without running any trailing answer/action", async () => {
    const events: ApiStream = (async function* () {
      yield {
        type: "text",
        text: "<execute_command>do not run</execute_command>",
      } as const;
      yield { type: "reasoning", reasoning: "Final checks" } as const;
      yield { type: "progress", message: "Finishing" } as const;
      yield { type: "usage", inputTokens: 1, outputTokens: 5 } as const;
    })();
    const usage = jest.fn();
    const visible = jest.fn(async () => {});
    await drainRequestTail(events, usage, visible);
    expect(usage).toHaveBeenCalledWith({
      type: "usage",
      inputTokens: 1,
      outputTokens: 5,
    });
    expect(visible.mock.calls).toEqual([
      [{ type: "reasoning", reasoning: "Final checks" }],
      [{ type: "progress", message: "Finishing" }],
    ]);
  });

  it("updates the separate provider-status row instead of concatenating stage text to reasoning", async () => {
    const rows: ValorIDEMessage[] = [];
    const stream = new StreamingNarrative(
      () => 124,
      async (r) => {
        rows.push(r);
      },
      async () => {},
      async () => {},
      "provider_status",
    );
    await stream.append("Starting");
    await stream.append("Finishing");
    await stream.seal();
    stream.dispose();
    expect(rows).toEqual([
      {
        type: "say",
        say: "provider_status",
        text: "Finishing",
        partial: false,
        ts: 124,
      },
    ]);
  });
});
