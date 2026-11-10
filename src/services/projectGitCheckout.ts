import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";
import { assertNoProjectLinks } from "./generatedProjectInstall";
import { GIT_PROJECT_LINEAGE, readGitProjectIdentity } from "./projectGitIdentity";
import { normalizeBlueprintBackend, readProjectBlueprintState } from "./projectBlueprintSync";
import { githubRepositoryName, projectGitEnvironment } from "./projectGitPublish";
import * as vscode from "vscode";

const git = promisify(execFile);
// A fresh clone has no private install receipt. Only accept its unmodified lineage from HEAD;
// a local edit or staged/untracked JSON file is not a claim on a different Application.
export async function assertTrackedGitLineage(binary: string, root: string, generated: string, appId: string): Promise<void> {
  const file = GIT_PROJECT_LINEAGE, relative = path.relative(root, path.join(generated,file)).split(path.sep).join("/");
  if (path.isAbsolute(relative) || relative.split("/").includes("..")) throw new Error("The app lineage is outside this checkout.");
  await assertNoProjectLinks(generated,file);
  const opts = {cwd:root,env:projectGitEnvironment(),timeout:10000,maxBuffer:16*1024*1024};
  try {
    const {stdout} = await git(binary,["--literal-pathspecs","ls-tree","-z","HEAD","--",relative],opts);
    const match = /^100(?:644|755) blob ([a-f0-9]{40})\t/.exec(stdout);
    if (!match || stdout.slice(match[0].length) !== relative+"\0") throw new Error();
    const [content,index] = await Promise.all([
      git(binary,["cat-file","blob",match[1]],opts),
      git(binary,["--literal-pathspecs","ls-files","-s","-z","--",relative],opts),
    ]);
    const committed = content.stdout;
    if (JSON.parse(committed).applicationId !== appId ||
        index.stdout !== `${stdout.slice(0,6)} ${match[1]} 0\t${relative}\0` ||
        (await fs.stat(path.join(generated,file))).size > opts.maxBuffer ||
        (await fs.readFile(path.join(generated,file),"utf8")).replace(/\r\n/g,"\n") !== committed.replace(/\r\n/g,"\n")) throw new Error();
  } catch { throw new Error("A cloned app needs its original generation-lineage.json tracked and unchanged in the checked-out commit. Restore it or re-download the app."); }
}
interface Pairing {
  bindingId: string; repository: string;
}
export const sessionFingerprint = (token: string) => createHash("sha256").update(token).digest("hex");
export interface AppCheckoutPairing {
  bindings: readonly Pairing[];
  gitPath: string;
  state: Pick<vscode.Memento, "get" | "update">;
  session: string;
  fromLineage?: boolean;
  confirm(parent: string, repository: string): PromiseLike<boolean>;
  assertCurrent(): Promise<void>;
}

export function appPairing(context: vscode.ExtensionContext, appName: string, applicationId: string, gitPath: string,
    bindings: readonly Pairing[], jwtToken: string, assertCurrent: () => Promise<void>, fromLineage: boolean): AppCheckoutPairing {
  return { bindings, gitPath, state:context.workspaceState, session:sessionFingerprint(jwtToken), assertCurrent, fromLineage,
    confirm: async (parent, repository) => "Pair authored workspace" === await vscode.window.showWarningMessage(
      `Pair the authored workspace with ${appName} (${repository})?`,
      {modal:true, detail:`${parent}\nApplication ${applicationId}. GitHub sync will include all eligible authored changes in this workspace, not just the generated subfolder. Pull will update this workspace from that repository. Pairing does not itself push changes.`},
      "Pair authored workspace"),
  };
}

