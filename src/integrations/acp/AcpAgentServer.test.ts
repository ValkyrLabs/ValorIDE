import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

jest.mock("../../core/task", () => ({ cwd: "" }));
jest.mock("./AcpAgentBridge", () => ({ startAcpAgentBridge: jest.fn() }));
jest.mock("./ValorideAgentBackend", () => ({
  createValorideAgentBackend: jest.fn(),
}));
jest.mock("../../services/auth/StartupAuthService", () => ({
  StartupAuthService: {
    getInstance: () => ({ getAuthenticationRevision: () => 0 }),
  },
}));
jest.mock("../../utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: jest.fn(() => "https://api.example.test/v1"),
}));
jest.mock("vscode", () => ({
  workspace: {
    isTrusted: true,
    workspaceFolders: [],
    openTextDocument: jest.fn(async (value: unknown) => value),
    onDidChangeWorkspaceFolders: jest.fn(() => ({ dispose() {} })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose() {} })),
  },
  window: {
    showWarningMessage: jest.fn(async () => "Enable ACP server"),
    showTextDocument: jest.fn(async () => undefined),
  },
}));
/* eslint-disable @typescript-eslint/no-require-imports -- The repository transformer does not hoist mocks. */
const vscode = require("vscode");
const taskModule = require("../../core/task");
const bridgeModule = require("./AcpAgentBridge");
const credentials = require("../../shared/CredentialOrigin");
const { AcpAgentServer } =
  require("./AcpAgentServer") as typeof import("./AcpAgentServer");
/* eslint-enable @typescript-eslint/no-require-imports */

describe("ACP agent server native lifecycle", () => {
  let root: string, server: InstanceType<typeof AcpAgentServer>;
  let secretChanged: () => void;
  let secretDisposed: ReturnType<typeof jest.fn>;
  let config: Parameters<
    typeof import("./AcpAgentBridge").startAcpAgentBridge
  >[0];
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  beforeEach(async () => {
    jest.clearAllMocks();
    secretDisposed = jest.fn();
    vscode.window.showWarningMessage.mockResolvedValue("Enable ACP server");
    root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "acp-server-")),
    );
    await fs.mkdir(path.join(root, "dist"));
    await fs.writeFile(path.join(root, "dist/acp-agent.cjs"), "fixture");
    taskModule.cwd = root;
    vscode.workspace.isTrusted = true;
    vscode.workspace.workspaceFolders = [
      { uri: { scheme: "file", fsPath: root, toString: () => "file:" + root } },
    ];
    bridgeModule.startAcpAgentBridge.mockImplementation(
      async (options: typeof config) => {
        config = options;
        return {
          connectionFile: path.join(root, "private.json"),
          close: jest.fn(async () => undefined),
        };
      },
    );
    server = new AcpAgentServer(
      {
        extensionPath: root,
        secrets: {
          onDidChange: (listener: () => void) => {
            secretChanged = listener;
            return { dispose: secretDisposed };
          },
        },
      } as any,
      () => ({}) as any,
      () => true,
    );
  });
  afterEach(async () => {
    await server.stop();
    server.dispose();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("rejects an untrusted or stale module-load task workspace before exposing a bridge", async () => {
    vscode.workspace.isTrusted = false;
    await expect(server.start()).rejects.toThrow(/Trust/);
    vscode.workspace.isTrusted = true;
    taskModule.cwd = path.dirname(root);
    await expect(server.start()).rejects.toThrow(/Reload/);
    expect(bridgeModule.startAcpAgentBridge).not.toHaveBeenCalled();
  });
  it("displays a credential-free executable configuration and rechecks trust/root at runtime", async () => {
    await server.start();
    await config.assertActive();
    const content = vscode.workspace.openTextDocument.mock.calls[0][0].content;
    expect(content).toContain("acp-agent.cjs");
    expect(content).toContain("ELECTRON_RUN_AS_NODE");
    expect(content).not.toContain('"token"');
    taskModule.cwd = path.dirname(root);
    await expect(config.assertActive()).rejects.toThrow(/Reload/);
    taskModule.cwd = root;
    vscode.workspace.isTrusted = false;
    await expect(config.assertActive()).rejects.toThrow(/trusted/);
  });
  it("serializes restart behind the previous backend cleanup", async () => {
    let release!: () => void;
    const cleanup = new Promise<void>((resolve) => {
      release = resolve;
    });
    bridgeModule.startAcpAgentBridge.mockResolvedValueOnce({
      connectionFile: path.join(root, "private.json"),
      close: () => cleanup,
    });
    await server.start();
    const stopped = server.stop();
    const restarted = server.start();
    await tick();
    expect(bridgeModule.startAcpAgentBridge).toHaveBeenCalledTimes(1);
    release();
    await stopped;
    await restarted;
    expect(bridgeModule.startAcpAgentBridge).toHaveBeenCalledTimes(2);
  });
  it("does not restart a disposed host", async () => {
    server.dispose();
    await server.start();
    expect(bridgeModule.startAcpAgentBridge).not.toHaveBeenCalled();
  });
  it("revokes and closes the active bridge on credential rotation without reading secrets", async () => {
    await server.start();
    const bridge = await bridgeModule.startAcpAgentBridge.mock.results[0].value;
    secretChanged();
    await tick();
    expect(bridge.close).toHaveBeenCalledTimes(1);
    expect(secretDisposed).toHaveBeenCalledTimes(1);
    await expect(config.assertActive()).rejects.toThrow(/account|credentials/);
  });
  it("detects logout revision changes even before asynchronous secret notifications", async () => {
    await server.start();
    credentials.clearCredentialOrigins();
    await expect(config.assertActive()).rejects.toThrow(/account|credentials/);
    const bridge = await bridgeModule.startAcpAgentBridge.mock.results[0].value;
    await tick();
    expect(bridge.close).toHaveBeenCalledTimes(1);
  });
  it("does not accept stale consent when credentials change while the dialog is open", async () => {
    let answer!: (value: string) => void;
    vscode.window.showWarningMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    const started = server.start();
    while (!answer) await tick();
    secretChanged();
    answer("Enable ACP server");
    await started;
    expect(bridgeModule.startAcpAgentBridge).not.toHaveBeenCalled();
    expect(secretDisposed).toHaveBeenCalledTimes(1);
  });
  it("disposes account monitoring if native enable consent is declined", async () => {
    vscode.window.showWarningMessage.mockResolvedValueOnce(undefined);
    await server.start();
    expect(bridgeModule.startAcpAgentBridge).not.toHaveBeenCalled();
    expect(secretDisposed).toHaveBeenCalledTimes(1);
  });
  it("closes a provisional bridge if authentication changes while it is starting", async () => {
    const close = jest.fn(async () => undefined);
    bridgeModule.startAcpAgentBridge.mockImplementationOnce(async () => {
      credentials.clearCredentialOrigins();
      return { connectionFile: path.join(root, "private.json"), close };
    });
    await expect(server.start()).rejects.toThrow(/account|credentials/);
    expect(close).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    expect(secretDisposed).toHaveBeenCalledTimes(1);
  });
  it("disposes monitoring immediately when stopped during pending consent", async () => {
    let answer!: (value: string) => void;
    vscode.window.showWarningMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    const started = server.start();
    while (!answer) await tick();
    await server.stop();
    expect(secretDisposed).toHaveBeenCalledTimes(1);
    answer("Enable ACP server");
    await started;
    expect(bridgeModule.startAcpAgentBridge).not.toHaveBeenCalled();
    expect(secretDisposed).toHaveBeenCalledTimes(1);
  });
});
