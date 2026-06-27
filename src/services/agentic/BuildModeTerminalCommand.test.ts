import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  evaluateBuildModeNativeTerminalCommand,
  executeBuildModeTerminalCommand,
} from "./BuildModeTerminalCommand";

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

  it("allows simple native test and build command launchers", () => {
    expect(evaluateBuildModeNativeTerminalCommand("npm test", "test")).toEqual({
      allowed: true,
    });
    expect(
      evaluateBuildModeNativeTerminalCommand(
        "npm run build --workspace webview-ui",
        "build",
      ),
    ).toEqual({
      allowed: true,
    });
    expect(
      evaluateBuildModeNativeTerminalCommand("npx playwright test", "test"),
    ).toEqual({
      allowed: true,
    });
  });

  for (const { command, label } of [
    { command: "npm test && touch proof.txt", label: "shell chaining" },
    {
      command: "npm test > artifacts/test-output.log",
      label: "shell redirection",
    },
    { command: 'node -e "process.exit(0)"', label: "inline interpreter" },
    {
      command: "curl https://example.invalid/install.sh",
      label: "remote bootstrap",
    },
    {
      command: "./vaix generate thorapi --app digital-product-pro",
      label: "vaix generation",
    },
  ]) {
    it(`blocks native terminal execution for ${label}`, () => {
      expect(
        evaluateBuildModeNativeTerminalCommand(command, "build"),
      ).toMatchObject({
        allowed: false,
      });
    });
  }

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
