import * as vscode from "vscode";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getSecret } from "@core/storage/state";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { PROJECT_UUID, normalizeBlueprintBackend, readProjectBlueprintState } from "../services/projectBlueprintSync";
import { readGitProjectIdentity } from "../services/projectGitIdentity";
import { applicationSourceSelection, authorizedGitSourceConnections, DeveloperSourceRevision, fetchAndSelectPushedRevision, SourceHandoffOptions } from "../services/projectSourceRevision";
import { adoptInitialProjectHistory, githubRepositoryName, ProjectGitExtension, planProjectGitPublish, projectGitEnvironment, publishProjectWithBuiltinGit, readProjectGitChanges,
  resolveProjectGitTarget, validRepositorySlug, withinProject } from "../services/projectGitPublish";
import { withProjectGitOperation } from "../services/projectGitOperation";
import { appPairing, assertTrackedGitLineage, resolveAppCheckout, sessionFingerprint } from "../services/projectGitCheckout";

export interface PushedApplicationSource {
  project: vscode.Uri;
  revision: DeveloperSourceRevision;
  options: SourceHandoffOptions;
  branch: string;
  repository: string;
}
type Link = { remote: string; repository: string; bindingId: string; projectId: string; branch: string };
const git = promisify(execFile);
const choose = async <T,>(items: T[], title: string, describe: (item: T) => string) =>
  items.length === 1 ? items[0] :
    (await vscode.window.showQuickPick(items.map(item => ({ label: describe(item), item })), { title }))?.item;