async function matchingBoundRepository(root: string, generated: string, pairing: AppCheckoutPairing): Promise<Pairing | undefined> {
  const run = async (args:string[],cwd=root) => {
    try { return (await git(pairing.gitPath,args,{cwd,env:projectGitEnvironment(),timeout:10000})).stdout.trimEnd(); }
    catch { throw new Error("Could not verify the authored workspace's Git checkout and remote configuration. No Git operation was started."); }
  };
  if (await fs.realpath(await run(["rev-parse","--show-toplevel"], generated)) !== await fs.realpath(root)) return undefined;
  const matches = new Map<string,Pairing>();
  for (const name of (await run(["remote"])).split(/\r?\n/).filter(n=>/^[a-z0-9_][a-z0-9._/-]*$/i.test(n))) {
    const [fetch, push] = await Promise.all([[],["--push"]].map(mode=>run(["remote","get-url",...mode,"--all",name])));
    const repo = githubRepositoryName(fetch)?.toLowerCase();
    if (!repo || githubRepositoryName(push)?.toLowerCase() !== repo) continue;
    const authorized = pairing.bindings.find(b=>b.repository.toLowerCase() === repo);
    if (authorized) matches.set(repo,{ bindingId:authorized.bindingId, repository:authorized.repository });
  }
  if (matches.size > 1) throw new Error("Multiple Application-bound repos match this workspace. Leave one unambiguous GitHub destination before pairing.");
  return [...matches.values()][0];
}

async function hasCheckout(root: string): Promise<boolean> {
  await assertNoProjectLinks(root, ".git");
  const entry = await fs.lstat(path.join(root, ".git")).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "ENOENT") throw e;
    return undefined;
  });
  return Boolean(entry?.isDirectory() || entry?.isFile()); // includes linked Git worktrees
}

async function workspaceMarker(root: string, appId: string, backend: string): Promise<"conflict" | "confirmed" | "unconfirmed"> {
  const [binding, generation] = await Promise.all([readProjectBlueprintState(root), readGitProjectIdentity(root)]);
  if ((generation && generation.applicationId !== appId) || (binding && (binding.applicationId !== appId ||
      (binding.backend && normalizeBlueprintBackend(binding.backend) !== normalizeBlueprintBackend(backend))))) return "conflict";
  return binding?.backend ? "confirmed" : "unconfirmed";
}

/** A generated SDK may live under an authored workspace's thorapi/ directory.
 * Both its canonical app identity and its GitHub binding (verified by the caller)
 * must agree before the enclosing repository's authored files can join a publish. */
export async function resolveAppCheckout(generatedRoot: string, applicationId: string, backend: string,
  workspaceRoots: readonly string[], pairing?: AppCheckoutPairing): Promise<string | undefined> {
  if (await hasCheckout(generatedRoot)) return generatedRoot;
  for (const parent of [...workspaceRoots].sort((a, b) => b.length - a.length)) {
    const rel = path.relative(parent, generatedRoot);
    if (!rel || rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) continue;
    if (!await hasCheckout(parent)) continue;
    const marker = await workspaceMarker(parent,applicationId,backend);
    const key = pairing && `projectGitPair.v1:${normalizeBlueprintBackend(backend)}:${pairing.session}:${applicationId}:${path.resolve(parent)}`;
    const prior = key ? pairing.state.get<Pairing>(key) : undefined;
    if (marker === "conflict") {
      if (prior) throw new Error("This previously paired workspace now identifies a different Application or backend. No Git operation was started.");
      continue;
    }
    if (marker === "confirmed") return parent;
    if (!pairing) continue;
    await pairing.assertCurrent();
    const candidate = await matchingBoundRepository(parent, generatedRoot, pairing);
    if (!candidate) {
      if (prior) throw new Error("The paired workspace no longer matches an authorized GitHub repository. Reconnect its original app remote.");
      continue;
    }
    if (!prior || prior.bindingId !== candidate.bindingId || prior.repository.toLowerCase() !== candidate.repository.toLowerCase()) {
      if (pairing.fromLineage) await assertTrackedGitLineage(pairing.gitPath,parent,generatedRoot,applicationId);
      if (!await pairing.confirm(parent,candidate.repository)) return undefined;
      await pairing.assertCurrent();
      // The user may have left the dialog open while editing checkout metadata.
      const latest = await matchingBoundRepository(parent,generatedRoot,pairing);
      if (latest?.bindingId !== candidate.bindingId || latest.repository !== candidate.repository ||
          await workspaceMarker(parent,applicationId,backend) === "conflict")
        throw new Error("The workspace binding changed during review. No Git operation was started.");
      await pairing.state.update(key, candidate);
    }
    return parent;
  }
  return generatedRoot;
}
