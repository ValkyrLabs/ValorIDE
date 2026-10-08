import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings";
import type { GovernedCodingTaskBinding } from "./SwarmCodingInference";
import { PathAccess } from "@services/access/PathAccess";

type Binding = Pick<GovernedCodingTaskBinding, "commandId" | "actionDigest" | "scopeDigest">;
type LocalAction = "readFiles" | "editFiles" | "executeSafeCommands";
export interface GovernedLocalAuthorityState {
  settings: AutoApprovalSettings;
  workspaceRoot?: string;
  workspaceTrusted: boolean;
  active: boolean;
  mode: "plan" | "act";
  requests: number;
  binding: Binding;
}
type CommandDecision = {
  commandDigest: string;
  approvalDigest?: string;
  approved: boolean;
  completed: boolean;
  uses: number;
};
export interface GovernedLocalAuthoritySnapshot extends Binding {
  version: 1;
  workspaceRoot?: string;
  issuedAt: number;
  expiresAt: number;
  ceiling: AutoApprovalSettings;
  decisions: CommandDecision[];
  requestsUsed: number;
}

/** Keep only permissions the user has already enabled for this local task. */
export function restrictGovernedLocalSettings(
  settings: AutoApprovalSettings,
  ceiling: AutoApprovalSettings = settings,
): AutoApprovalSettings {
  return {
    ...settings,
    enabled: settings.enabled === true && ceiling.enabled === true,
    maxRequests: Math.min(settings.maxRequests, ceiling.maxRequests),
    actions: {
      readFiles: settings.actions.readFiles === true && ceiling.actions.readFiles === true,
      editFiles: settings.actions.editFiles === true && ceiling.actions.editFiles === true,
      executeSafeCommands: settings.actions.executeSafeCommands === true && ceiling.actions.executeSafeCommands === true,
      readFilesExternally: false, editFilesExternally: false, executeAllCommands: false,
      useBrowser: false, useMcp: false, useProcedures: false,
    },
  };
}

function validCommandDecision(value: unknown): value is CommandDecision {
  if (!value || typeof value !== "object") return false;
  const decision = value as Partial<CommandDecision>;
  return typeof decision.commandDigest === "string" && /^[a-f0-9]{64}$/.test(decision.commandDigest) &&
    (decision.approvalDigest === undefined || typeof decision.approvalDigest === "string" && /^[a-f0-9]{64}$/.test(decision.approvalDigest)) &&
    typeof decision.approved === "boolean" && typeof decision.completed === "boolean" &&
    Number.isInteger(decision.uses) && decision.uses! >= 0 && decision.uses! <= commandRetryLimit;
}

const lifetimeMs = 30 * 60_000;
const commandRetryLimit = 3;
const protectedSegment = /^(?:\.git|\.aws|\.ssh|\.codex|\.agents|\.valorideignore|\.valorignore|\.env(?:\..*)?|\.npmrc|\.netrc|credentials(?:\..*)?|id_rsa|id_ed25519)$/i;
const protectedExtension = /\.(?:pem|key|p12|pfx)$/i;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const inside = (root: string, candidate: string) => candidate === root ||
  (!path.relative(root, candidate).startsWith(`..${path.sep}`) && path.relative(root, candidate) !== ".." &&
    !path.isAbsolute(path.relative(root, candidate)));
