import { it } from "@jest/globals";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { GovernedLocalAuthority, restrictGovernedLocalSettings, type GovernedLocalAuthorityState } from "./GovernedLocalAuthority";
import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings";

const binding = { commandId: "reviewed-command", actionDigest: `sha256:${"a".repeat(64)}`, scopeDigest: `sha256:${"b".repeat(64)}` };
function settings(): AutoApprovalSettings {
  return { version: 1, enabled: true, maxRequests: 20, enableNotifications: true,
    actions: { readFiles: true, editFiles: true, executeSafeCommands: true,
      readFilesExternally: true, editFilesExternally: true, executeAllCommands: true,
      useBrowser: true, useMcp: true, useProcedures: true } };
}
let directory: string;
let root: string;
let state: GovernedLocalAuthorityState;
let now: number;
let authority: GovernedLocalAuthority;
const write = (name: string, value: string) => {
  const filename = path.join(root, name); fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, value);
};
const manifest = (scripts: Record<string, string> = { build: "tsc --noEmit" }) => write("package.json", JSON.stringify({ scripts }));
const approveBuild = (outcome = "succeeded") => {
  authority.recordDecision("npm run build", true, state); authority.recordOutcome("npm run build", outcome);
};
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "valoride-local-authority-"));
  root = path.join(directory, "project"); fs.mkdirSync(root);
  write("src/app.ts", "export const value = 1;\n"); manifest(); now = 1_000_000;
  state = { settings: settings(), workspaceRoot: root, workspaceTrusted: true,
    active: true, mode: "act", requests: 0, binding: { ...binding } };
  authority = new GovernedLocalAuthority(binding, root, state.settings, () => now);
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

