import { combineApiRequests } from "./combineApiRequests";
import { ValorIDEMessage } from "./ExtensionMessage";

describe("combineApiRequests", () => {
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
