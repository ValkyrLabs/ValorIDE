import fs from "fs/promises";
import os from "os";
import path from "path";
import { executeBuildModeTerminalCommand } from "./BuildModeTerminalCommand";

describe("BuildModeTerminalCommand", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-terminal-command-"),
    );
  });

  afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it("executes shell commands in the scoped workspace", async () => {
    const result = await executeBuildModeTerminalCommand({
      command:
        "printf ok > terminal-proof.txt && pwd",
      workspaceRoot,
    });

    expect(result).toMatchObject({
      completed: true,
      exitCode: 0,
      timedOut: false,
    });
    await expect(fs.realpath(result.stdout?.trim() ?? "")).resolves.toBe(
      await fs.realpath(workspaceRoot),
    );
    await expect(
      fs.readFile(path.join(workspaceRoot, "terminal-proof.txt"), "utf8"),
    ).resolves.toBe("ok");
  });

  it("captures failed command output without throwing", async () => {
    const result = await executeBuildModeTerminalCommand({
      command: "node -e \"process.stderr.write('failed'); process.exit(7)\"",
      workspaceRoot,
    });

    expect(result).toMatchObject({
      completed: true,
      exitCode: 7,
      stderr: "failed",
      timedOut: false,
    });
  });
});
