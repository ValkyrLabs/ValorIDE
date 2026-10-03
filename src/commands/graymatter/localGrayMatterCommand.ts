import { access } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import type { McpHub } from "@services/mcp/McpHub";
import { grayMatterPluginRootCandidates } from "@services/graymatter/GrayMatterMcpBridge";
import { setupLocalGrayMatter } from "@services/graymatter/GrayMatterLocalSetup";

let pendingSetup: Promise<void> | undefined;

const runLiteTask = async (
  root: string,
  command: "setup" | "up",
): Promise<void> => {
  const task = new vscode.Task(
    { type: "graymatter-lite", setupId: randomUUID() },
    vscode.TaskScope.Global,
    command === "setup" ? "Set up local memory" : "Start local memory",
    "GrayMatter",
    new vscode.ShellExecution(path.join(root, "vaix"), [command], {
      cwd: root,
    }),
  );
  await new Promise<void>((resolve, reject) => {
    const matches = (execution: vscode.TaskExecution) =>
      execution.task.definition.setupId === task.definition.setupId;
    const interrupted = vscode.tasks.onDidEndTask((event) => {
      if (!matches(event.execution)) return;
      subscription.dispose();
      interrupted.dispose();
      reject(
        new Error(
          "Local setup was interrupted. Retry Connect Local GrayMatter Lite to resume.",
        ),
      );
    });
    const subscription = vscode.tasks.onDidEndTaskProcess((event) => {
      if (!matches(event.execution)) return;
      subscription.dispose();
      interrupted.dispose();
      if (event.exitCode === 0) resolve();
      else
        reject(
          new Error(
            "Local setup was interrupted or failed. Check the GrayMatter task terminal, then retry Connect Local GrayMatter Lite. Your existing local data and hosted account stay available.",
          ),
        );
    });
    Promise.resolve(vscode.tasks.executeTask(task)).catch((error) => {
      subscription.dispose();
      interrupted.dispose();
      reject(error);
    });
  });
};

export const connectLocalGrayMatterCommand = (
  context: vscode.ExtensionContext,
  hub: McpHub,
): Promise<void> => {
  if (pendingSetup) return pendingSetup;
  pendingSetup = (async () => {
    const roots = [
      context.globalState.get<string>("grayMatterLiteRoot"),
      ...(vscode.workspace.workspaceFolders ?? []).map(
        (folder) => folder.uri.fsPath,
      ),
      ...(await grayMatterPluginRootCandidates()),
    ].filter((root): root is string => Boolean(root));
    let root: string | undefined;
    for (const candidate of roots) {
      try {
        await access(path.join(candidate, "vaix"));
        await access(path.join(candidate, "scripts", "gm-mcp-launcher.mjs"));
        await access(path.join(candidate, "scripts", "gm-connection.mjs"));
        await access(
          path.join(
            candidate,
            "templates",
            "graymatter-light-bootstrap",
            "local-server",
            "pom.xml",
          ),
        );
        root = candidate;
        break;
      } catch {
        /* Try the next installed source folder. */
      }
    }
    if (!root) {
      const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Set up local GrayMatter",
        title:
          "Choose the GrayMatter source folder (github.com/ValkyrLabs/GrayMatter)",
      });
      root = folders?.[0]?.fsPath;
    }
    if (!root)
      throw new Error(
        "Local setup was cancelled. Choose a GrayMatter source folder to continue without a hosted account.",
      );
    await setupLocalGrayMatter({
      root,
      hub,
      run: (command) => runLiteTask(root!, command),
    });
    await context.globalState.update("grayMatterLiteRoot", root);
    void vscode.window.showInformationMessage(
      "Local GrayMatter Lite is connected. Memory tools are ready in the MCP panel; choose your coding model to start.",
    );
  })().finally(() => {
    pendingSetup = undefined;
  });
  return pendingSetup;
};
