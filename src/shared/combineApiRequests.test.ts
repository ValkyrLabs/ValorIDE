import { combineApiRequests } from "./combineApiRequests";
import { ValorIDEMessage } from "./ExtensionMessage";

describe("combineApiRequests", () => {
  const message = (
    say: "api_req_started" | "api_req_finished" | "text",
    ts: number,
    data: unknown,
  ): ValorIDEMessage => ({
    type: "say",
    say,
    ts,
    text: typeof data === "string" ? data : JSON.stringify(data),
  });

  it("keeps request metadata when completion data is malformed or not an object", () => {
    for (const data of ["not-json", "null", "[]", '"scalar"']) {
      const combined = combineApiRequests([
        message("api_req_started", 1, { request: "original" }),
        message("api_req_finished", 2, data),
      ]);
      expect(JSON.parse(combined[0].text!)).toEqual({ request: "original" });
    }
  });

  it("pairs completion with the latest pending request without rewriting an older unfinished request", () => {
    const input = [
      message("api_req_started", 1, { request: "abandoned" }),
      message("text", 2, "keep this"),
      message("api_req_started", 3, { request: "current" }),
      message("api_req_finished", 4, { tokensIn: 7 }),
    ];
    const original = JSON.stringify(input);
    const combined = combineApiRequests(input);
    expect(combined).toHaveLength(3);
    expect(JSON.parse(combined[0].text!)).toEqual({ request: "abandoned" });
    expect(combined[1].text).toBe("keep this");
    expect(JSON.parse(combined[2].text!)).toEqual({
      request: "current",
      tokensIn: 7,
    });
    expect(JSON.stringify(input)).toBe(original);
  });

  it("does not associate unrelated requests merely because their timestamps match", () => {
    const combined = combineApiRequests([
      message("api_req_started", 1, { request: "first" }),
      message("api_req_finished", 2, { cost: 1 }),
      message("api_req_started", 1, { request: "second" }),
      message("api_req_finished", 3, { cost: 2 }),
    ]);
    expect(combined.map((item) => JSON.parse(item.text!))).toEqual([
      { request: "first", cost: 1 },
      { request: "second", cost: 2 },
    ]);
  });

  it("preserves an orphaned completion rather than deleting the only record of its usage", () => {
    const orphan = message("api_req_finished", 1, { tokensOut: 9 });
    expect(combineApiRequests([orphan])).toEqual([orphan]);
  });

  it("tolerates malformed api request payloads without throwing", () => {
    const messages: ValorIDEMessage[] = [
      {
        type: "say",
        say: "api_req_started",
        text: "{not-json}",
        ts: 1,
      },
      {
        type: "say",
        say: "api_req_finished",
        text: '{"cost":0.5,"tokensIn":10}',
        ts: 2,
      },
    ];

    let combined: ValorIDEMessage[] = [];
    expect(() => {
      combined = combineApiRequests(messages);
    }).not.toThrow();

    expect(
      combined.find((msg) => msg.say === "api_req_started")?.text,
    ).toContain('"cost":0.5');
  });
});
