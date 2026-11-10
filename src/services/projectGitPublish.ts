import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import type * as vscode from "vscode";

type Change = { uri: { fsPath: string } };
interface Changes {
  indexChanges: Change[];
  workingTreeChanges: Change[];
  untrackedChanges?: Change[];
  mergeChanges: Change[];
}
type Remote = { name: string; pushUrl?: string; fetchUrl?: string };
export interface ProjectGitRepository {
  rootUri: vscode.Uri;
  state: Changes & { HEAD?: { name?: string; commit?: string }; remotes: Remote[] };
  status(): Promise<void>;
  add(paths: string[]): Promise<void>;
  commit(message: string, options: {all: false}): Promise<void>;
  push(remote: string, refspec: string): Promise<void>;
  addRemote(name: string, url: string): Promise<void>;
  getRemoteRefs(remote: string, options: { heads: boolean }): Promise<Array<{name?: string; commit?: string}>>;
  fetch(options: {remote: string; ref: string}): Promise<void>;
}
export interface ProjectGitApi {
  git: { path: string };
  repositories: ProjectGitRepository[];
  openRepository(uri: vscode.Uri): Promise<ProjectGitRepository | null>;
  init(uri: vscode.Uri, options: { defaultBranch: string }): Promise<ProjectGitRepository | null>;
}
export interface ProjectGitExtension { getAPI(version: 1): ProjectGitApi }

const slug = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;
export function validRepositorySlug(name: string): boolean {
  return slug.test(name) && !name.split("/").some(s => s === "." || s === "..");
}
export function githubRepositoryName(remote: string): string | undefined {
  const match = remote.match(/^(?:git@github\.com:|ssh:\/\/git@github\.com\/|https:\/\/github\.com\/)([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?\/?$/i);
  return match && validRepositorySlug(match[1]) ? match[1] : undefined;
}
export function resolveProjectGitTarget(remotes: Remote[], bindings: Array<{bindingId: string; repository: string}>) {
  return remotes.flatMap(remote => {
    if (!/^[a-z0-9_][a-z0-9._/-]*$/i.test(remote.name)) return [];
    const push = githubRepositoryName(remote.pushUrl || remote.fetchUrl || "");
    if (!push || remote.fetchUrl && githubRepositoryName(remote.fetchUrl)?.toLowerCase() !== push.toLowerCase()) return [];
    return bindings.filter(b => b.repository.toLowerCase() === push.toLowerCase()).map(b => ({
      remote: remote.name, bindingId: b.bindingId, repository: b.repository,
    }));
  });
}

export const withinProject = (root: string, file: string) => {
  const relative = path.relative(root, file);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const privateParts = new Set([".aws", ".ssh", ".gnupg", ".kube", ".npmrc", ".netrc", ".git-credentials", ".pypirc", ".valoride", "export-reference"]);
const excluded = new Set([".git", ".svn", ".hg", ".ds_store", "node_modules", "target", "dist", "build", ".next", "coverage", "logs"]);
export const privateProjectGitPath = (relative: string) => relative.toLowerCase().split(/[\\/]/).some((part) =>
  privateParts.has(part) || /^\.env(?:\.|$)/.test(part) || /\.(?:pem|key|p12|pfx|jks|keystore)$/.test(part) ||
  /^\.valoride-(?:generation|blueprint|source-origin|source-publication|source-selection)\.json(?:$|\.)/.test(part) ||
  /^id_(?:rsa|dsa|ecdsa|ed25519)$/.test(part)
) || /(?:^|\/)artifacts\/generated-[^/]*\.zip$/i.test(relative);
export const publishable = (relative: string) => !relative.toLowerCase().split(/[\\/]/).some((part) =>
  excluded.has(part),
) && !privateProjectGitPath(relative);

const git = promisify(execFile);
export const projectGitEnvironment = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/.test(key)));
/** SCM views can hide untracked files and truncate large generated projects. Ask Git for all paths,
 * without taking the index lock; VS Code's Git API still owns commits, push and authentication. */
export async function readProjectGitChanges(gitPath: string, root: string, branch?: string): Promise<Changes> {
  const env = projectGitEnvironment();
  if (branch) {
    const current = await git(gitPath, ["symbolic-ref", "--quiet", "--short", "HEAD"], { cwd: root, env, timeout: 10000 }).catch(() => undefined);
    if (current?.stdout.trimEnd() !== branch) throw new Error("Check out the connected named branch before syncing.");
  }
  const { stdout: gitDir } = await git(gitPath, ["rev-parse", "--absolute-git-dir"], { cwd: root, env, timeout: 10000 });
  await Promise.all(["rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "sequencer", "BISECT_LOG"].map(async name => {
    const pending = await fs.lstat(path.join(gitDir.trimEnd(), name)).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
      return undefined;
    });
    if (pending) throw new Error("Finish the current merge, rebase, bisect, cherry-pick or revert in Source Control before syncing.");
  }));
  const { stdout } = await git(gitPath, ["--no-optional-locks", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all", "--ignore-submodules=none"], {
    cwd: root, env, maxBuffer: 32 * 1024 * 1024, timeout: 30000,
  });
  const result: Changes = { indexChanges: [], mergeChanges: [], workingTreeChanges: [] };
  // Check the entire index, not just newly changed files. An existing checkout
  // can already track an excluded receipt, credential, symlink or submodule.
  const index = await git(gitPath, ["ls-files", "--stage", "-z"], {cwd:root,env,maxBuffer:32*1024*1024,timeout:30000});
  for (const entry of index.stdout.split("\0").filter(Boolean)) {
    const file = entry.slice(entry.indexOf("\t") + 1);
    if (/^(120000|160000) /.test(entry) || privateProjectGitPath(file))
      throw new Error(`The index contains a private or unsupported path (${file}). Resolve it in Source Control before syncing to GitHub.`);
  }
  for (const line of stdout.split("\0").filter(Boolean)) {
    const status = line.slice(0, 2);
    const name = line.slice(3);
    if (line[2] !== " " || !name || name.endsWith("/") || path.isAbsolute(name) || !withinProject(root, path.resolve(root, name)))
      throw new Error("Git returned an unsupported nested repository or path. Review Source Control before publishing.");
    const change = { uri: { fsPath: path.join(root, name) } };
    if (status.includes("U") || status === "AA" || status === "DD") result.mergeChanges.push(change);
    else {
      if (status[0] !== " " && status !== "??") result.indexChanges.push(change);
      if (status[1] !== " ") result.workingTreeChanges.push(change);
    }
  }
  return result;
}

