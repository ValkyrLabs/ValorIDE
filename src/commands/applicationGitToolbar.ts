import * as vscode from "vscode";
import { PROJECT_UUID } from "../services/projectBlueprintSync";

type InstalledApp = { applicationId?: string; name: string; version: string; uri: vscode.Uri };

/** App cards supply IDs, not trusted filesystem locations. Never fall back to tree selection. */
export function registerApplicationGitToolbar(list: () => Promise<InstalledApp[]>) {
  return vscode.commands.registerCommand("valoride.projects.gitForApplication", async (id: unknown, action: unknown): Promise<void> => {
    if (!vscode.workspace.isTrusted || typeof id !== "string" || !PROJECT_UUID.test(id) ||
        (action !== "push" && action !== "pull")) return;
    try {
      const matches = (await list()).filter(p => p.applicationId?.toLowerCase() === id.toLowerCase());
      if (!matches.length) {
        void vscode.window.showWarningMessage("Generate or open this Application’s downloaded project in this workspace first.");
        return;
      }
      const project = matches.length === 1 ? matches[0] : (await vscode.window.showQuickPick(
        matches.map(p => ({ label: p.name, description: p.uri.fsPath, project: p })),
        { title: "Choose this Application’s local checkout" },
      ))?.project;
      if (project) await vscode.commands.executeCommand(
        action === "push" ? "valoride.projects.publishSource" : "valoride.projects.pullSource", project.uri, id,
      );
    } catch (err) {
      void vscode.window.showErrorMessage(err instanceof Error ? err.message : "Unable to resolve the local app.");
    }
  });
}
