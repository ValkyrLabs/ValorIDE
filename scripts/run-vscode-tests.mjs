import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

let executable =
  process.env.VALORIDE_TEST_VSCODE_EXECUTABLE ||
  (await downloadAndUnzipVSCode(
    process.env.VALORIDE_TEST_VSCODE_VERSION || "stable",
  ));
// Recent macOS distributions name the executable Code; older test-electron
// releases return the legacy Electron path even for these distributions.
if (!existsSync(executable) && process.platform === "darwin") {
  const renamed = join(dirname(executable), "Code");
  if (existsSync(renamed)) executable = renamed;
}
if (!existsSync(executable))
  throw new Error(`VS Code test executable missing: ${executable}`);
const userDataDir = mkdtempSync(join(tmpdir(), "valoride-vscode-tests-"));
console.log(`Isolated VS Code test profile and logs: ${userDataDir}`);
const result = spawnSync(
  process.execPath,
  [
    "node_modules/@vscode/test-cli/out/bin.mjs",
    "--config",
    "vscode-test.config.mjs",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      VALORIDE_TEST_VSCODE_EXECUTABLE: executable,
      VALORIDE_TEST_USER_DATA_DIR: userDataDir,
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