type ReadChanges = () => Promise<Changes>;
type Plan = { files: string[]; toStage: string[]; githubRepository: string; head?: string };
const sorted = (paths: string[]) => [...new Set(paths)].sort();
const eq = (a: string[], b: string[]) => a.length === b.length && a.every((s, i) => s === b[i]);
const sha = (value: string | undefined): value is string => !!value && /^[a-f0-9]{40}$/.test(value);

/** Seed only an unborn, empty-index checkout. Never reset or replace an existing local path
 * (even an ignored file or a link nested under a directory the remote wants to create). */
export async function adoptInitialProjectHistory(gitPath: string, repository: ProjectGitRepository, remote: string, branch: string,
    commit: string, assertDestination: () => Promise<void>) {
  if (!sha(commit)) throw new Error("GitHub did not provide a pinned commit for the local branch.");
  const root = repository.rootUri.fsPath;
  const opts = {cwd:root, env:projectGitEnvironment(), timeout:30000, maxBuffer:32*1024*1024};
  async function assertUnborn() {
    await assertDestination();
    const head = await git(gitPath, ["rev-parse", "--verify", "--quiet", "HEAD"], opts)
      .then(() => true, (e: {code?: number}) => { if (e.code !== 1) throw e; return false; });
    const changes = await readProjectGitChanges(gitPath, root, branch);
    if (head || changes.indexChanges.length || changes.mergeChanges.length || (await git(gitPath, ["ls-files", "-z"], opts)).stdout)
      throw new Error("A newly connected repository needs an unborn branch and an empty index to adopt remote history.");
  }
  await assertUnborn();
  await repository.fetch({remote, ref:commit});
  // Inspect the actual fetched object before putting any of its files in the working tree.
  if ((await git(gitPath, ["rev-parse", "--verify", `${commit}^{commit}`], opts)).stdout.trimEnd() !== commit)
    throw new Error("Git fetch did not return the selected immutable branch commit.");
  const listing = (await git(gitPath, ["ls-tree", "-rz", "--full-tree", commit], opts)).stdout.split("\0").filter(Boolean);
  if (listing.length > 25000) throw new Error("The existing GitHub tree is too large to adopt safely in the generated folder.");
  const directories = new Set<string>();
  for (const entry of listing) {
    const relative = entry.slice(entry.indexOf("\t")+1);
    const parts = relative.split("/");
    if (!/^100(?:644|755) blob [0-9a-f]{40}\t/.test(entry) || /[\\:]/.test(relative) || Array.from(relative).some(c => c.charCodeAt(0) < 32) ||
        parts.some(p => !p || p === "." || p === "..") || !publishable(relative))
      throw new Error("Remote history includes private, generated-output or unsupported paths. Review it in a separate checkout.");
    let file = root;
    for (let i = 0; i < parts.length; i++) {
      file = path.join(file, parts[i]);
      const leaf = i === parts.length - 1;
      if (!leaf && directories.has(file)) continue;
      const stat = await fs.lstat(file).catch((e: NodeJS.ErrnoException) => { if (e.code !== "ENOENT") throw e; return undefined; });
      if (stat && (leaf || !stat.isDirectory())) throw new Error(`A local path collides with a file in the existing GitHub history: ${relative}.`);
      if (!leaf) directories.add(file);
    }
  }
  await assertUnborn();
  await git(gitPath, ["-c", "submodule.recurse=false", "merge", "--ff-only", "--no-autostash", "--no-overwrite-ignore", commit], opts);
  await repository.status();
  if (repository.state.HEAD?.commit !== commit || repository.state.HEAD?.name !== branch)
    throw new Error("Review the app checkout; its HEAD changed during initial GitHub connection.");
}

