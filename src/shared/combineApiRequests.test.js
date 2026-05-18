import { combineApiRequests } from "./combineApiRequests";
describe("combineApiRequests", () => {
  it("tolerates malformed api request payloads without throwing", () => {
    const messages = [
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
    let combined = [];
    expect(() => {
      combined = combineApiRequests(messages);
    }).not.toThrow();
    expect(
      combined.find((msg) => msg.say === "api_req_started")?.text,
    ).toContain('"cost":0.5');
  });
});
//# sourceMappingURL=combineApiRequests.test.js.map
