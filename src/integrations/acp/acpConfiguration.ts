import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

export interface AcpAgentConfiguration {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  secretEnv: string[];
}

const identifier = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const variable = /^[A-Za-z_][A-Za-z0-9_]*$/;
const cleanString = (value: unknown, max = 8192): value is string =>
  typeof value === "string" && value.length <= max && !value.includes("\0");

/** Only pass VS Code's inspect(...).globalValue here, never merged workspace settings. */
export function parseAcpAgents(value: unknown): AcpAgentConfiguration[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 32)
    throw new Error(
      "ACP agents must be an array of at most 32 entries in User settings.",
    );
  const ids = new Set<string>();
  return value.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.id !== "string" ||
      !identifier.test(entry.id) ||
      ids.has(entry.id)
    )
      throw new Error(
        "Every ACP agent needs a unique id using letters, numbers, dots, underscores or hyphens.",
      );
    ids.add(entry.id);
    if (
      !cleanString(entry.name, 120) ||
      !entry.name.trim() ||
      !cleanString(entry.command) ||
      !entry.command.trim()
    )
      throw new Error(
        `ACP agent ${entry.id} needs a name and executable command.`,
      );
    if (
      /[\r\n]/.test(entry.command) ||
      (!path.isAbsolute(entry.command) && /[\\/]/.test(entry.command))
    )
      throw new Error(
        `ACP agent ${entry.id}: use an absolute executable path or a command name on PATH, not a relative script.`,
      );
    const args = entry.args ?? [];
    if (
      !Array.isArray(args) ||
      args.length > 128 ||
      args.some((arg) => !cleanString(arg))
    )
      throw new Error(
        `ACP agent ${entry.id}: args must be an array of strings.`,
      );
    const env = entry.env ?? {};
    if (
      !env ||
      typeof env !== "object" ||
      Array.isArray(env) ||
      Object.keys(env).length > 64 ||
      Object.entries(env).some(
        ([key, val]) => !variable.test(key) || !cleanString(val),
      )
    )
      throw new Error(
        `ACP agent ${entry.id}: env must map environment variable names to strings.`,
      );
    const secretEnv = entry.secretEnv ?? [];
    if (
      !Array.isArray(secretEnv) ||
      secretEnv.length > 32 ||
      secretEnv.some((key) => typeof key !== "string" || !variable.test(key))
    )
      throw new Error(
        `ACP agent ${entry.id}: secretEnv must list environment variable names.`,
      );
    return {
      id: entry.id,
      name: entry.name.trim(),
      command: entry.command,
      args: [...args],
      env: { ...env },
      secretEnv: [...new Set<string>(secretEnv)],
    };
  });
}

export const acpSecretKey = (agentId: string, name: string) =>
  `valoride.acp.${agentId}.${name}`;

export function withinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

/** Agent subprocesses are trusted programs, not a protocol sandbox. No IDE session secrets are inherited. */
export async function buildAcpLaunch(
  agent: AcpAgentConfiguration,
  workspaceRoot: string,
  getSecret: (key: string) => PromiseLike<string | undefined>,
  inherited: NodeJS.ProcessEnv = process.env,
) {
  const cwd = await fs.realpath(workspaceRoot);
  if (!(await fs.stat(cwd)).isDirectory())
    throw new Error("Select a local workspace folder for the ACP session.");
  const environment: Record<string, string> = {};
  for (const key of [
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "XDG_DATA_HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SystemRoot",
    "SYSTEMROOT",
    "COMSPEC",
    "USER",
    "USERNAME",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "SHELL",
  ]) {
    if (inherited[key]) environment[key] = inherited[key]!;
  }
  const safePaths: string[] = [];
  for (const directory of (agent.env.PATH ?? inherited.PATH ?? "").split(
    path.delimiter,
  )) {
    if (!directory || !path.isAbsolute(directory)) continue;
    const real = await fs.realpath(directory).catch(() => undefined);
    if (real && !withinRoot(cwd, real)) safePaths.push(real);
  }
  Object.assign(environment, agent.env);
  environment.PATH = [...new Set(safePaths)].join(path.delimiter);
  for (const name of agent.secretEnv) {
    const value = await getSecret(acpSecretKey(agent.id, name));
    if (!value)
      throw new Error(
        `Missing ${name} for ${agent.name}. Run ValorIDE: Set ACP Agent Secret.`,
      );
    if (value.includes("\0"))
      throw new Error(`Invalid secret value for ${name}.`);
    environment[name] = value;
  }
  let command: string | undefined;
  const candidates = path.isAbsolute(agent.command)
    ? [agent.command]
    : safePaths.flatMap((directory) => {
        const base = path.join(directory, agent.command);
        return process.platform === "win32" && !path.extname(base)
          ? [base + ".exe", base + ".com"]
          : [base];
      });
  for (const candidate of candidates) {
    try {
      const real = await fs.realpath(candidate);
      if (!(await fs.stat(real)).isFile()) continue;
      await fs.access(
        real,
        process.platform === "win32" ? constants.F_OK : constants.X_OK,
      );
      if (!path.isAbsolute(agent.command) && withinRoot(cwd, real)) continue;
      command = real;
      break;
    } catch {
      /* Try the next explicit PATH candidate. */
    }
  }
  if (!command)
    throw new Error(
      `ACP executable not found: ${agent.command}. Install the agent yourself and configure its absolute executable path.`,
    );
  if (/\.(cmd|bat)$/i.test(command))
    throw new Error(
      "ACP launches without a shell. Configure node.exe plus the agent script, or a native executable, instead of a .cmd/.bat shim.",
    );
  return {
    agent: { id: agent.id, name: agent.name, command, args: [...agent.args] },
    cwd,
    environment,
  };
}

/** Reveal invisible/control characters in native approvals rather than letting them spoof commands. */
export function acpDisplay(value: unknown, limit = 12000): string {
  return String(value ?? "")
    .slice(0, limit)
    .replace(
      // eslint-disable-next-line no-control-regex -- Display these controls literally in native approvals.
      /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
      (character) =>
        `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
}
/** Task currently captures its root at module load; never expose a differently scoped task. */
export async function assertAcpTaskWorkspace(
  root: string,
  taskRoot: string,
): Promise<void> {
  let actual: string | undefined;
  try {
    actual = await fs.realpath(taskRoot);
  } catch {
    /* Report the actionable reload instruction below. */
  }
  if (actual !== root)
    throw new Error(
      "ValorIDE's task workspace changed. Reload the VS Code window before starting the ACP agent server.",
    );
}
