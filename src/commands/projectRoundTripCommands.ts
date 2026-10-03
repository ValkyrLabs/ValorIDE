import * as vscode from "vscode";
import { randomBytes } from "crypto";
import { getSecret } from "../core/storage/state";
import { getValkyraiBasePath } from "../utils/serverValkyraiHost";
import { resolveThorapiFolderPath } from "../utils/thorapi";
import { importLocalProjectPackage } from "../services/localProjectImport";
import { ProjectBlueprintConflict, readProjectBlueprintState, specificationHash, synchronizeProjectBlueprint } from "../services/projectBlueprintSync";
import { ValkyrLabsApiError } from "../services/valkyrai/ValkyrLabsRtkApi";
import { assertNoProjectLinks } from "../services/generatedProjectInstall";

const message = (error: unknown) => {
  if (error instanceof ValkyrLabsApiError && error.status === 401) return "Sign in to ValorIDE again, then retry Blueprint synchronization.";
  if (error instanceof ValkyrLabsApiError && [403, 404].includes(Number(error.status))) return "This Application is unavailable to the signed-in account. Check the account and ValkyrAI backend before retrying.";
  return error instanceof Error ? error.message : String(error);
};

export function registerProjectRoundTripCommands(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  resolveProject: (target?: unknown) => vscode.Uri | undefined,
  refresh: () => void,
): vscode.Disposable[] {
  const reviews = new Map<string, string>();
  const provider = vscode.workspace.registerTextDocumentContentProvider("valoride-blueprint-review", {
    provideTextDocumentContent: (uri) => reviews.get(uri.toString()) || "",
  });
  const importCommand = vscode.commands.registerCommand("valoride.projects.import", async (archive?: vscode.Uri, parent?: vscode.Uri) => {
    try {
      if (!vscode.workspace.isTrusted) throw new Error("Trust this workspace before importing project source and editor configuration.");
      archive ||= (await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, filters: { "Project export": ["zip"] }, title: "Import a complete ValkyrAI project package", openLabel: "Import project" }))?.[0];
      if (!archive) return undefined;
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      parent ||= (await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false,
        defaultUri: workspaceRoot ? vscode.Uri.file(resolveThorapiFolderPath(workspaceRoot)) : undefined,
        title: "Choose the parent folder for the imported project", openLabel: "Use folder" }))?.[0];
      if (!parent) return undefined;
      const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Importing project", cancellable: true }, async (progress, token) => {
        const assertCurrent = () => {
          if (token.isCancellationRequested) throw new vscode.CancellationError();
          if (!vscode.workspace.isTrusted || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath !== workspaceRoot)
            throw new Error("The workspace changed during import. Reopen the original workspace and retry; local edits are preserved.");
        };
        return importLocalProjectPackage({ archivePath: archive!.fsPath, parent: parent!.fsPath, workspaceRoot, assertCurrent,
          onProgress: (status) => progress.report({ message: status }) });
      });
      refresh();
      output.appendLine(`[Projects] Imported ${result.extractedPath}; preserved ${result.preservedFiles.length} existing or edited files.`);
      for (const warning of result.configurationWarnings) output.appendLine(`[Projects] ${warning}`);
      void vscode.window.showInformationMessage(`Imported ${result.extractedPath}${result.preservedFiles.length ? `; preserved ${result.preservedFiles.length} local files` : ""}.`, "Open project").then((action) => {
        if (action === "Open project") return vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(result.extractedPath), true);
        return undefined;
      });
      return result;
    } catch (error) {
      if (!(error instanceof vscode.CancellationError)) {
        output.appendLine(`[Projects] Import stopped: ${message(error)}`);
        void vscode.window.showErrorMessage(message(error));
      }
      return undefined;
    }
  });
  const syncCommand = vscode.commands.registerCommand("valoride.projects.syncBlueprint", async (target?: unknown) => {
    try {
      if (!vscode.workspace.isTrusted) throw new Error("Trust this workspace before synchronizing its editable Blueprint.");
      const project = resolveProject(target) || vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!project) throw new Error("Open or select an imported project before synchronizing its Blueprint.");
      const backend = getValkyraiBasePath();
      const jwtToken = await getSecret(context, "jwtToken");
      if (!jwtToken) throw new Error("Sign in to ValorIDE before synchronizing the canonical Blueprint.");
      const assertSession = async () => {
        if (!vscode.workspace.isTrusted || getValkyraiBasePath() !== backend || await getSecret(context, "jwtToken") !== jwtToken)
          throw new Error("The account or ValkyrAI backend changed. Return to the original session and retry Blueprint synchronization.");
      };
      let reviewedBase: { etag: string; specificationHash: string } | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Synchronizing project Blueprint", cancellable: true }, async (_progress, token) => {
            const assertCurrent = async () => {
              if (token.isCancellationRequested) throw new vscode.CancellationError();
              await assertSession();
            };
            await assertCurrent();
            const state = await readProjectBlueprintState(project.fsPath);
            if (state) {
              await assertNoProjectLinks(project.fsPath, state.specificationPath);
              const file = vscode.Uri.joinPath(project, state.specificationPath);
              const document = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === file.fsPath && doc.isDirty);
              if (document && !await document.save()) throw new Error("Save the local specification before synchronizing its Blueprint.");
            }
            return synchronizeProjectBlueprint({ root: project.fsPath, backend, jwtToken, reviewedBase, assertCurrent });
          });
          output.appendLine(`[Projects] Blueprint ${result.status}: ${result.document.specId}.`);
          void vscode.window.showInformationMessage(`Canonical Blueprint ${result.status}.${result.localEditsRemain ? " Further local edits remain; save and synchronize again." : ""}`);
          return result;
        } catch (error) {
          if (!(error instanceof ProjectBlueprintConflict) || attempt > 0) throw error;
          const action = await vscode.window.showWarningMessage(error.message, "Review changes");
          if (action !== "Review changes") return undefined;
          await assertSession();
          const state = await readProjectBlueprintState(project.fsPath);
          if (!state) throw new Error("The project Blueprint binding disappeared. Import the package again.");
          const review = vscode.Uri.parse(`valoride-blueprint-review:/${randomBytes(8).toString("hex")}/canonical.json`);
          reviews.set(review.toString(), JSON.stringify(error.canonical.specification, null, 2) + "\n");
          while (reviews.size > 20) reviews.delete(reviews.keys().next().value!);
          await vscode.commands.executeCommand("vscode.diff", review, vscode.Uri.joinPath(project, state.specificationPath), "Canonical Blueprint ↔ Local edits");
          const publish = await vscode.window.showInformationMessage("Review and merge the canonical changes in your local specification, then publish the reviewed local document.", "Publish reviewed changes");
          if (publish !== "Publish reviewed changes") return undefined;
          reviewedBase = { etag: error.canonical.etag, specificationHash: specificationHash(error.canonical.specification) };
        }
      }
      return undefined;
    } catch (error) {
      if (error instanceof vscode.CancellationError) await vscode.window.showWarningMessage("Blueprint synchronization stopped. A request already sent may have completed; retry checks the saved revision before writing again.");
      else await vscode.window.showErrorMessage(message(error));
      return undefined;
    }
  });
  return [provider, importCommand, syncCommand, { dispose: () => reviews.clear() }];
}
