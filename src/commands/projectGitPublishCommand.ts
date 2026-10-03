import * as vscode from "vscode";
import { ProjectGitExtension, planProjectGitPublish, publishProjectWithBuiltinGit } from "../services/projectGitPublish";

export function registerProjectGitPublishCommand(context: vscode.ExtensionContext, output: vscode.OutputChannel, resolveProject: (target?: unknown) => vscode.Uri | undefined): vscode.Disposable {
  return vscode.commands.registerCommand("valoride.projects.publishSource", async (target?: unknown) => {
    try {
      if (!vscode.workspace.isTrusted) throw new Error("Trust the project workspace before publishing source.");
      const project = resolveProject(target) || vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!project) throw new Error("Open or select the project to publish.");
      const extension = vscode.extensions.getExtension<ProjectGitExtension>("vscode.git");
      if (!extension) throw new Error("Enable VS Code's built-in Git extension before publishing project source.");
      if (!extension.isActive) await extension.activate();
      const api = extension.exports.getAPI(1);
      const chosen = await vscode.window.showQuickPick(api.repositories.map((repository) => ({ label: repository.rootUri.fsPath, repository })), { title: "Choose the project Git repository" });
      if (!chosen) return undefined;
      const repository = chosen.repository;
      const branch = repository.state.HEAD?.name;
      if (!branch) throw new Error("Check out a named branch using VS Code's Git controls before publishing source.");
      const selectedBranch = await vscode.window.showQuickPick([branch], { title: "Choose the checked-out branch to publish" });
      if (!selectedBranch) return undefined;
      const remote = await vscode.window.showQuickPick(repository.state.remotes.map((entry) => entry.name), { title: "Choose the GitHub remote" });
      if (!remote) return undefined;
      for (const document of vscode.workspace.textDocuments) {
        const relative = vscode.workspace.asRelativePath(document.uri, false);
        if (document.isDirty && document.uri.fsPath.startsWith(project.fsPath + "/") && !await document.save()) throw new Error(`Save ${relative} before publishing source.`);
      }
      const plan = await planProjectGitPublish(repository, project.fsPath, remote, selectedBranch);
      const commitMessage = await vscode.window.showInputBox({ title: "Commit message for project source", prompt: `${plan.githubRepository} · ${selectedBranch}`, value: "Update application source" });
      if (!commitMessage?.trim()) return undefined;
      const approval = await vscode.window.showWarningMessage(`Commit and push ${plan.files.length} project files to ${plan.githubRepository} on ${selectedBranch}?`, { modal: true, detail: plan.files.join("\n") }, "Publish source");
      if (approval !== "Publish source") return undefined;
      const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Publishing project source", cancellable: false }, async () => publishProjectWithBuiltinGit(repository, project.fsPath, remote, selectedBranch, commitMessage, plan));
      output.appendLine(`[Projects] Published ${result.repository}@${result.commitSha} on ${result.branch}; server source import is awaiting its supported bridge.`);
      void vscode.window.showInformationMessage(`Published ${result.repository} on ${result.branch} (${result.commitSha.slice(0, 12)}). Server source import is awaiting connection.`);
      return result;
    } catch (error) {
      void vscode.window.showErrorMessage(`${error instanceof Error ? error.message : String(error)} Review Source Control before retrying; no automatic merge or force push is performed.`);
      return undefined;
    }
  });
}
