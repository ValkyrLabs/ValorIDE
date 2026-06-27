describe("ValkyraiHandler", () => {
  let mockedCallValkyraiLlm: jest.Mock;
  let ValkyraiHandler: typeof import("../valkyrai").ValkyraiHandler;

  beforeEach(() => {
    jest.resetModules();
    mockedCallValkyraiLlm = jest.fn(async () => ({
      content: "model response",
    }));
    jest.doMock("../../../services/ValkyraiLlmService", () => ({
      callValkyraiLlm: mockedCallValkyraiLlm,
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ValkyraiHandler = require("../valkyrai").ValkyraiHandler;
  });

  afterEach(() => {
    jest.dontMock("../../../services/ValkyraiLlmService");
  });

  it("uses the active ValorIDE session JWT when no explicit ValkyrAI JWT is configured", async () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiSessionJwt: "session-token",
    });

    const chunks = [];
    for await (const chunk of handler.createMessage("", [
      { role: "user", content: "hello" },
    ])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text", text: "model response" }]);
    expect(mockedCallValkyraiLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        jwt: "session-token",
        serviceId: "service-1",
        prompt: "# Conversation\n\n## USER\n\nhello",
      }),
    );
  });

  it("prefers an explicit ValkyrAI JWT over the active session JWT", async () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiJwt: "explicit-token",
      valkyraiSessionJwt: "session-token",
    });

    for await (const _chunk of handler.createMessage("", [
      { role: "user", content: "hello" },
    ])) {
      // exhaust stream
    }

    expect(mockedCallValkyraiLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        jwt: "explicit-token",
      }),
    );
  });

  it("includes the ValorIDE system prompt and conversation history in the ValkyrAI prompt", async () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiSessionJwt: "session-token",
    });

    for await (const _chunk of handler.createMessage("SYSTEM CONTRACT", [
      { role: "user", content: "first user message" },
      { role: "assistant", content: "assistant context" },
      { role: "user", content: "final user message" },
    ])) {
      // exhaust stream
    }

    const request = mockedCallValkyraiLlm.mock.calls[0][0];
    expect(request.prompt).toContain("# System Instructions");
    expect(request.prompt).toContain("SYSTEM CONTRACT");
    expect(request.prompt).toContain("## USER\n\nfirst user message");
    expect(request.prompt).toContain("## ASSISTANT\n\nassistant context");
    expect(request.prompt).toContain("## USER\n\nfinal user message");
  });
});