export function registerProjectGitPublishCommand(context: vscode.ExtensionContext, output: vscode.OutputChannel,
    resolveProject: (target?: unknown) => vscode.Uri | undefined, afterSourceSelected?: (pushed: PushedApplicationSource) => Promise<void> | void): vscode.Disposable {
  return vscode.commands.registerCommand("valoride.projects.publishSource", async (target?: unknown, expectedApplicationId?: string) => {
    const generated = resolveProject(target) || (!target && vscode.workspace.workspaceFolders?.length === 1 ? vscode.workspace.workspaceFolders[0].uri : undefined);
    let pushed: { repository: string; branch: string; commitSha: string } | undefined;
    let selected = false;
    try {
      if (!vscode.workspace.isTrusted) throw new Error("Trust the project workspace before publishing source.");
      if (!generated || generated.scheme !== "file") throw new Error("Choose a local generated Application project.");
      const manifest = await readGitProjectIdentity(generated.fsPath);
      const blueprint = await readProjectBlueprintState(generated.fsPath);
      if (!manifest || !PROJECT_UUID.test(manifest.applicationId) || blueprint && blueprint.applicationId !== manifest.applicationId ||
          (expectedApplicationId !== undefined && manifest.applicationId.toLowerCase() !== expectedApplicationId.toLowerCase()))
        throw new Error("Choose the generated Application folder with its matching generation receipt.");
      const applicationId = manifest.applicationId;
      const backend = normalizeBlueprintBackend(getValkyraiBasePath());
      const jwtToken = await getSecret(context, "jwtToken");
      if (!jwtToken || blueprint?.backend && normalizeBlueprintBackend(blueprint.backend) !== backend)
        throw new Error("Reconnect to this Application's original ValkyrAI backend and account.");
      const assertCurrent = async () => {
        if (!vscode.workspace.isTrusted || normalizeBlueprintBackend(getValkyraiBasePath()) !== backend || await getSecret(context, "jwtToken") !== jwtToken)
          throw new Error("Workspace trust, backend or signed-in account changed. Check the original session and retry.");
      };
      const options = { backend, applicationId, jwtToken, assertCurrent };
      const connections = await authorizedGitSourceConnections(options);
      const bindings = connections.bindings.filter(b => validRepositorySlug(b.repository));
      if (!bindings.length || !connections.projects.length)
        throw new Error("Link this Application to its GitHub repository and authorize a developer Project in ValkyrAI before syncing.");
      const ext = vscode.extensions.getExtension<ProjectGitExtension>("vscode.git");
      if (!ext) throw new Error("Enable VS Code's built-in Git extension.");
      if (!ext.isActive) await ext.activate();
      const api = ext.exports.getAPI(1);
      const root = await resolveAppCheckout(generated.fsPath, applicationId, backend,
        (vscode.workspace.workspaceFolders || []).filter(f => f.uri.scheme === "file").map(f => f.uri.fsPath),
        appPairing(context,manifest.applicationName,applicationId,api.git.path,bindings,jwtToken,assertCurrent,manifest.fromLineage));
      if (!root) return undefined;
      const project = root === generated.fsPath ? generated : vscode.Uri.file(root);
      return await withProjectGitOperation(root, async () => {
        const key = `projectGitSync.hosted-v2:${backend}:${sessionFingerprint(jwtToken)}:${applicationId}:${project.toString()}`;
        const previous = context.workspaceState.get<Link>(key);
        // Downloads often live inside an unrelated workspace repository. Never adopt its index/history.
        const exact = (r: {rootUri: vscode.Uri}) => path.resolve(r.rootUri.fsPath) === path.resolve(project.fsPath);
        const hasGit = await fs.lstat(path.join(project.fsPath, ".git")).then(() => true, (e: NodeJS.ErrnoException) => {
          if (e.code === "ENOENT") return false;
          throw e;
        });
        let repo = api.repositories.find(exact) || (hasGit ? await api.openRepository(project) : null);
        if (hasGit && !repo || repo && !exact(repo)) throw new Error("Open this Application's own Git checkout in VS Code, not its enclosing repository.");
        await repo?.status();
        const remotes = repo?.state.remotes || [];
        if (manifest.fromLineage) {
          if (!repo?.state.HEAD?.commit || !remotes.length) throw new Error("A cloned app needs an existing committed checkout with its Application-bound GitHub remote. No repository was initialized.");
          await assertTrackedGitLineage(api.git.path, root, generated.fsPath, applicationId);
        }
        const targets = remotes.length ? resolveProjectGitTarget(remotes, bindings) : bindings.map(b => ({ ...b, remote: "origin" }));
        if (!targets.length) throw new Error("This checkout's GitHub remote does not match any authorized repository binding for this Application. No source was pushed.");
        const destination = targets.find(b => b.bindingId === previous?.bindingId && b.remote === previous.remote) ||
          await choose(targets, "Select the Application's connected GitHub repository", b => `${b.repository} (${b.remote})`);
        if (!destination) return undefined;
        const scope = connections.projects.find(p => p.projectId === previous?.projectId) ||
          await choose(connections.projects, "Select the developer Project for pushed revisions", p => p.name || p.projectId);
        if (!scope) return undefined;
        const remote = destination.remote;
        const branch = repo ? repo.state.HEAD?.name : "main";
        if (!branch) throw new Error("Check out a named branch before syncing.");
        const link: Link = { remote, repository: destination.repository, bindingId: destination.bindingId, projectId: scope.projectId, branch };
        if (!repo || !remotes.length || !previous || (Object.keys(link) as Array<keyof Link>).some(k => previous[k] !== link[k])) {
          const approval = await vscode.window.showWarningMessage(
            `Enable one-click sync of ${manifest.applicationName} to ${destination.repository} (${branch})?`,
            { modal: true, detail: `${project.fsPath}\nFor this session, each click saves app editors, commits eligible staged, unstaged and new files, and pushes the branch including its local history. A new checkout can fast-forward to an existing branch only without overwriting local files. Sync selects the pushed revision and requests a refresh of running Valkyr-hosted instances. Hosted builds/deployments may consume credits. Ordinary saves do not publish. No automatic conflict resolution or force push.` },
            "Enable and sync");
          if (approval !== "Enable and sync") return undefined;
        }
        await assertCurrent();
        if (!repo) repo = await api.init(project, { defaultBranch: branch });
        if (!repo || !exact(repo)) throw new Error("Could not open a dedicated repository in the generated Application folder.");
        const repository = repo;
        if (!remotes.length) await repository.addRemote(remote, `https://github.com/${destination.repository}.git`);
        await repository.status();
        const assertDestination = async () => {
          await assertCurrent();
          // Git allows multiple pushurl values. SCM's single displayed URL must not hide a second destination.
          const urlLists = await Promise.all([[], ["--push"]].map(mode =>
            git(api.git.path, ["remote", "get-url", ...mode, "--all", remote], { cwd: project.fsPath, env: projectGitEnvironment(), timeout: 10000 })));
          if (!urlLists.every(({stdout}) => githubRepositoryName(stdout.trimEnd())?.toLowerCase() === destination.repository.toLowerCase()))
            throw new Error("The fetch/push destination changed or has multiple URLs. Verify the Application repository in Source Control.");
        };
        await assertDestination();
        const editors = vscode.workspace.textDocuments.filter(d => d.isDirty && d.uri.scheme === "file" && withinProject(project.fsPath, d.uri.fsPath));
        for (const editor of editors) if (!await editor.save()) throw new Error("Save the Application's modified editor buffers before syncing.");
        if (manifest.fromLineage && editors.length) await assertTrackedGitLineage(api.git.path,root,generated.fsPath,applicationId);
        if (!repository.state.HEAD?.commit) {
          const heads = await repository.getRemoteRefs(remote, {heads:true});
          if (heads.length) {
            try {
              await adoptInitialProjectHistory(api.git.path, repository, remote, branch, heads.find(ref => ref.name === branch)?.commit || "", assertDestination);
            } catch {
              throw new Error("The GitHub repository already has history that could not be safely adopted. Clone its branch into a separate directory using the same project folder name, reconcile the generated files (including ValorIDE markers, excluding .git), and open that checkout to sync. No force push was made.");
            }
          }
        }
        await context.workspaceState.update(key, link);
        const read = () => readProjectGitChanges(api.git.path, project.fsPath, branch);
        const plan = await planProjectGitPublish(repository, project.fsPath, remote, branch, read);
        return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Syncing app with GitHub", cancellable: false }, async progress => {
          progress.report({ message: `Pushing and verifying ${branch}…` });
          const result = await publishProjectWithBuiltinGit(repository, project.fsPath, remote, branch, "Update application source", plan, read, assertDestination, api.git.path);
          pushed = result;
          output.appendLine(`[Projects] Verified ${result.repository}@${result.commitSha} on ${branch}.`);
          progress.report({ message: `GitHub verified. Selecting source at ${result.commitSha.slice(0, 12)}…` });
          const current = await applicationSourceSelection(options);
          const existing = current.sourceRevision;
          const last = context.workspaceState.get<{bindingId:string; revisionRef:string}>(key + ":wholeTree");
          const revision = last?.bindingId === link.bindingId && last.revisionRef === existing?.revisionRef &&
            existing?.commitSha === result.commitSha && existing.applicationId === applicationId && existing.projectId === scope.projectId &&
            existing.revisionRef === current.artifactRef ? existing :
            await fetchAndSelectPushedRevision({ ...options, bindingId: link.bindingId, projectId: scope.projectId, commitSha: result.commitSha, sourceDirectory: "" });
          selected = true;
          await context.workspaceState.update(key + ":wholeTree", {bindingId:link.bindingId, revisionRef:revision.revisionRef});
          await assertCurrent();
          if (afterSourceSelected) {
            progress.report({ message: "Source selected. Checking running Valkyr-hosted instances…" });
            await afterSourceSelected({ project, options, revision, branch, repository: result.repository });
          }
          void vscode.window.showInformationMessage(`Synced ${result.repository} (${branch}) at ${result.commitSha.slice(0, 12)} and selected it for generation.`);
          return { ...result, serverSnapshotRequested: true, sourceRevision: revision };
        });
      });
    } catch (e) {
      const step = pushed ? `GitHub already has ${pushed.commitSha.slice(0, 12)}. ${selected ? "Source selected; hosted refresh incomplete." : "Source handoff incomplete."} ` : "";
      const message = (e instanceof Error ? e.message : String(e)).replace(/https?:\/\/\S+@/g, "[credential redacted]@");
      void vscode.window.showErrorMessage(`${step}${message} Review Source Control before retrying; local commits are preserved.`);
      return undefined;
    }
  });
}
