import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import ignore from "ignore";
import { assertNoProjectLinks } from "./generatedProjectInstall";

export const GENERATOR_POLICY = ".valoride-generator-ignore";
const exec = promisify(execFile);

/** A generator policy is distinct from Git's ignore file and must be an exact committed document. */
export async function committedGeneratorPolicy(root: string): Promise<(relative: string) => boolean> {
  await assertNoProjectLinks(root, GENERATOR_POLICY);
  const file = path.join(root, GENERATOR_POLICY);
  const bytes = await fs.readFile(file).catch((error) => { if (error.code === "ENOENT") return undefined; throw error; });
  if (!bytes) return () => false;
  if (bytes.length > 64 * 1024) throw new Error("The generator ignore policy exceeds 64 KiB.");
  try {
    const { stdout } = await exec("git", ["--no-optional-locks", "-C", root, "rev-parse", "--show-toplevel"], { timeout: 10000 });
    const repository = stdout.trim();
    const relative = path.relative(repository, file).split(path.sep).join("/");
    if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) throw new Error("Policy is outside the project repository.");
    const committed = await exec("git", ["--no-optional-locks", "-C", repository, "show", `HEAD:${relative}`], { timeout: 10000, encoding: "buffer", maxBuffer: 128 * 1024 });
    if (!Buffer.from(committed.stdout).equals(bytes)) throw new Error("Policy has uncommitted edits.");
  } catch {
    throw new Error(`Commit ${GENERATOR_POLICY} in the chosen project repository before regenerating, or remove it. Existing project files were preserved.`);
  }
  const matcher = ignore().add(bytes.toString("utf8"));
  return (relative) => matcher.ignores(relative);
}
