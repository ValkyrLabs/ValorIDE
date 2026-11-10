import * as vscode from "vscode";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
} from "@agentclientprotocol/sdk";
import { AcpSession, AcpSessionState } from "./AcpSession";
import { AcpFileSystem } from "./AcpFileSystem";
import { acpPanelHtml } from "./acpPanelHtml";
import {
  acpDisplay,
  buildAcpLaunch,
  parseAcpAgents,
  AcpAgentConfiguration,
} from "./acpConfiguration";

export const configuredAcpAgents = () =>
  parseAcpAgents(
    vscode.workspace.getConfiguration("valoride").inspect<unknown>("acp.agents")
      ?.globalValue,
  );

/** Native choices are never auto-approved and cancellation dismisses pending choices. */
export async function acpPick<T extends vscode.QuickPickItem>(
  items: T[],
  title: string,
  signal: AbortSignal,
): Promise<T | undefined> {
  if (signal.aborted) return undefined;
  const token = new vscode.CancellationTokenSource();
  const abort = () => token.cancel();
  signal.addEventListener("abort", abort, { once: true });
  try {
    return await vscode.window.showQuickPick(
      items,
      { title, ignoreFocusOut: true, matchOnDescription: true },
      token.token,
    );
  } finally {
    signal.removeEventListener("abort", abort);
    token.dispose();
  }
}

export async function acpPermission(
  request: RequestPermissionRequest,
  signal: AbortSignal,
  agentName: string,
  review?: (text: string) => Promise<void>,
): Promise<RequestPermissionResponse> {
  if (
    signal.aborted ||
    request.options.length === 0 ||
    request.options.length > 32 ||
    new Set(request.options.map((x) => x.optionId)).size !==
      request.options.length
  )
    return { outcome: { outcome: "cancelled" } };
  const details = JSON.stringify(request.toolCall, null, 2);
  if (details.length > 128 * 1024) return { outcome: { outcome: "cancelled" } };
  if (review)
    await review(
      `Agent permission request — ${acpDisplay(agentName)}\n\nThese details are supplied by the agent. This is not an OS sandbox.\n\n${details
        .split("\n")
        .map((line) => acpDisplay(line, 128 * 1024))
        .join("\n")}\n`,
    );
  if (signal.aborted) return { outcome: { outcome: "cancelled" } };
  const items = request.options
    .map((option) => ({
      label: acpDisplay(option.name, 160),
      description: option.kind.replaceAll("_", " "),
      detail: acpDisplay(request.toolCall.title, 1500),
      id: option.optionId,
      optionKind: option.kind,
    }))
    .sort(
      (a, b) =>
        Number(!a.optionKind.startsWith("reject")) -
        Number(!b.optionKind.startsWith("reject")),
    );
  const selected = await acpPick(
    items,
    `${acpDisplay(agentName, 100)} requests permission`,
    signal,
  );
  return !selected || signal.aborted
    ? { outcome: { outcome: "cancelled" } }
    : { outcome: { outcome: "selected", optionId: selected.id } };
}

