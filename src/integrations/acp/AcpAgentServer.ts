import * as vscode from "vscode";
import path from "node:path";
import fs from "node:fs/promises";
import type { Controller } from "../../core/controller";
import { startAcpAgentBridge } from "./AcpAgentBridge";
import { createValorideAgentBackend } from "./ValorideAgentBackend";
import { acpDisplay, assertAcpTaskWorkspace } from "./acpConfiguration";
import { cwd as taskWorkspace } from "../../core/task";
import { createAcpHostAccountGuard } from "./AcpHostAccountGuard";
import { getCredentialRevision } from "../../shared/CredentialOrigin";
import { StartupAuthService } from "../../services/auth/StartupAuthService";
import { getValkyraiBasePath } from "../../utils/serverValkyraiHost";

export class AcpAgentServer implements vscode.Disposable {
  private bridge?: Awaited<ReturnType<typeof startAcpAgentBridge>>;
  private registrations: vscode.Disposable[] = [];
  private epoch = 0;
  private starting = false;
  private disposed = false;
  private stopping: Promise<void> = Promise.resolve();
  constructor(
    private context: vscode.ExtensionContext,
    private getController: () => Controller | undefined,
    private isIdle: () => boolean,
  ) {}

  async start() {
    await this.stopping;
    if (this.disposed) return;
    if (this.starting) return;
    if (this.bridge) {
      await this.showConfiguration();
      return;
    }
    this.starting = true;
    const epoch = ++this.epoch;
    let accountGuard: ReturnType<typeof createAcpHostAccountGuard> | undefined;
    let retainedGuard = false;
    try {
      if (!vscode.workspace.isTrusted)
        throw new Error(
          "Trust this workspace before exposing ValorIDE as an ACP agent.",
        );
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder || folder.uri.scheme !== "file")
        throw new Error(
          "Open a local workspace first. The ValorIDE agent uses the first workspace folder.",
        );
      const controller = this.getController();
      if (!controller)
        throw new Error(
          "Open the ValorIDE sidebar first, then start the ACP agent server.",
        );
      if (!this.isIdle())
        throw new Error(
          "Clear the existing ValorIDE chat task before starting an external ACP session.",
        );
      const root = await fs.realpath(folder.uri.fsPath),
        stat = await fs.stat(root),
        identity = `${stat.dev}:${stat.ino}`;
      await assertAcpTaskWorkspace(root, taskWorkspace);
      const entrypoint = path.join(
        this.context.extensionPath,
        "dist",
        "acp-agent.cjs",
      );
      await fs.access(entrypoint);
      accountGuard = createAcpHostAccountGuard({
        snapshot: () =>
          JSON.stringify([
            getCredentialRevision(),
            StartupAuthService.getInstance(
              this.context,
            ).getAuthenticationRevision(),
            getValkyraiBasePath(),
          ]),
        subscribe: (revoke) => {
          // Intentionally conservative: provider/account secret rotations require
          // fresh consent. No secret value is read, logged, or sent over ACP.
          const secrets = this.context.secrets.onDidChange(revoke);
          const configuration = vscode.workspace.onDidChangeConfiguration(
            (e) => {
              if (e.affectsConfiguration("valoride.valkyrai.host")) revoke();
            },
          );
          return {
            dispose() {
              secrets.dispose();
              configuration.dispose();
            },
          };
        },
        onRevoke: () => {
          if (epoch === this.epoch) void this.stop();
        },
      });
      this.registrations.push(accountGuard);
      accountGuard.assertActive();
      const answer = await vscode.window.showWarningMessage(
        "Expose ValorIDE as a local ACP agent?",
        {
          modal: true,
          detail: `Workspace: ${acpDisplay(root)}\n\nApproved local ACP clients can prompt ValorIDE using its currently selected model/account and configured tools. Normal tool approvals remain required; auto-approval is disabled for these tasks. Signing in/out, changing credentials, or changing the backend stops this server and requires fresh consent. This is a private Unix-socket bridge, not a sandbox or a Sage/SWARM execution grant. Stop it with ValorIDE: Stop ACP Agent Server.`,
        },
        "Enable ACP server",
      );
      if (answer !== "Enable ACP server" || epoch !== this.epoch) return;
      const assertActive = async () => {
        accountGuard!.assertActive();
        if (
          epoch !== this.epoch ||
          !vscode.workspace.isTrusted ||
          vscode.workspace.workspaceFolders?.[0]?.uri.toString() !==
            folder.uri.toString()
        )
          throw new Error(
            "The ACP server workspace is no longer active or trusted.",
          );
        const current = await fs.stat(root);
        await assertAcpTaskWorkspace(root, taskWorkspace);
        if (
          `${current.dev}:${current.ino}` !== identity ||
          (await fs.realpath(folder.uri.fsPath)) !== root ||
          epoch !== this.epoch ||
          !vscode.workspace.isTrusted
        )
          throw new Error(
            "The ACP server workspace changed. Restart the server.",
          );
        accountGuard!.assertActive();
      };
      const bridge = await startAcpAgentBridge({
        cwd: root,
        assertActive,
        createBackend: () =>
          createValorideAgentBackend({
            controller,
            cwd: root,
            isWorkspaceActive: assertActive,
            isWorkspaceIdle: this.isIdle,
            approveSession: async () => {
              await assertActive();
              const choice = await vscode.window.showWarningMessage(
                "Allow an external ACP conversation to use ValorIDE?",
                {
                  modal: true,
                  detail: `This session can use the selected model/account in ${acpDisplay(root)}. Tool approvals are relayed to that ACP client; this does not grant blanket execution permission.`,
                },
                "Allow session",
              );
              await assertActive();
              return choice === "Allow session";
            },
          }),
      });
      if (epoch !== this.epoch) {
        await bridge.close();
        return;
      }
      // Bridge setup awaits filesystem operations. Recheck silent auth revision
      // changes as well as events before publishing the connection descriptor.
      try {
        await assertActive();
      } catch (error) {
        await bridge.close();
        throw error;
      }
      this.bridge = bridge;
      retainedGuard = true;
      this.registrations.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
          void this.stop();
        }),
      );
      await this.showConfiguration();
    } finally {
      if (!retainedGuard && accountGuard) {
        const index = this.registrations.indexOf(accountGuard);
        if (index !== -1) this.registrations.splice(index, 1);
        accountGuard.dispose();
      }
      if (epoch === this.epoch) this.starting = false;
    }
  }
  private async showConfiguration() {
    if (!this.bridge) return;
    const configuration = {
      command: process.execPath,
      args: [
        path.join(this.context.extensionPath, "dist", "acp-agent.cjs"),
        "--connection",
        this.bridge.connectionFile,
      ],
      env: { ELECTRON_RUN_AS_NODE: "1" },
    };
    const doc = await vscode.workspace.openTextDocument({
      language: "jsonc",
      content:
        "// Add this command configuration to your ACP editor. The workspace/cwd must match ValorIDE.\n// Keep this ValorIDE window running. Stopping/restarting the server invalidates the old connection file.\n// No API token is included here; the private endpoint file is owner-only.\n" +
        JSON.stringify({ valoride: configuration }, null, 2) +
        "\n",
    });
    await vscode.window.showTextDocument(doc, { preview: false });
  }
  async stop() {
    this.epoch++;
    this.starting = false;
    this.registrations.splice(0).forEach((item) => item.dispose());
    const bridge = this.bridge;
    this.bridge = undefined;
    this.stopping = Promise.all([this.stopping, bridge?.close()]).then(
      () => undefined,
    );
    await this.stopping;
  }
  dispose() {
    this.disposed = true;
    void this.stop();
  }
}
