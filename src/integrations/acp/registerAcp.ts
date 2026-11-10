import * as vscode from "vscode";
import { acpDisplay, acpSecretKey, parseAcpAgents } from "./acpConfiguration";
import type { Controller } from "../../core/controller";

/** Registration is cheap; the ACP SDK/panel is loaded only on explicit use. */
export function registerAcp(
  context: vscode.ExtensionContext,
  getController: () => Controller | undefined,
  isIdle: () => boolean,
) {
  let server: import("./AcpAgentServer").AcpAgentServer | undefined;
  context.subscriptions.push({ dispose: () => server?.dispose() });
  context.subscriptions.push(
    vscode.commands.registerCommand("valoride.acp.serve", async () => {
      try {
        const { AcpAgentServer } = await import("./AcpAgentServer");
        server ??= new AcpAgentServer(context, getController, isIdle);
        await server.start();
      } catch (error) {
        await vscode.window.showErrorMessage(
          acpDisplay(error instanceof Error ? error.message : error),
        );
      }
    }),
    vscode.commands.registerCommand("valoride.acp.stopServer", async () => {
      await server?.stop();
      await vscode.window.showInformationMessage(
        "ValorIDE ACP agent server stopped.",
      );
    }),
    vscode.commands.registerCommand("valoride.acp.open", async () => {
      try {
        const { AcpPanel } = await import("./AcpPanel");
        AcpPanel.open(context);
      } catch (error) {
        await vscode.window.showErrorMessage(
          `Cannot open ACP: ${acpDisplay(error instanceof Error ? error.message : error)}`,
        );
      }
    }),
    vscode.commands.registerCommand("valoride.acp.configure", () =>
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@id:valoride.acp.agents",
      ),
    ),
    vscode.commands.registerCommand("valoride.acp.setSecret", async () => {
      try {
        const agents = parseAcpAgents(
          vscode.workspace
            .getConfiguration("valoride")
            .inspect<unknown>("acp.agents")?.globalValue,
        );
        const agent = await vscode.window.showQuickPick(
          agents.map((agent) => ({ label: acpDisplay(agent.name), agent })),
          { title: "Choose ACP agent" },
        );
        if (!agent) return;
        if (!agent.agent.secretEnv.length) {
          await vscode.window.showInformationMessage(
            "List the required environment variable names in the agent's secretEnv setting first.",
          );
          return;
        }
        const name = await vscode.window.showQuickPick(agent.agent.secretEnv, {
          title: "Choose ACP secret environment variable",
        });
        if (!name) return;
        const value = await vscode.window.showInputBox({
          title: `Secret for ${acpDisplay(agent.agent.name)} · ${name}`,
          prompt:
            "Stored in VS Code SecretStorage, not workspace settings. Leave empty to remove.",
          password: true,
          ignoreFocusOut: true,
        });
        if (value === undefined) return;
        if (value)
          await context.secrets.store(
            acpSecretKey(agent.agent.id, name),
            value,
          );
        else await context.secrets.delete(acpSecretKey(agent.agent.id, name));
        await vscode.window.showInformationMessage(
          "ACP secret updated. Disconnect and reconnect any running session to use it.",
        );
      } catch (error) {
        await vscode.window.showErrorMessage(
          acpDisplay(error instanceof Error ? error.message : error),
        );
      }
    }),
  );
}
