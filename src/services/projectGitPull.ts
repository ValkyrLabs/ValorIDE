import { execFile } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { githubRepositoryName, privateProjectGitPath, projectGitEnvironment } from "./projectGitPublish";

const exec = promisify(execFile);
export type ProjectGitRunner = (root: string, args: string[]) => Promise<string>;
export const appGitRunner = (executable: string): ProjectGitRunner => async (root, args) => {
  try {
    const { stdout } = await exec(executable, args, {
      cwd: root, env: { ...projectGitEnvironment(), GIT_TERMINAL_PROMPT: "0" }, timeout: 120_000, maxBuffer: 32 * 1024 * 1024,
    });
    return stdout.trimEnd();
  } catch {
    // Never reflect credential helper output or remote URLs into notifications.
    throw new Error("Git could not complete the operation. Check the checkout, Git credentials and Source Control.");
  }
};

/** Pull from the authorized repository, never an enclosing workspace or a guessed default branch. */
export async function pullBoundProject(root: string, bindings: ReadonlyArray<{ repository: string }>,
  assertCurrent: () => Promise<void>, git: ProjectGitRunner,
  fetchRef?: (url: string, refspec: string) => Promise<void>): Promise<{ branch: string; commit: string; changed: boolean }> {
  await assertCurrent();
  if (await fs.realpath(await git(root, ["rev-parse", "--show-toplevel"])) !== await fs.realpath(root))
    throw new Error("Pull requires a Git checkout rooted at the generated app. Use Commit & Push to link the downloaded project first.");
  const branch = await git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (!branch || branch.startsWith("-")) throw new Error("Check out a named app branch before pulling.");
  await git(root, ["check-ref-format", `refs/heads/${branch}`]);
  const remotes = (await git(root, ["remote"])).split(/\r?\n/).filter(name => name && !name.startsWith("-"));
  const urls = new Map<string, string>();
  for (const remote of remotes) {
    const fetchUrl = await git(root, ["remote", "get-url", "--all", remote]);
    const pushUrl = await git(root, ["remote", "get-url", "--push", "--all", remote]);
    const repo = githubRepositoryName(fetchUrl)?.toLowerCase();
    if (repo && !/[\r\n]/.test(fetchUrl + pushUrl) && githubRepositoryName(pushUrl)?.toLowerCase() === repo &&
        bindings.some(b => b.repository.toLowerCase() === repo)) urls.set(repo, fetchUrl);
  }
  if (urls.size !== 1) throw new Error("Pull requires one unambiguous GitHub repository linked to both this checkout and this Application.");
  const before = await git(root, ["rev-parse", "--verify", "HEAD^{commit}"]);
  const gitDir = await git(root, ["rev-parse", "--absolute-git-dir"]);
  async function assertUnchanged() {
    await assertCurrent();
    if (await git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]) !== branch ||
        await git(root, ["rev-parse", "--verify", "HEAD^{commit}"]) !== before ||
        await git(root, ["status", "--porcelain=v1", "--untracked-files=no"]))
      throw new Error("Commit or set aside local edits before pulling. ValorIDE will not stash or merge them.");
    const metadata = await fs.readdir(gitDir);
    if (metadata.some(name => ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-apply", "rebase-merge", "sequencer", "index.lock"].includes(name)))
      throw new Error("Finish the current Git operation before pulling.");
  }
  await assertUnchanged();
  const incoming = `refs/valoride/incoming/${randomUUID()}`;
  try {
    // A unique local ref pins precisely this fetch; another background fetch cannot replace it.
    const url = [...urls.values()][0], refspec = `refs/heads/${branch}:${incoming}`;
    if (fetchRef) await fetchRef(url, refspec);
    else await git(root, ["fetch", "--no-tags", "--no-recurse-submodules", "--", url, refspec]);
    const commit = await git(root, ["rev-parse", "--verify", `${incoming}^{commit}`]);
    if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("GitHub did not return a full commit SHA.");
    await assertUnchanged();
    if (before !== commit) {
      try {
        await git(root, ["merge-base", "--is-ancestor", before, commit]);
      } catch {
        throw new Error("The local branch is ahead or diverged. Review Source Control; no checkout files were changed.");
      }
      const paths = (await git(root, ["diff", "--name-only", "--no-renames", "-z", before, commit])).split("\0").filter(Boolean);
      if (paths.some(privateProjectGitPath))
        throw new Error("The incoming commit changes private ValorIDE metadata or credentials. Review the branch before pulling.");
      const tree = (await git(root, ["ls-tree", "-r", "-z", commit])).split("\0").filter(Boolean);
      if (tree.some(entry => !/^100(?:644|755) blob /.test(entry)))
        throw new Error("The incoming tree contains a symlink, submodule or unsupported entry. Review it in Source Control before pulling.");
      await assertUnchanged();
      try {
        await git(root, ["merge", "--ff-only", "--no-autostash", "--no-overwrite-ignore", commit]);
      } catch {
        throw new Error("Fast-forward was refused. Check for local files that the incoming change would overwrite; ValorIDE will not force the update.");
      }
    }
    if (await git(root, ["rev-parse", "--verify", "HEAD^{commit}"]) !== commit)
      throw new Error("The checkout changed during pull. Review its branch and HEAD.");
    return { branch, commit, changed: before !== commit };
  } finally {
    await git(root, ["update-ref", "-d", incoming]).catch(() => undefined);
  }
}