export class AcpPanel implements vscode.Disposable {
  private static current: AcpPanel | undefined;
  static open(context: vscode.ExtensionContext) {
    if (this.current) this.current.panel.reveal();
    else this.current = new AcpPanel(context);
  }
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly reviewDocuments = new Map<string, string>();
  private session?: AcpSession;
  private agent?: AcpAgentConfiguration;
  private workspace?: vscode.WorkspaceFolder;
  private root?: string;
  private rootIdentity?: string;
  private epoch = 0;
  private disposed = false;
  private connecting = false;
  private editPending = false;
  private readonly lifetime = new AbortController();
  private connectionLifetime = new AbortController();
  private renderedState: Record<string, unknown> = { status: "disconnected" };

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.panel = vscode.window.createWebviewPanel(
      "valoride.acp",
      "ACP Agents",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );
    context.subscriptions.push(this);
    this.disposables.push(
      vscode.workspace.registerTextDocumentContentProvider(
        "valoride-acp-review",
        {
          provideTextDocumentContent: (uri) =>
            this.reviewDocuments.get(uri.toString()) ?? "Review expired.",
        },
      ),
    );
    this.disposables.push(this.panel.onDidDispose(() => this.dispose()));
    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((message) => {
        void this.receive(message);
      }),
    );
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("valoride.acp.agents")) {
          this.disconnect();
          this.notice(
            "ACP settings changed. Connect again to use the current configuration.",
          );
        }
      }),
    );
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        if (
          this.workspace &&
          !vscode.workspace.workspaceFolders?.some(
            (f) => f.uri.toString() === this.workspace?.uri.toString(),
          )
        ) {
          this.disconnect();
          this.notice("The session workspace was closed.");
        }
      }),
    );
    this.panel.webview.html = acpPanelHtml();
  }

  private post(message: unknown) {
    if (!this.disposed) void this.panel.webview.postMessage(message);
  }
  private notice(text: string) {
    this.post({ type: "notice", text: acpDisplay(text) });
  }
  private state(state: AcpSessionState) {
    const status =
      state.status === "closed"
        ? "disconnected"
        : ["connecting", "starting", "authenticating"].includes(state.status) ||
            (state.busy && state.status === "connected")
          ? "connecting"
          : state.status === "connected"
            ? "ready"
            : state.busy && state.status === "ready"
              ? "connecting"
              : state.status;
    this.renderedState = {
      status,
      agentName: this.agent?.name,
      sessionId: state.sessionId,
      modes: state.modes,
      loadSession:
        state.initialization?.agentCapabilities?.loadSession === true,
      authMethods: state.initialization?.authMethods,
      error: state.error ? acpDisplay(state.error) : undefined,
    };
    this.post({ type: "state", state: this.renderedState });
    if (state.status === "closed") {
      this.session = undefined;
      this.connectionLifetime.abort();
    }
  }

  private async assertActive(epoch: number, signal?: AbortSignal) {
    if (
      this.disposed ||
      this.epoch !== epoch ||
      signal?.aborted ||
      !vscode.workspace.isTrusted ||
      !this.root ||
      !this.workspace ||
      !vscode.workspace.workspaceFolders?.some(
        (f) => f.uri.toString() === this.workspace?.uri.toString(),
      )
    )
      throw new Error(
        "ACP access ended or this workspace is no longer trusted.",
      );
    if ((await fs.realpath(this.workspace.uri.fsPath)) !== this.root)
      throw new Error(
        "The ACP workspace path changed. Reconnect before continuing.",
      );
    const identity = await fs.stat(this.root);
    if (`${identity.dev}:${identity.ino}` !== this.rootIdentity)
      throw new Error(
        "The ACP workspace directory was replaced. Reconnect before continuing.",
      );
    if (this.epoch !== epoch || signal?.aborted || !vscode.workspace.isTrusted)
      throw new Error("ACP operation cancelled.");
  }

  private async connect() {
    if (this.connecting || this.session) return;
    if (!vscode.workspace.isTrusted)
      throw new Error(
        "Trust the workspace before starting a local ACP executable.",
      );
    this.connecting = true;
    const epoch = ++this.epoch;
    this.connectionLifetime.abort();
    this.connectionLifetime = new AbortController();
    try {
      const agents = configuredAcpAgents();
      if (!agents.length) {
        this.notice(
          "Add an agent to valoride.acp.agents in User settings. See the ACP setup guide; no agent is installed automatically.",
        );
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "@id:valoride.acp.agents",
        );
        return;
      }
      const chosen = await vscode.window.showQuickPick(
        agents.map((agent) => ({
          label: acpDisplay(agent.name),
          description: agent.command,
          agent,
        })),
        { title: "Choose an ACP agent from User settings" },
      );
      if (!chosen) return;
      const folders =
        vscode.workspace.workspaceFolders?.filter(
          (f) => f.uri.scheme === "file",
        ) ?? [];
      const folder =
        folders.length === 1
          ? folders[0]
          : (
              await vscode.window.showQuickPick(
                folders.map((folder) => ({
                  label: folder.name,
                  description: folder.uri.fsPath,
                  folder,
                })),
                { title: "Choose the ACP session workspace" },
              )
            )?.folder;
      if (!folder) {
        if (!folders.length)
          throw new Error("Open a local workspace folder first.");
        return;
      }
      const launch = await buildAcpLaunch(
        chosen.agent,
        folder.uri.fsPath,
        (key) => this.context.secrets.get(key),
      );
      const approved = await vscode.window.showWarningMessage(
        `Start ${acpDisplay(chosen.agent.name)}?`,
        {
          modal: true,
          detail: `${acpDisplay([launch.agent.command, ...launch.agent.args].map((x) => JSON.stringify(x)).join(" "))}\n\nWorkspace: ${acpDisplay(launch.cwd)}\n\nThis is a local program with your OS permissions, not a sandbox. ACP approvals only govern cooperative agents and ValorIDE-provided operations. Only run agents you trust.`,
        },
        "Start agent",
      );
      if (
        approved !== "Start agent" ||
        this.disposed ||
        this.epoch !== epoch ||
        !vscode.workspace.isTrusted
      )
        return;
      if (
        JSON.stringify(
          configuredAcpAgents().find((a) => a.id === chosen.agent.id),
        ) !== JSON.stringify(chosen.agent)
      )
        throw new Error(
          "Agent settings changed during confirmation. Connect again.",
        );
      this.workspace = folder;
      this.root = launch.cwd;
      const rootStat = await fs.stat(launch.cwd);
      this.rootIdentity = `${rootStat.dev}:${rootStat.ino}`;
      this.agent = chosen.agent;
      await this.assertActive(epoch);
      const fileSystem = (signal: AbortSignal) =>
        new AcpFileSystem(launch.cwd, {
          assertActive: () => this.assertActive(epoch, signal),
          confirmWrite: async (proposal) => {
            await this.assertActive(epoch, signal);
            const id = randomUUID();
            const before = vscode.Uri.parse(
                `valoride-acp-review:/${id}/before`,
              ),
              after = vscode.Uri.parse(`valoride-acp-review:/${id}/proposed`);
            this.reviewDocuments.set(
              before.toString(),
              proposal.currentContent,
            );
            this.reviewDocuments.set(
              after.toString(),
              proposal.proposedContent,
            );
            try {
              await vscode.commands.executeCommand(
                "vscode.diff",
                before,
                after,
                `ACP edit · ${acpDisplay(proposal.path)}`,
                { preview: true },
              );
              const choice = await acpPick(
                [
                  { label: "Reject edit", apply: false },
                  {
                    label: "Apply reviewed edit",
                    description: "Updates the editor buffer; no automatic save",
                    apply: true,
                  },
                ],
                `ACP file edit: ${acpDisplay(proposal.path, 500)}`,
                signal,
              );
              await this.assertActive(epoch, signal);
              return choice?.apply === true;
            } finally {
              this.reviewDocuments.delete(before.toString());
              this.reviewDocuments.delete(after.toString());
            }
          },
        });
      this.post({ type: "reset" });
      const session = new AcpSession({
        ...launch,
        clientVersion: String(this.context.extension.packageJSON.version),
        callbacks: {
          onState: (state) => {
            if (this.epoch === epoch) this.state(state);
          },
          onUpdate: (notification) => {
            if (this.epoch === epoch)
              this.post({ type: "update", update: notification.update });
          },
          requestPermission: async (request, signal) => {
            await this.assertActive(epoch, signal);
            const uri = vscode.Uri.parse(
              `valoride-acp-review:/${randomUUID()}/permission`,
            );
            try {
              return await acpPermission(
                request,
                signal,
                chosen.agent.name,
                async (details) => {
                  this.reviewDocuments.set(uri.toString(), details);
                  await vscode.window.showTextDocument(
                    await vscode.workspace.openTextDocument(uri),
                    { preview: true, preserveFocus: true },
                  );
                  await this.assertActive(epoch, signal);
                },
              );
            } finally {
              this.reviewDocuments.delete(uri.toString());
            }
          },
          readTextFile: (request, signal) =>
            fileSystem(signal).readTextFile(request),
          writeTextFile: async (request, signal) => {
            if (this.editPending)
              throw new Error(
                "Another ACP edit is awaiting review. Wait for its result before writing again.",
              );
            this.editPending = true;
            try {
              return await fileSystem(signal).writeTextFile(request);
            } finally {
              this.editPending = false;
            }
          },
        },
      });
      this.session = session;
      await session.connect();
      await this.assertActive(epoch);
      await session.newSession();
    } finally {
      if (this.epoch === epoch) this.connecting = false;
    }
  }

  private async receive(message: unknown) {
    if (!message || typeof message !== "object" || this.disposed) return;
    const { type, text } = message as { type?: string; text?: unknown };
    try {
      if (type === "ready") {
        this.post({ type: "state", state: this.renderedState });
        return;
      }
      if (type === "connect") {
        await this.connect();
        return;
      }
      if (type === "disconnect") {
        this.disconnect();
        return;
      }
      const session = this.session;
      if (!session) return;
      const epoch = this.epoch;
      if (type === "cancel") {
        await session.cancel();
        return;
      }
      await this.assertActive(this.epoch);
      if (type === "prompt") {
        if (typeof text !== "string" || !text.trim() || text.length > 200000)
          throw new Error("Enter a prompt of up to 200,000 characters.");
        if (session.state.busy || !session.state.sessionId)
          throw new Error(
            "Wait for the current operation or start a session first.",
          );
        this.post({ type: "user", text });
        const result = await session.prompt(text);
        if (this.epoch === epoch)
          this.notice(`Turn ended: ${result.stopReason.replaceAll("_", " ")}.`);
      } else if (type === "newSession") {
        if (session.state.busy) return;
        await session.newSession();
        if (this.epoch === epoch) this.post({ type: "reset" });
      } else if (type === "resume") {
        if (
          session.state.busy ||
          !session.state.initialization?.agentCapabilities?.loadSession
        )
          return;
        const id = await vscode.window.showInputBox({
          title: "Resume an ACP session",
          prompt:
            "Session ID managed by this configured agent and current account",
          ignoreFocusOut: true,
          validateInput: (value) =>
            !value.trim() || value.length > 1024
              ? "Enter a session ID (up to 1024 characters)."
              : undefined,
        });
        if (id) {
          await this.assertActive(epoch);
          this.post({ type: "reset" });
          await session.loadSession(id.trim());
        }
      } else if (type === "authenticate") {
        if (session.state.busy) return;
        const methods = session.state.initialization?.authMethods ?? [];
        const epoch = this.epoch;
        const picked = await acpPick(
          methods.map((method) => ({
            label: acpDisplay(method.name),
            description: acpDisplay(method.description),
            method,
          })),
          "Authenticate with this ACP agent",
          this.connectionLifetime.signal,
        );
        if (picked) {
          await this.assertActive(epoch);
          await session.authenticate(picked.method.id);
          if (!session.state.sessionId) await session.newSession();
        }
      } else if (type === "setMode") {
        if (session.state.busy) return;
        const epoch = this.epoch;
        const picked = await acpPick(
          (session.state.modes?.availableModes ?? []).map((mode) => ({
            label: acpDisplay(mode.name),
            description: acpDisplay(mode.description),
            id: mode.id,
          })),
          "Choose the ACP session mode",
          this.connectionLifetime.signal,
        );
        if (picked) {
          await this.assertActive(epoch);
          await session.setMode(picked.id);
        }
      }
    } catch (error) {
      const text = acpDisplay(
        error instanceof Error ? error.message : "ACP operation failed.",
      );
      this.notice(text);
      if (this.session) this.state(this.session.state);
      if (!this.session) {
        this.renderedState = { status: "error", error: text };
        this.post({ type: "state", state: this.renderedState });
      }
    }
  }

  disconnect() {
    this.epoch++;
    this.connecting = false;
    this.connectionLifetime.abort();
    this.session?.dispose();
    this.session = undefined;
    this.agent = undefined;
    this.workspace = undefined;
    this.root = undefined;
    this.rootIdentity = undefined;
    this.renderedState = { status: "disconnected" };
    this.post({ type: "state", state: this.renderedState });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetime.abort();
    this.disconnect();
    this.disposables.splice(0).forEach((disposable) => disposable.dispose());
    this.reviewDocuments.clear();
    this.panel.dispose();
    if (AcpPanel.current === this) AcpPanel.current = undefined;
  }
}
