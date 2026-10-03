import path from "path";
import type * as vscode from "vscode";

// The built-in vscode.git API owns staging, commit, push and local credential handling.
export interface ProjectGitRepository {
  rootUri: vscode.Uri;
  state: {
    HEAD?: { name?: string; commit?: string };
    remotes: Array<{ name: string; pushUrl?: string; fetchUrl?: string }>;
    indexChanges: Array<{ uri: vscode.Uri }>;
    workingTreeChanges: Array<{ uri: vscode.Uri }>;
    mergeChanges: Array<{ uri: vscode.Uri }>;
  };
  status(): Promise<void>;
  add(paths: string[]): Promise<void>;
  commit(message: string): Promise<void>;
  push(remote: string, branch: string): Promise<void>;
}

export interface ProjectGitApi { repositories: ProjectGitRepository[] }
export interface ProjectGitExtension { getAPI(version: 1): ProjectGitApi }

export function githubRepositoryName(remote: string): string | undefined {
  const ssh = remote.match(/^git@github\.com:([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?$/i);
  if (ssh) return ssh[1];
  try {
    const url = new URL(remote);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search || url.hash || url.port) return undefined;
    return url.pathname.match(/^\/([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?\/?$/i)?.[1];
  } catch { return undefined; }
}

const within = (root: string, file: string) => { const relative = path.relative(root, file); return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
const publishable = (relative: string) => !relative.split(/[\\/]/).some((part) => [".git", "node_modules", "target", "dist", "build", ".next", "coverage", "logs"].includes(part) || /^\.env(?:\.|$)/.test(part) || /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(part)) && !/^\.valoride-(?:generation|blueprint|source-origin)\.json$/.test(relative) && !/^artifacts\/generated-.*\.zip$/.test(relative);

/** The caller presents this plan and the exact repo/branch before any staging or remote mutation. */
export async function planProjectGitPublish(repository: ProjectGitRepository, project: string, remoteName: string, branch: string): Promise<{ files: string[]; githubRepository: string; head?: string }> {
  await repository.status();
  if (!within(repository.rootUri.fsPath, project)) throw new Error("Choose the Git repository containing this project.");
  if (!branch || repository.state.HEAD?.name !== branch) throw new Error("Select the currently checked-out project branch before publishing. Branch switching remains in VS Code's Git controls.");
  const remote = repository.state.remotes.find((entry) => entry.name === remoteName);
  const githubRepository = remote && githubRepositoryName(remote.pushUrl || remote.fetchUrl || "");
  if (!githubRepository) throw new Error("Choose an existing GitHub remote without embedded credentials. Use VS Code's GitHub Publish controls to connect a repository first.");
  if (repository.state.mergeChanges.length) throw new Error("Resolve repository conflicts before publishing source. No automatic merge is performed.");
  if (repository.state.indexChanges.length) throw new Error("Review and commit or unstage existing staged changes in VS Code before publishing this project. Its current index was preserved.");
  const changes = repository.state.workingTreeChanges.filter((change) => within(project, change.uri.fsPath));
  const files = changes.filter((change) => publishable(path.relative(project, change.uri.fsPath).split(path.sep).join("/"))).map((change) => change.uri.fsPath);
  if (!files.length) throw new Error("No publishable project changes are available. Open Source Control to review the repository and ignored files.");
  return { files: [...new Set(files)].sort(), githubRepository, head: repository.state.HEAD?.commit };
}

export async function publishProjectWithBuiltinGit(repository: ProjectGitRepository, project: string, remote: string, branch: string, commitMessage: string, approvedPlan: Awaited<ReturnType<typeof planProjectGitPublish>>): Promise<{ repository: string; branch: string; commitSha: string; serverSnapshotRequested: false }> {
  if (!commitMessage.trim()) throw new Error("Enter a commit message before publishing source.");
  const current = await planProjectGitPublish(repository, project, remote, branch);
  if (current.head !== approvedPlan.head || current.githubRepository !== approvedPlan.githubRepository || JSON.stringify(current.files) !== JSON.stringify(approvedPlan.files))
    throw new Error("The repository changed after review. Run Publish Project Source again to review its current files and branch.");
  await repository.add(current.files);
  await repository.status();
  if (repository.state.HEAD?.commit !== current.head || repository.state.HEAD?.name !== branch || repository.state.indexChanges.some((change) => !current.files.includes(change.uri.fsPath)))
    throw new Error("The branch or staged files changed before commit. Review Source Control; no commit or push was made.");
  await repository.commit(commitMessage.trim());
  await repository.status();
  const commitSha = repository.state.HEAD?.commit;
  if (repository.state.HEAD?.name !== branch || !/^[a-f0-9]{40}$/.test(commitSha || ""))
    throw new Error("The committed branch changed or its immutable commit is unavailable. Review Source Control before pushing.");
  await repository.push(remote, branch);
  return { repository: current.githubRepository, branch, commitSha: commitSha!, serverSnapshotRequested: false };
}
