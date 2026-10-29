let ValorIDEHandler: typeof import("../valoride").ValorIDEHandler;
let mockedCreateOpenRouterStream: jest.Mock;

describe("ValorIDEHandler latency", () => {
  beforeAll(() => {
    jest.doMock("openai", () => ({
      __esModule: true,
      default: jest.fn(() => ({})),
    }));
    jest.doMock("../../transform/openrouter-stream", () => ({
      createOpenRouterStream: jest.fn(),
    }));

    ({ ValorIDEHandler } =
      jest.requireActual<typeof import("../valoride")>("../valoride"));
    ({ createOpenRouterStream: mockedCreateOpenRouterStream } =
      jest.requireMock("../../transform/openrouter-stream"));
  });

  it("finishes the text stream without waiting for generation usage lookup", async () => {
    async function* streamWithoutUsage() {
      yield {
        id: "generation-1",
        choices: [{ delta: { content: "done" } }],
      } as any;
    }
    mockedCreateOpenRouterStream.mockResolvedValue(streamWithoutUsage() as any);

    const handler = new ValorIDEHandler({
      openRouterModelId: "openai/gpt-5.4-mini",
      openRouterModelInfo: {
        contextWindow: 128_000,
        maxTokens: 8_192,
      },
      valorideApiKey: "test-key",
    } as any);
    const getApiStreamUsage = jest
      .spyOn(handler, "getApiStreamUsage")
      .mockResolvedValue({
        type: "usage",
        inputTokens: 10,
        outputTokens: 2,
      });

    const chunks = [];
    for await (const chunk of handler.createMessage("system", [])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text", text: "done" }]);
    expect(getApiStreamUsage).not.toHaveBeenCalled();
  });
});
