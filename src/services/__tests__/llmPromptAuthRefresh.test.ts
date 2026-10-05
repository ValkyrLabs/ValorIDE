import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExtensionHostLLMDetailsService } from "../llmPromptService";

const session = vi.hoisted(() => ({
  host: "https://api.example.test/v1",
  token: "test-session",
  request: vi.fn(),
}));

vi.mock("@core/storage/state", () => ({
  getAllExtensionState: async () => ({
    apiConfiguration: {
      valkyraiHost: session.host,
      valkyraiJwt: session.token,
    },
  }),
  getSecret: async () => undefined,
}));
vi.mock("../valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: () => ({ request: session.request }),
}));

const logger = { appendLine: vi.fn() } as any;
const query = {
  tags: ["typescript", "system"],
  stack: {
    language: "typescript" as const,
    isThorAPI: false,
    isGenerated: false,
  },
  limit: 1,
};
const accessible = {
  status: 200,
  data: {
    content: [
      {
        id: "authorized-prompt",
        systemPrompt: "Use this session's prompt",
        tags: ["typescript"],
      },
    ],
  },
};

describe("extension-host prompt query across authentication restoration", () => {
  beforeEach(() => {
    session.host = "https://api.example.test/v1";
    session.token = "test-session";
    session.request.mockReset();
    logger.appendLine.mockClear();
  });

  it("does not make a hosted prompt request before sign-in", async () => {
    session.token = "";
    expect(
      await createExtensionHostLLMDetailsService({} as any, logger).query(
        query,
      ),
    ).toBeNull();
    expect(session.request).not.toHaveBeenCalled();
  });

  it("uses the current session when the same client is queried again after sign-in", async () => {
    const client = createExtensionHostLLMDetailsService({} as any, logger);
    session.token = "";
    expect(await client.query(query)).toBeNull();
    session.token = "restored-session";
    session.request.mockResolvedValue(accessible);
    expect((await client.query(query))?.id).toBe("authorized-prompt");
    expect(session.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer restored-session",
        }),
        url: expect.stringContaining("https://api.example.test/v1/LlmDetails?"),
      }),
    );
  });

  it.each(["logout", "account", "backend"])(
    "discards an in-flight reply after %s changes the destination session",
    async (change) => {
      let complete!: (response: any) => void;
      session.request.mockImplementation(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
      const pending = createExtensionHostLLMDetailsService(
        {} as any,
        logger,
      ).query(query);
      await vi.waitFor(() => expect(session.request).toHaveBeenCalledOnce());
      if (change === "logout") session.token = "";
      if (change === "account") session.token = "another-account-session";
      if (change === "backend")
        session.host = "https://another.example.test/v1";
      complete(accessible);
      expect(await pending).toBeNull();
      expect(logger.appendLine).toHaveBeenCalledWith(
        expect.stringContaining("account or backend changed"),
      );
    },
  );

  it.each([401, 403])(
    "returns no optional prompt on HTTP %s",
    async (status) => {
      session.request.mockResolvedValue({ ...accessible, status });
      expect(
        await createExtensionHostLLMDetailsService({} as any, logger).query(
          query,
        ),
      ).toBeNull();
    },
  );

  it("keeps the fallback available while the backend is offline", async () => {
    session.request.mockRejectedValue(new Error("Network unavailable"));
    expect(
      await createExtensionHostLLMDetailsService({} as any, logger).query(
        query,
      ),
    ).toBeNull();
  });

  it.each([429, 500])(
    "keeps a non-success HTTP %s from being treated as a prompt result",
    async (status) => {
      session.request.mockResolvedValue({ ...accessible, status });
      await expect(
        createExtensionHostLLMDetailsService({} as any, logger).query(query),
      ).rejects.toThrow(`HTTP ${status}`);
    },
  );
});