describe("bounded local user authority", () => {
  it("retains only explicit local settings and never mutates the original", () => {
    const original = settings(); const normalized = restrictGovernedLocalSettings(original);
    expect(normalized).toMatchObject({ enabled: true, version: 1, maxRequests: 20, enableNotifications: true,
      actions: { readFiles: true, editFiles: true, executeSafeCommands: true, executeAllCommands: false,
        readFilesExternally: false, editFilesExternally: false, useBrowser: false, useMcp: false, useProcedures: false } });
    expect(Object.values(original.actions).every(Boolean)).toBe(true);
  });

  it("cannot broaden an initially declined permission through later global preferences", () => {
    const ceiling = settings(); ceiling.actions.editFiles = false; ceiling.maxRequests = 2;
    const constrained = new GovernedLocalAuthority(binding, root, ceiling, () => now);
    expect(constrained.settings(settings()).actions.editFiles).toBe(false);
    expect(constrained.settings(settings()).maxRequests).toBe(2);
    expect(constrained.canAccessPath("editFiles", "src/app.ts", state)).toBe(false);
  });

  it.each(["commandId", "actionDigest", "scopeDigest"] as const)("does not transfer authority after %s changes", (field) => {
    state.binding = { ...binding, [field]: "different" };
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
  });

  it.each(["inactive", "plan", "untrusted", "no-workspace", "other-workspace", "quota", "expired", "disabled"])("keeps %s tasks interactive", (reason) => {
    if (reason === "inactive") state.active = false;
    if (reason === "plan") state.mode = "plan";
    if (reason === "untrusted") state.workspaceTrusted = false;
    if (reason === "no-workspace") state.workspaceRoot = undefined;
    if (reason === "other-workspace") state.workspaceRoot = directory;
    if (reason === "quota") state.requests = 20;
    if (reason === "expired") now += 30 * 60_000;
    if (reason === "disabled") state.settings.enabled = false;
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
  });

  it("confines existing and new paths to the exact workspace", () => {
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(true);
    expect(authority.canAccessPath("editFiles", "new/nested/source.ts", state)).toBe(true);
    for (const candidate of ["../project-sibling/file.ts", directory, "../../outside.txt", undefined]) {
      expect(authority.canAccessPath("editFiles", candidate, state)).toBe(false);
    }
  });

  it.each([".git/config", ".env", ".env.local", ".aws/credentials", ".ssh/id_rsa", ".codex/config.toml", ".agents/policy.md", "certificate.pem", ".npmrc", ".valorideignore"])("does not auto-approve protected %s", (candidate) => {
    expect(authority.canAccessPath("readFiles", candidate, state)).toBe(false);
    expect(authority.canAccessPath("editFiles", candidate, state)).toBe(false);
  });

  it("rejects symlink escapes, protected aliases and broken symlinks", () => {
    fs.symlinkSync(directory, path.join(root, "escape"), "dir");
    expect(authority.canAccessPath("editFiles", "escape/new.ts", state)).toBe(false);
    write(".env", "fixture only"); fs.symlinkSync(path.join(root, ".env"), path.join(root, "alias.txt"));
    expect(authority.canAccessPath("readFiles", "alias.txt", state)).toBe(false);
    fs.symlinkSync(path.join(directory, "does-not-exist"), path.join(root, "broken"));
    expect(authority.canAccessPath("editFiles", "broken/file.ts", state)).toBe(false);
    fs.symlinkSync(path.join(root, "src"), path.join(root, "local-alias"), "dir");
    expect(authority.canAccessPath("readFiles", "local-alias/app.ts", state)).toBe(true);
  });

  it("honors current ignore rules and fails closed on an outside include", () => {
    write(".valorideignore", "src/app.ts\n");
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
    fs.writeFileSync(path.join(directory, "outside-ignore"), "anything\n");
    fs.symlinkSync(path.join(directory, "outside-ignore"), path.join(root, "ignore-alias"));
    write(".valorideignore", "!include ignore-alias\n");
    expect(authority.canAccessPath("editFiles", "source.ts", state)).toBe(false);
  });

  it("auto-approves only recognized local reads when safe/read permissions are explicit", () => {
    for (const command of ["pwd", "cat src/app.ts", "rg --files src", "rg value src/app.ts"]) {
      expect(authority.canAutoApproveCommand(command, false, state)).toBe(true);
    }
    state.settings.actions.readFiles = false;
    expect(authority.canAutoApproveCommand("pwd", false, state)).toBe(false);
  });

  it.each(["git push", "npm install", "curl https://example.test", "node -e unsafe", "cat ../outside", "cat .env", "rg --files -L", "rg value -L", "pwd; npm publish", "pwd > file", "pwd $(unsafe)"])("never uses the model's safe claim for %s", (command) => {
    expect(authority.canAutoApproveCommand(command, false, state)).toBe(false);
    authority.recordDecision(command, true, state); authority.recordOutcome(command, "succeeded");
    expect(authority.canAutoApproveCommand(command, false, state)).toBe(false);
  });

  it("requires a first explicit build decision and reuses only the exact bounded retry", () => {
    expect(authority.canAutoApproveCommand("npm run build", false, state)).toBe(false);
    approveBuild("failed");
    expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(true);
    expect(authority.canAutoApproveCommand("pnpm run build", true, state)).toBe(false);
    authority.recordOutcome("npm run build", "succeeded");
    expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(true);
    authority.recordOutcome("npm run build", "succeeded");
    expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(false);
  });

  it.each(["pwd\u0000", "pwd\n", "pwd\r", "cat src/app.ts\u0000", "cat src/app.ts\n", "cat src/app.ts\r"])(
    "never retains automatic authority for a command containing a forbidden control character (%j)", (command) => {
      expect(authority.canAutoApproveCommand(command, false, state)).toBe(false);
      authority.recordDecision(command, true, state); authority.recordOutcome(command, "succeeded");
      expect(authority.canAutoApproveCommand(command, false, state)).toBe(false);
      expect(authority.snapshot().decisions).toHaveLength(0);
    },
  );

  it("retains ordinary whitespace in recognized local reads", () => {
    expect(authority.canAutoApproveCommand("pwd\t", false, state)).toBe(true);
    expect(authority.canAutoApproveCommand("cat\tsrc/app.ts", false, state)).toBe(true);
  });

  it("preserves declines across retry and reconnect until a new exact approval", () => {
    authority.recordDecision("pwd", false, state);
    expect(authority.canAutoApproveCommand("pwd", false, state)).toBe(false);
    const restored = new GovernedLocalAuthority(binding, root, settings(), () => now, authority.snapshot());
    expect(restored.canAutoApproveCommand("pwd", false, state)).toBe(false);
    restored.recordDecision("pwd", true, state); restored.recordOutcome("pwd", "succeeded");
    expect(restored.canAutoApproveCommand("pwd", true, state)).toBe(true);
  });

  it.each(["unknown", "pending", "partial", "blocked", "rejected"])("does not silently retry a command with %s outcome", (outcome) => {
    approveBuild(outcome);
    expect(authority.canAutoApproveCommand("npm run build", false, state)).toBe(false);
  });

  it("invalidates the exact decision after manifest/configuration drift", () => {
    approveBuild(); expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(true);
    write("tsconfig.json", '{"compilerOptions":{"strict":true}}');
    expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(false);
    approveBuild(); expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(true);
    manifest({ build: "tsc --noEmit", postbuild: "npm publish" });
    expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(false);
  });

  it("does not automatically repeat an unresolved local read after reconnect", () => {
    expect(authority.canAutoApproveCommand("pwd", false, state)).toBe(true);
    authority.recordOutcome("pwd", "pending");
    expect(authority.canAutoApproveCommand("pwd", false, state)).toBe(false);
    const restored = new GovernedLocalAuthority(binding, root, settings(), () => now, authority.snapshot());
    expect(restored.canAutoApproveCommand("pwd", false, state)).toBe(false);
  });

  it("honors new settings reductions even with an otherwise valid exact command decision", () => {
    approveBuild(); state.settings.actions.executeSafeCommands = false;
    expect(authority.canAutoApproveCommand("npm run build", true, state)).toBe(false);
  });

  it("does not renew quota or expiry on reconnect or accept a different workspace", () => {
    const snapshot = authority.snapshot(20);
    const restored = new GovernedLocalAuthority(binding, root, settings(), () => now, snapshot);
    expect(restored.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
    const other = new GovernedLocalAuthority(binding, directory, settings(), () => now, authority.snapshot());
    expect(other.canAccessPath("readFiles", "project/src/app.ts", { ...state, workspaceRoot: directory })).toBe(false);
    now += 30 * 60_000;
    const expired = new GovernedLocalAuthority(binding, root, settings(), () => now, authority.snapshot());
    expect(expired.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
  });

  it("renews quota only after an explicit user decision and keeps the original permission/scope ceiling", () => {
    state.requests = 20;
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
    expect(authority.resetRequestBudget(false, state)).toBe(false);
    state.requests = 0;
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
    expect(authority.resetRequestBudget(true, state)).toBe(true);
    expect(authority.canAccessPath("readFiles", "src/app.ts", state)).toBe(true);
    state.settings.actions.editFiles = false;
    expect(authority.canAccessPath("editFiles", "src/app.ts", state)).toBe(false);
  });

  it("does not extend expiry or transfer scope when an explicit quota reset is requested", () => {
    const expiry = authority.snapshot().expiresAt;
    state.requests = 20; authority.snapshot(20);
    expect(authority.resetRequestBudget(true, { ...state, binding: { ...binding, commandId: "other" } })).toBe(false);
    now = expiry;
    expect(authority.resetRequestBudget(true, state)).toBe(false);
    expect(authority.snapshot().expiresAt).toBe(expiry);
  });

  it("does not erase an exact command decline when the user renews the request budget", () => {
    authority.recordDecision("pwd", false, state); authority.snapshot(20);
    expect(authority.resetRequestBudget(true, state)).toBe(true);
    expect(authority.canAutoApproveCommand("pwd", false, state)).toBe(false);
  });

  it.each(["invalid-digest", "non-boolean", "invalid-uses", "null-decision", "duplicate-decision"])(
    "fails closed on a restored %s instead of forgetting a command decline", (reason) => {
      authority.recordDecision("pwd", false, state);
      const snapshot = authority.snapshot();
      if (reason === "invalid-digest") snapshot.decisions[0].commandDigest = "invalid";
      if (reason === "non-boolean") (snapshot.decisions[0] as any).approved = "false";
      if (reason === "invalid-uses") snapshot.decisions[0].uses = -1;
      if (reason === "null-decision") snapshot.decisions = [null] as any;
      if (reason === "duplicate-decision") snapshot.decisions.push({
        ...snapshot.decisions[0], approved: true, completed: true, uses: 1,
      });
      const restored = new GovernedLocalAuthority(binding, root, settings(), () => now, snapshot);
      expect(restored.canAutoApproveCommand("pwd", false, state)).toBe(false);
      expect(restored.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
    },
  );

  it("rejects corrupted authority snapshots instead of inheriting fresh ambient settings", () => {
    const corrupt = { ...authority.snapshot(), ceiling: undefined };
    const restored = new GovernedLocalAuthority(binding, root, settings(), () => now, corrupt as any);
    expect(restored.canAccessPath("readFiles", "src/app.ts", state)).toBe(false);
  });
});
