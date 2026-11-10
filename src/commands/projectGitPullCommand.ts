import path from "path";
import * as vscode from "vscode";
import { getSecret } from "@core/storage/state";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { readGitProjectIdentity } from "../services/projectGitIdentity";
import { normalizeBlueprintBackend, readProjectBlueprintState } from "../services/projectBlueprintSync";
import { authorizedGitSourceConnections } from "../services/projectSourceRevision";
import { withProjectGitOperation } from "../services/projectGitOperation";
import { appGitRunner, pullBoundProject } from "../services/projectGitPull";
import type { ProjectGitExtension } from "../services/projectGitPublish";
import { appPairing, assertTrackedGitLineage, resolveAppCheckout } from "../services/projectGitCheckout";

export function registerProjectGitPullCommand(context: vscode.ExtensionContext, resolveProject: (target?: unknown) => vscode.Uri | undefined) {
  return vscode.commands.registerCommand("valoride.projects.pullSource", async (target?: unknown, expectedApplicationId?: string) => {
    try {
      const project = resolveProject(target) ?? (!target && vscode.workspace.workspaceFolders?.length === 1 ? vscode.workspace.workspaceFolders[0].uri : undefined);
      if (!project || project.scheme !== "file" || !vscode.workspace.isTrusted) throw new Error("Select a downloaded app in a trusted workspace to pull from GitHub.");
      const manifest = await readGitProjectIdentity(project.fsPath);
      const state = await readProjectBlueprintState(project.fsPath);
      const backend = getValkyraiBasePath();
      if (!manifest || (expectedApplicationId !== undefined && manifest.applicationId.toLowerCase() !== expectedApplicationId.toLowerCase()) ||
          (state && (state.applicationId !== manifest.applicationId ||
          (state.backend && normalizeBlueprintBackend(state.backend) !== normalizeBlueprintBackend(backend)))))
        throw new Error("Open the generated app with its original ValkyrAI backend before pulling.");
      const jwtToken = await getSecret(context, "jwtToken");
      if (!jwtToken) throw new Error("Sign in to ValorIDE before pulling your Application’s linked GitHub source.");
      const assertSession = async () => {
        if (!vscode.workspace.isTrusted || backend !== getValkyraiBasePath() || jwtToken !== await getSecret(context, "jwtToken"))
          throw new Error("Your workspace trust, account or backend changed during pull.");
      };
      const connections = await authorizedGitSourceConnections({ applicationId: manifest.applicationId, backend, jwtToken, assertCurrent: assertSession });
      const extension = vscode.extensions.getExtension<ProjectGitExtension>("vscode.git");
      if (!extension) throw new Error("Enable the built-in Git extension before pulling.");
      if (!extension.isActive) await extension.activate();
      const api = extension.exports.getAPI(1);
      const root = await resolveAppCheckout(project.fsPath, manifest.applicationId, backend,
        (vscode.workspace.workspaceFolders ?? []).filter(f => f.uri.scheme === "file").map(f => f.uri.fsPath),
        appPairing(context,manifest.applicationName,manifest.applicationId,api.git.path,connections.bindings,jwtToken,assertSession,manifest.fromLineage));
      if (!root) return undefined;
      return await withProjectGitOperation(root, async () => {
        const assertCurrent = async () => {
          await assertSession();
          if (vscode.workspace.textDocuments.some(doc => {
            const rel = path.relative(root, doc.uri.fsPath);
            return doc.isDirty && doc.uri.scheme === "file" && !path.isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + path.sep);
          })) throw new Error("Save or set aside unsaved app files before pulling.");
        };
        const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Pulling app from GitHub" }, async () => {
          if (manifest.fromLineage) await assertTrackedGitLineage(api.git.path,root,project.fsPath,manifest.applicationId);
          const repo = api.repositories.find(r => path.resolve(r.rootUri.fsPath) === path.resolve(root))
            ?? await api.openRepository(vscode.Uri.file(root));
          if (!repo || path.resolve(repo.rootUri.fsPath) !== path.resolve(root))
            throw new Error("Set up the generated app’s linked checkout using Commit & Push before pulling.");
          // Use VS Code's configured Git executable and its credential integration for private repositories.
          return pullBoundProject(root, connections.bindings, assertCurrent, appGitRunner(api.git.path),
            async (url, ref) => {
              try { await repo.fetch({remote:url, ref}); } catch { throw new Error("Could not fetch the linked GitHub branch. Check its name and your VS Code Git credentials."); }
            });
        });
        void vscode.window.showInformationMessage(`${result.changed ? "Updated" : "Already up to date:"} ${result.branch} at ${result.commit.slice(0, 12)}.`);
        return result;
      });
    } catch (error) {
      void vscode.window.showErrorMessage(error instanceof Error ? error.message : "Unable to pull the downloaded app.");
      return undefined;
    }
  });
}
