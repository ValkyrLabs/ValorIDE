jest.mock(
  "vscode",
  () => ({
    commands: { executeCommand: jest.fn() },
    env: { openExternal: jest.fn() },
    Uri: { parse: (val: string) => `uri:${val}` },
  }),
  { virtual: true },
);

import {
  normalizeUrl,
  openUrlExternally,
  openUrlWithSimpleBrowser,
} from "./openUrl";

describe("openUrlWithSimpleBrowser", () => {
  const mockExecuteCommand = jest.fn();
  const mockOpenExternal = jest.fn();
  const deps = {
    commands: { executeCommand: mockExecuteCommand },
    env: { openExternal: mockOpenExternal },
    Uri: { parse: (val: string) => `uri:${val}` },
  } as any;

  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockOpenExternal.mockReset();
  });

  it("uses simpleBrowser.open when available and does not fall back", async () => {
    mockExecuteCommand.mockResolvedValueOnce(undefined);

    await openUrlWithSimpleBrowser("https://valkyrlabs.com", undefined, deps);

    expect(mockExecuteCommand).toHaveBeenCalledWith(
      "simpleBrowser.open",
      "https://valkyrlabs.com/",
      undefined,
    );
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });

  it("falls back to env.openExternal when simple browser commands fail", async () => {
    mockExecuteCommand
      .mockRejectedValueOnce(new Error("no open"))
      .mockRejectedValueOnce(new Error("no show"));

    await openUrlWithSimpleBrowser("https://stripe.com/pay", undefined, deps);

    expect(mockExecuteCommand).toHaveBeenCalledTimes(2);
    expect(mockOpenExternal).toHaveBeenCalledWith("uri:https://stripe.com/pay");
  });

  it("rejects invalid URLs", async () => {
    const result = await openUrlWithSimpleBrowser("not a url", undefined, deps);

    expect(result).toBe(false);
    expect(mockExecuteCommand).not.toHaveBeenCalled();
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});

describe("normalizeUrl", () => {
  it("adds https to bare hostnames", () => {
    expect(normalizeUrl("valkyrlabs.com/docs")).toBe(
      "https://valkyrlabs.com/docs",
    );
  });

  it("returns null for javascript: urls", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("openUrlExternally", () => {
  const mockExecuteCommand = jest.fn();
  const mockOpenExternal = jest.fn();
  const deps = {
    commands: { executeCommand: mockExecuteCommand },
    env: { openExternal: mockOpenExternal },
    Uri: { parse: (val: string) => `uri:${val}` },
  } as any;

  beforeEach(() => {
    mockExecuteCommand.mockReset();
    mockOpenExternal.mockReset();
  });

  it("uses the system browser without invoking the embedded browser", async () => {
    mockOpenExternal.mockResolvedValueOnce(true);

    const result = await openUrlExternally(
      "https://auth.openai.com/oauth/authorize",
      deps,
    );

    expect(result).toBe(true);
    expect(mockOpenExternal).toHaveBeenCalledWith(
      "uri:https://auth.openai.com/oauth/authorize",
    );
    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });

  it("rejects invalid external URLs", async () => {
    const result = await openUrlExternally("javascript:alert(1)", deps);

    expect(result).toBe(false);
    expect(mockOpenExternal).not.toHaveBeenCalled();
  });
});
