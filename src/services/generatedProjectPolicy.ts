import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { assertNoProjectLinks } from "./generatedProjectInstall";

export const GENERATOR_POLICY = ".valoride-generator-ignore";
const exec = promisify(execFile);

/** Match the committed source policy accepted by ProjectSourceRegenerationService. */
export function parseGeneratorPolicy(source: string): (relative: string) => boolean {
  if (Buffer.byteLength(source, "utf8") > 64 * 1024)
    throw new Error("The generator ignore policy exceeds 64 KiB.");
  const patterns: RegExp[] = [];
  for (const line of source.split(/\r?\n/)) {
    const rule = line.trim();
    if (!rule || rule.startsWith("#")) continue;
    if (rule.startsWith("!") || /[\\[\]]/.test(rule))
      throw new Error("Generator ignore policy supports root-relative paths, * and ** only. Repair the committed policy.");
    const target = rule.endsWith("/") ? rule.slice(0, -1) : rule;
    const segments = target.split("/");
    if (!target || target.length > 2048 || target.startsWith("/") ||
        target.includes(":") || target.split("").some((character) => character.charCodeAt(0) < 32) ||
        segments.some((part) => !part.trim() ||
          [".", "..", ".git", ".hg", ".svn", ".env"].includes(part.toLowerCase()) ||
          part.toLowerCase().startsWith(".env.")) ||
        /\.(pem|key|p12|pfx|jks|keystore)$/i.test(target))
      throw new Error("Generator ignore policy contains an unsafe or private credential path.");
    let expression = "^";
    for (let index = 0; index < rule.length; index++) {
      const character = rule[index];
      if (character === "*" && rule[index + 1] === "*") {
        expression += ".*";
        index++;
      } else if (character === "*") {
        expression += "[^/]*";
      } else {
        expression += "\\^$.*+?()[]{}|".includes(character) ? "\\" + character : character;
      }
    }
    if (rule.endsWith("/")) expression += ".*";
    patterns.push(new RegExp(expression + "$"));
    if (patterns.length > 2000)
      throw new Error("Generator ignore policy contains too many rules.");
  }
  return (relative) => patterns.some((pattern) => pattern.test(relative));
}

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
  return parseGeneratorPolicy(bytes.toString("utf8"));
}