function realPath(candidate: string): string | undefined {
  try { return fs.realpathSync(candidate); } catch { return undefined; }
}
function existingAncestor(candidate: string): string | undefined {
  try {
    fs.lstatSync(candidate); // Broken symlinks and unreadable existing paths must fail closed.
    return realPath(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") return undefined;
    const parent = path.dirname(candidate);
    if (parent === candidate) return undefined;
    const resolved = existingAncestor(parent);
    return resolved && path.join(resolved, path.basename(candidate));
  }
}

/**
 * Local user authority is independent of the server's signed inference grant.
 * It stays in task history, expires after 30 minutes, and never changes global settings.
 * Build/test retries additionally need an explicit decision on the exact local command.
 */
export class GovernedLocalAuthority {
  private readonly binding: Binding;
  private readonly root?: string;
  private readonly ceiling: AutoApprovalSettings;
  private readonly issuedAt: number;
  private readonly expiresAt: number;
  private readonly decisions = new Map<string, CommandDecision>();
  private requestsUsed = 0;

  constructor(binding: Binding, workspaceRoot: string | undefined, settings: AutoApprovalSettings,
    private readonly now: () => number = Date.now, restored?: GovernedLocalAuthoritySnapshot) {
    this.binding = { commandId: binding.commandId, actionDigest: binding.actionDigest, scopeDigest: binding.scopeDigest };
    const currentRoot = workspaceRoot ? realPath(workspaceRoot) : undefined;
    const validRestore = restored?.version === 1 && this.matches(restored) &&
      restored.workspaceRoot === currentRoot && Number.isFinite(restored.issuedAt) &&
      Number.isFinite(restored.expiresAt) && restored.expiresAt > restored.issuedAt &&
      restored.expiresAt <= restored.issuedAt + lifetimeMs && restored.issuedAt <= now() &&
      restored.ceiling && typeof restored.ceiling.enabled === "boolean" && restored.ceiling.actions &&
      [restored.ceiling.actions.readFiles, restored.ceiling.actions.editFiles, restored.ceiling.actions.executeSafeCommands]
        .every((value) => typeof value === "boolean") &&
      Number.isInteger(restored.ceiling.maxRequests) && restored.ceiling.maxRequests > 0 && restored.ceiling.maxRequests <= 500 &&
      Number.isInteger(restored.requestsUsed) && restored.requestsUsed >= 0 && restored.requestsUsed <= 500 &&
      Array.isArray(restored.decisions) && restored.decisions.length <= 500 &&
      restored.decisions.every(validCommandDecision) &&
      new Set(restored.decisions.map((decision) => decision.commandDigest)).size === restored.decisions.length;
    this.root = restored && !validRestore ? undefined : currentRoot;
    this.ceiling = restrictGovernedLocalSettings(settings, validRestore ? restored.ceiling : settings);
    this.issuedAt = validRestore ? restored.issuedAt : now();
    this.expiresAt = validRestore ? restored.expiresAt : this.issuedAt + lifetimeMs;
    if (validRestore) {
      this.requestsUsed = restored.requestsUsed;
      for (const decision of restored.decisions) {
        this.decisions.set(decision.commandDigest, { ...decision });
      }
    }
  }

  settings(settings: AutoApprovalSettings): AutoApprovalSettings {
    return restrictGovernedLocalSettings(settings, this.ceiling);
  }

  snapshot(requestsUsed = this.requestsUsed): GovernedLocalAuthoritySnapshot {
    if (Number.isInteger(requestsUsed) && requestsUsed >= 0) this.requestsUsed = Math.max(this.requestsUsed, requestsUsed);
    return { ...this.binding, version: 1, workspaceRoot: this.root, issuedAt: this.issuedAt,
      expiresAt: this.expiresAt, ceiling: this.settings(this.ceiling),
      decisions: Array.from(this.decisions.values(), (value) => ({ ...value })), requestsUsed: this.requestsUsed };
  }

  canUse(action: LocalAction, state: GovernedLocalAuthorityState): boolean {
    const settings = this.settings(state.settings);
    if (Number.isInteger(state.requests) && state.requests >= 0) this.requestsUsed = Math.max(this.requestsUsed, state.requests);
    return this.currentScope(state) && settings.enabled && settings.actions[action] === true &&
      Number.isInteger(settings.maxRequests) && settings.maxRequests > 0 && settings.maxRequests <= 500 &&
      Number.isInteger(state.requests) && state.requests >= 0 && this.requestsUsed < settings.maxRequests;
  }

  /** Only the existing explicit quota decision can renew a spent request budget. */
  resetRequestBudget(approved: boolean, state: GovernedLocalAuthorityState): boolean {
    if (approved !== true || !this.currentScope(state)) return false;
    this.requestsUsed = 0;
    return true;
  }

  private currentScope(state: GovernedLocalAuthorityState): boolean {
    return !!this.root && this.matches(state.binding) && !!this.binding.commandId &&
      /^sha256:[a-f0-9]{64}$/.test(this.binding.actionDigest) && /^sha256:[a-f0-9]{64}$/.test(this.binding.scopeDigest) &&
      state.active && state.mode === "act" && state.workspaceTrusted === true &&
      !!state.workspaceRoot && realPath(state.workspaceRoot) === this.root &&
      this.now() >= this.issuedAt && this.now() < this.expiresAt;
  }

  canAccessPath(action: "readFiles" | "editFiles", candidate: string | undefined,
    state: GovernedLocalAuthorityState): boolean {
    return this.canUse(action, state) && !!candidate && this.localPath(candidate);
  }

  canAutoApproveCommand(command: string, requiresApproval: boolean, state: GovernedLocalAuthorityState): boolean {
    if (!this.canUse("executeSafeCommands", state) || !this.canUse("readFiles", state)) return false;
    const recipe = this.commandRecipe(command);
    if (!recipe) return false;
    const decision = this.decisions.get(this.commandDigest(command));
    if (decision?.approved === false) return false;
    if (decision?.approved && decision.completed && decision.approvalDigest === recipe.digest &&
      decision.uses < commandRetryLimit) return true;
    // A model's "false" cannot authorize a build, package script or unknown executable.
    return recipe.readOnly && !requiresApproval && !decision;
  }

  recordDecision(command: string, approved: boolean, state: GovernedLocalAuthorityState): void {
    const recipe = this.commandRecipe(command);
    if (!recipe) return; // Never retain an authority receipt for an arbitrary shell command.
    const commandDigest = this.commandDigest(command);
    this.decisions.set(commandDigest, { commandDigest, approved,
      approvalDigest: approved && this.canUse("executeSafeCommands", state) && this.canUse("readFiles", state)
        ? recipe.digest : undefined, completed: false, uses: 0 });
  }

  recordOutcome(command: string, outcome: string): void {
    const commandDigest = this.commandDigest(command);
    const decision = this.decisions.get(commandDigest);
    const completed = outcome === "succeeded" || outcome === "failed";
    if (!decision) {
      const recipe = this.commandRecipe(command);
      if (recipe && !completed) this.decisions.set(commandDigest, { commandDigest,
        approvalDigest: recipe.digest, approved: true, completed: false, uses: 1 });
      return;
    }
    if (!decision.approved) return;
    decision.completed = completed;
    decision.uses++;
  }

  private matches(binding: Binding): boolean {
    return binding?.commandId === this.binding.commandId && binding?.actionDigest === this.binding.actionDigest &&
      binding?.scopeDigest === this.binding.scopeDigest;
  }

  private commandDigest(command: string): string {
    return sha(JSON.stringify([this.binding, this.root, command.trim()]));
  }

  private localPath(candidate: string): boolean {
    if (!this.root) return false;
    const lexical = path.resolve(this.root, candidate), canonical = existingAncestor(lexical);
    if (!inside(this.root, lexical) || !canonical || !inside(this.root, canonical)) return false;
    for (const value of [lexical, canonical]) {
      const parts = path.relative(this.root, value).split(path.sep);
      if (parts.some((part) => protectedSegment.test(part) || protectedExtension.test(part))) return false;
      if (!this.ignoreFilesStayLocal() || !new PathAccess({ workspaceRoot: this.root }).validateAccess(value)) return false;
    }
    return true;
  }

  private ignoreFilesStayLocal(): boolean {
    const visited = new Set<string>();
    const inspect = (filename: string): boolean => {
      if (visited.has(filename)) return true;
      if (visited.size >= 50) return false;
      visited.add(filename);
      try {
        fs.lstatSync(filename);
      } catch (error) { return (error as NodeJS.ErrnoException).code === "ENOENT"; }
      const canonical = realPath(filename);
      if (!canonical || !inside(this.root!, canonical)) return false;
      try {
        const content = fs.readFileSync(filename, "utf8");
        if (content.length > 100_000) return false;
        return content.split(/\r?\n/).every((line) => {
          const match = /^!include\s+(.+)$/.exec(line.trim());
          if (!match) return true;
          const included = path.resolve(this.root!, match[1]);
          return inside(this.root!, included) && inspect(included);
        });
      } catch { return false; }
    };
    return [".valorignore", ".valorideignore"].every((name) => inspect(path.join(this.root!, name)));
  }

  private commandRecipe(command: string): { digest: string; readOnly: boolean } | undefined {
    const forbiddenControl = command.includes("\u0000") || command.includes("\n") || command.includes("\r");
    if (!this.root || !command.trim() || forbiddenControl || /[;&|<>`$\\"'(){}*?]/.test(command)) return undefined;
    const args = command.trim().split(/\s+/);
    let readOnly = false;
    if (args.length === 1 && args[0] === "pwd") readOnly = true;
    else if (args[0] === "cat" && args.length === 2 && !args[1].startsWith("-") && this.localPath(args[1])) readOnly = true;
    else if (args[0] === "rg" && args[1] === "--files" && args.length === 3 && !args[2].startsWith("-") && this.localPath(args[2])) readOnly = true;
    else if (args[0] === "rg" && args.length === 3 && /^[\w.-]+$/.test(args[1]) &&
      !args[1].startsWith("-") && !args[2].startsWith("-") && this.localPath(args[2]) &&
      fs.existsSync(path.resolve(this.root, args[2])) && fs.statSync(path.resolve(this.root, args[2])).isFile()) readOnly = true;
    if (readOnly) return { digest: sha(JSON.stringify([this.binding, this.root, command.trim(), "local-read/v1"])), readOnly };

    const packageManager = ["npm", "pnpm", "yarn"].includes(args[0]);
    const script = args.length === 2 && args[1] === "test" ? "test" :
      args.length === 3 && args[1] === "run" ? args[2] : undefined;
    if (!packageManager || !script || !/^(?:build|test|check|typecheck|lint)(?::[a-z0-9-]+)?$/.test(script) ||
      !this.localPath("package.json")) return undefined;
    try {
      const manifest = fs.readFileSync(path.join(this.root, "package.json"), "utf8");
      const scripts = JSON.parse(manifest).scripts;
      if (!scripts || !this.localValidationRecipe(scripts[script]) ||
        [scripts[`pre${script}`], scripts[`post${script}`]].some((value) => value !== undefined && !this.localValidationRecipe(value))) return undefined;
      // Bind retries to the reviewed scripts and local dependency/configuration controls.
      const controls = fs.readdirSync(this.root).filter((name) =>
        /^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|(?:tsconfig|vite\.config|vitest\.config|jest\.config|eslint\.config)(?:\.[\w-]+)*\.[cm]?[jt]s(?:on)?)$/.test(name)).sort();
      const hashes: Array<[string, string]> = [];
      for (const name of controls) {
        if (!this.localPath(name)) return undefined;
        hashes.push([name, sha(fs.readFileSync(path.join(this.root, name), "utf8"))]);
      }
      return { digest: sha(JSON.stringify([this.binding, this.root, command.trim(), hashes])), readOnly: false };
    } catch { return undefined; }
  }

  private localValidationRecipe(value: unknown): boolean {
    if (typeof value !== "string" || !value.trim()) return false;
    // Deliberately small: unknown scripts, installs, network clients, publication and eval keep their prompt.
    return value.split(/\s*&&\s*/).every((part) => /^(?:tsc(?:\s+(?:--noEmit|--pretty\s+false|--incremental\s+false|-b|--build))*|vite\s+build|vitest\s+run|jest(?:\s+--runInBand)?|eslint\s+\.|prettier\s+--check\s+\.)$/.test(part.trim()));
  }
}
