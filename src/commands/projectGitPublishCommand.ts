import * as vscode from "vscode";
import path from "path";
import { getSecret } from "@core/storage/state";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { readProjectBlueprintState } from "../services/projectBlueprintSync";
import { readGenerationManifest } from "../services/generatedProjectInstall";
import { authorizedGitSourceConnections, fetchAndSelectPushedRevision } from "../services/projectSourceRevision";
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
      output.appendLine(`[Projects] Published ${result.repository}@${result.commitSha} on ${result.branch}.`);
      const action = await vscode.window.showInformationMessage(`Published ${result.repository} on ${result.branch} (${result.commitSha.slice(0, 12)}).`, "Select pushed source for generation");
      if (action === "Select pushed source for generation") {
        const state = await readProjectBlueprintState(project.fsPath);
        const manifest = await readGenerationManifest(project.fsPath);
        const applicationId = state?.applicationId || manifest?.applicationId;
        const jwtToken = await getSecret(context, "jwtToken");
        if (!applicationId || !jwtToken) throw new Error(`Pushed ${result.commitSha}. Open the canonical Application project and sign in before selecting this existing commit for generation.`);
        const backend = getValkyraiBasePath();
        const assertCurrent = async () => {
          if (getValkyraiBasePath() !== backend || await getSecret(context, "jwtToken") !== jwtToken) throw new Error("The backend or session changed. Return to the original Application account and retry its pushed source handoff.");
        };
        const options = { backend, applicationId, jwtToken, assertCurrent };
        const connections = await authorizedGitSourceConnections(options);
        const bindings = connections.bindings.filter(binding => binding.repository.toLowerCase() === result.repository.toLowerCase());
        if (!bindings.length || !connections.projects.length) throw new Error(`Pushed ${result.commitSha}. Link this Application to its existing GitHub repository and an authorized Project before fetching source.`);
        const binding = bindings.length === 1 ? bindings[0] : await vscode.window.showQuickPick(bindings.map(binding => ({ label: binding.repository, description: binding.bindingId, binding })), { title: "Choose the existing Application GitHub binding" }).then(item => item?.binding);
        const scope = connections.projects.length === 1 ? connections.projects[0] : await vscode.window.showQuickPick(connections.projects.map(project => ({ label: project.name || project.projectId, description: project.projectId, project })), { title: "Choose the authorized developer Project" }).then(item => item?.project);
        if (!binding || !scope) return result;
        const sourceDirectory = path.relative(repository.rootUri.fsPath, project.fsPath).split(path.sep).join("/");
        const revision = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Fetching the pushed immutable source revision", cancellable: false }, () => fetchAndSelectPushedRevision({ ...options, bindingId: binding.bindingId, projectId: scope.projectId, commitSha: result.commitSha, sourceDirectory }));
        output.appendLine(`[Projects] Selected source ${revision.revisionRef} at ${revision.commitSha} for Application ${applicationId}.`);
        void vscode.window.showInformationMessage(`Selected pushed source ${result.commitSha.slice(0, 12)}. The next generation will use this immutable revision.`);
        return { ...result, serverSnapshotRequested: true, sourceRevision: revision };
      }
      return result;
    } catch (error) {
      void vscode.window.showErrorMessage(`${error instanceof Error ? error.message : String(error)} Review Source Control before retrying; no automatic merge or force push is performed.`);
      return undefined;
    }
  });
}
