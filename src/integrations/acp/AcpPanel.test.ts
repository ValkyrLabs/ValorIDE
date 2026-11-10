import { beforeEach, describe, expect, it, jest } from "@jest/globals";
jest.mock("./AcpSession", () => ({ AcpSession: jest.fn() }));
jest.mock("./AcpFileSystem", () => ({ AcpFileSystem: jest.fn() }));
jest.mock("./acpPanelHtml", () => ({ acpPanelHtml: () => "<html></html>" }));
jest.mock("vscode", () => ({
  window: { showQuickPick: jest.fn() },
  workspace: { getConfiguration: jest.fn() },
  CancellationTokenSource: class {
    token = { isCancellationRequested: false };
    cancel() {
      this.token.isCancellationRequested = true;
    }
    dispose() {}
  },
}));
// These loads follow mocks because the repository's esbuild Jest transform does not hoist jest.mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require("vscode");
const { acpPermission, configuredAcpAgents } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./AcpPanel") as typeof import("./AcpPanel");

describe("Native ACP permissions and config boundary", () => {
  beforeEach(() => jest.clearAllMocks());
  const request = () => ({
    sessionId: "session",
    toolCall: {
      toolCallId: "tool",
      title: "Run build",
      rawInput: { command: "npm test" },
    },
    options: [
      { optionId: "yes", name: "Allow once", kind: "allow_once" as const },
      { optionId: "no", name: "Reject", kind: "reject_once" as const },
    ],
  });
  it("only reads global user launch configuration", () => {
    const inspect = jest.fn(() => ({
      globalValue: [{ id: "user", name: "User", command: "node" }],
      workspaceValue: [{ id: "evil", name: "Repo", command: "malicious" }],
    }));
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      inspect,
      get: () => [{ id: "evil" }],
    });
    expect(configuredAcpAgents().map((a) => a.id)).toEqual(["user"]);
    expect(inspect).toHaveBeenCalledWith("acp.agents");
  });
  it("uses rejection as first/default choice and returns the exact offered ID", async () => {
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(
      async (items: any) => {
        expect(items[0].id).toBe("no");
        return items[1];
      },
    );
    expect(
      await acpPermission(request(), new AbortController().signal, "Agent"),
    ).toEqual({ outcome: { outcome: "selected", optionId: "yes" } });
  });
  it("reviews the actual raw input before asking permission", async () => {
    const review = jest.fn(async (text: string) => {
      expect(text).toContain("npm test");
    });
    await acpPermission(
      request(),
      new AbortController().signal,
      "Agent",
      review,
    );
    expect(review).toHaveBeenCalledTimes(1);
  });
  it("dismissal and already-cancelled requests yield cancelled", async () => {
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(
      undefined as never,
    );
    expect(
      await acpPermission(request(), new AbortController().signal, "Agent"),
    ).toEqual({ outcome: { outcome: "cancelled" } });
    const controller = new AbortController();
    controller.abort();
    await acpPermission(request(), controller.signal, "Agent");
    expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
  });
  it("rejects duplicate or absent permission IDs rather than guessing", async () => {
    for (const options of [[], [request().options[0], request().options[0]]])
      expect(
        await acpPermission(
          { ...request(), options },
          new AbortController().signal,
          "Agent",
        ),
      ).toEqual({ outcome: { outcome: "cancelled" } });
    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
  });
  it("a choice resolving after cancellation never grants permission", async () => {
    const controller = new AbortController();
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(
      async (items: any, _opts: any, token: any) => {
        controller.abort();
        expect(token.isCancellationRequested).toBe(true);
        return items[1];
      },
    );
    expect(await acpPermission(request(), controller.signal, "Agent")).toEqual({
      outcome: { outcome: "cancelled" },
    });
  });
});