export async function planProjectGitPublish(repository: ProjectGitRepository, project: string, remoteName: string, branch: string, read?: ReadChanges): Promise<Plan> {
  await repository.status();
  if (!withinProject(repository.rootUri.fsPath, project)) throw new Error("Choose the Git repository containing this project.");
  if (!branch || repository.state.HEAD?.name !== branch) throw new Error("Select the currently checked-out named project branch.");
  const remote = repository.state.remotes.find((entry) => entry.name === remoteName);
  const githubRepository = remote && githubRepositoryName(remote.pushUrl || remote.fetchUrl || "");
  if (!githubRepository || remote?.fetchUrl && githubRepositoryName(remote.fetchUrl)?.toLowerCase() !== githubRepository.toLowerCase())
    throw new Error("Choose an existing GitHub fetch/push remote without embedded credentials, pointing to the same repository.");
  const changes = read ? await read() : repository.state;
  if (changes.mergeChanges.length) throw new Error("Resolve repository conflicts before publishing source. No automatic merge is performed.");
  const allowed = (p: string) => withinProject(project, p) && publishable(path.relative(project, p).split(path.sep).join("/"));
  const staged = changes.indexChanges.map(c => c.uri.fsPath);
  if (!staged.every(allowed)) throw new Error("Unstage unrelated or excluded files before publishing. The current index was preserved.");
  const toStage = sorted([...changes.workingTreeChanges, ...(changes.untrackedChanges || [])].map(c => c.uri.fsPath).filter(allowed));
  if (!toStage.length && !staged.length && !sha(repository.state.HEAD?.commit))
    throw new Error("No publishable project files or existing commit were found.");
  return { files: sorted([...toStage, ...staged]), toStage, githubRepository, head: repository.state.HEAD?.commit };
}

/** Git's regular add API treats paths as patterns. Dynamic routes such as app/[id]/page.tsx
 * are ordinary source files: pass only validated literal names, without a shell or directory-wide add. */
