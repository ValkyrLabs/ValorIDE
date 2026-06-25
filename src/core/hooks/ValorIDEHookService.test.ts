import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ValorIDEHookService } from "./ValorIDEHookService";

describe("ValorIDEHookService", () => {
  const createWorkspace = () => mkdtempSync(join(tmpdir(), "valoride-hooks-"));

  it("discovers Cline-compatible workspace hook scripts", () => {
    const workspace = createWorkspace();
    const hooksDir = join(workspace, ".clinerules", "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, "PreToolUse.js"), "process.exit(0)");
    writeFileSync(join(hooksDir, "NotAHook.js"), "process.exit(0)");

    const service = new ValorIDEHookService({
      cwd: workspace,
      taskId: "task-1",
      enabled: true,
    });

    expect(service.findHookScripts("PreToolUse")).toEqual([
      join(hooksDir, "PreToolUse.js"),
    ]);
  });

  it("parses HOOK_CONTROL output from PreToolUse hooks", async () => {
    const workspace = createWorkspace();
    const hooksDir = join(workspace, ".valoride", "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(
      join(hooksDir, "PreToolUse.js"),
      [
        "let body = '';",
        "process.stdin.on('data', chunk => body += chunk);",
        "process.stdin.on('end', () => {",
        "  const payload = JSON.parse(body);",
        "  console.log('HOOK_CONTROL\\t' + JSON.stringify({",
        "    context: `checked ${payload.preToolUse.toolName}`,",
        "    overrideInput: { path: 'README.md' }",
        "  }));",
        "});",
      ].join("\n"),
    );

    const service = new ValorIDEHookService({
      cwd: workspace,
      taskId: "task-1",
      enabled: true,
    });

    await expect(
      service.runPreToolUse("read_file", { path: "old.md" }),
    ).resolves.toEqual({
      context: "checked read_file",
      overrideInput: { path: "README.md" },
    });
  });

  it("turns non-zero hook exits into context instead of throwing", async () => {
    const workspace = createWorkspace();
    const hooksDir = join(workspace, ".valoride", "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(
      join(hooksDir, "PostToolUse.js"),
      "console.error('policy failed'); process.exit(2);",
    );

    const service = new ValorIDEHookService({
      cwd: workspace,
      taskId: "task-1",
      enabled: true,
    });

    const result = await service.runPostToolUse({
      toolName: "read_file",
      parameters: { path: "README.md" },
      result: "ok",
      success: true,
      executionTimeMs: 12,
    });

    expect(result?.context).toContain("PostToolUse exited non-zero");
    expect(result?.context).toContain("policy failed");
  });
});