export async function stageProjectGitPaths(gitPath: string, checkout: string, project: string, files: readonly string[]) {
  if (!withinProject(checkout, project)) throw new Error("The project is outside the selected Git checkout.");
  const names = files.map(file => {
    const relative = path.relative(checkout, file).split(path.sep).join("/");
    if (!relative || !path.isAbsolute(file) || !withinProject(project,file) || path.resolve(project) === path.resolve(file) ||
        !publishable(relative) || relative.includes("\0")) throw new Error("Refusing to stage a path outside the allowed Application source.");
    return relative;
  });
  const env = projectGitEnvironment();
  for (const key of ["GIT_ICASE_PATHSPECS", "GIT_LITERAL_PATHSPECS", "GIT_GLOB_PATHSPECS", "GIT_NOGLOB_PATHSPECS"]) delete env[key];
  const batch: string[] = [];
  let bytes = 0;
  const flush = async () => {
    if (!batch.length) return;
    await Promise.all(batch.map(async name => {
      const info = await fs.lstat(path.join(checkout,name)).catch((e: NodeJS.ErrnoException) => {
        if (e.code !== "ENOENT" && e.code !== "ENOTDIR") throw e;
        return undefined; // a tracked deletion
      });
      if (info && !info.isFile()) throw new Error("The reviewed source changed to a directory, link or unsupported path. Review Source Control before staging.");
    }));
    await git(gitPath, ["--literal-pathspecs", "add", "-A", "--", ...batch], {cwd:checkout,env,timeout:60_000});
    batch.length = 0; bytes = 0;
  };
  for (const name of names) {
    const length = Buffer.byteLength(name) + 3;
    if (length > 12_000) throw new Error("A project filename exceeds the supported Git argument limit.");
    if (bytes + length > 12_000 || batch.length >= 256) await flush();
    batch.push(name); bytes += length;
  }
  await flush();
}

export async function publishProjectWithBuiltinGit(repository: ProjectGitRepository, project: string, remote: string, branch: string,
    commitMessage: string, approvedPlan: Plan, read?: ReadChanges, assertCurrent?: () => Promise<void>, gitPath?: string) {
  if (!commitMessage.trim()) throw new Error("Enter a commit message before publishing source.");
  const current = await planProjectGitPublish(repository, project, remote, branch, read);
  if (current.head !== approvedPlan.head || current.githubRepository !== approvedPlan.githubRepository ||
      !eq(current.files, approvedPlan.files) || !eq(current.toStage, approvedPlan.toStage))
    throw new Error("The repository changed after review. Retry to use the current files and branch.");
  await assertCurrent?.();
  if (current.toStage.length) {
    if (gitPath) await stageProjectGitPaths(gitPath,repository.rootUri.fsPath,project,current.toStage);
    else {
      if (current.toStage.some(f => [":", "*", "?", "[", "\\"].some(c => path.relative(repository.rootUri.fsPath,f).includes(c))))
        throw new Error("Literal filename staging requires the configured Git executable.");
      await repository.add(current.toStage);
    }
  }
  if (current.files.length) {
    await repository.status();
    const changes = read ? await read() : repository.state;
    if (repository.state.HEAD?.commit !== current.head || repository.state.HEAD?.name !== branch || changes.mergeChanges.length ||
        !eq(sorted(changes.indexChanges.map(c => c.uri.fsPath)), current.files))
      throw new Error("The branch or staged files changed before commit. Review Source Control; no commit or push was made.");
    await repository.commit(commitMessage.trim(), {all: false});
    await repository.status();
  }
  const commitSha = repository.state.HEAD?.commit;
  const destination = repository.state.remotes.find(r => r.name === remote);
  if (repository.state.HEAD?.name !== branch || !sha(commitSha) ||
      githubRepositoryName(destination?.pushUrl || destination?.fetchUrl || "") !== current.githubRepository)
    throw new Error("The branch or remote changed or the commit is unavailable. Review Source Control before pushing.");
  await assertCurrent?.();
  // Pin the actual object sent, even if the branch moves while credentials are being requested.
  await repository.push(remote, `${commitSha}:refs/heads/${branch}`);
  await assertCurrent?.();
  const refs = await repository.getRemoteRefs(remote, { heads: true });
  if (!refs.some(ref => ref.name === branch && ref.commit === commitSha))
    throw new Error("GitHub branch does not report the exact pushed commit. No source selection or hosted refresh was requested.");
  return { repository: current.githubRepository, branch, commitSha, serverSnapshotRequested: false as const };
}
