// Real VS Code file-edit acceptance. No ValorIDE activation, network agent, account, or model call.
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { runTests } from "@vscode/test-electron";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = await mkdtemp(
  path.join(
    await realpath(process.platform === "darwin" ? "/tmp" : tmpdir()),
    "vacp-",
  ),
);
try {
  const executable =
    process.env.VSCODE_EXECUTABLE_PATH ||
    (await (async () => {
      const cache = path.join(root, ".vscode-test");
      const entries = await readdir(cache).catch(() => []);
      for (const entry of entries
        .filter((name) => name.startsWith("vscode-"))
        .sort()
        .reverse()) {
        const candidates =
          process.platform === "darwin"
            ? [
                "Visual Studio Code.app/Contents/MacOS/Code",
                "Visual Studio Code.app/Contents/MacOS/Electron",
                "Visual Studio Code - Insiders.app/Contents/MacOS/Code - Insiders",
                "Visual Studio Code - Insiders.app/Contents/MacOS/Electron",
              ]
            : process.platform === "win32"
              ? ["Code.exe"]
              : ["code", "code-insiders"];
        for (const candidate of candidates) {
          const filename = path.join(cache, entry, candidate);
          try {
            await access(filename);
            return filename;
          } catch {
            /* inspect the next cached binary */
          }
        }
      }
      throw new Error(
        "Set VSCODE_EXECUTABLE_PATH to an installed VS Code binary. This acceptance run never downloads VS Code.",
      );
    })());
  const extension = path.join(scratch, "extension"),
    workspace = path.join(scratch, "workspace"),
    profile = path.join(scratch, "profile");
  await mkdir(extension);
  await mkdir(workspace);
  await mkdir(path.join(profile, "User"), { recursive: true });
  await writeFile(path.join(workspace, "main.ts"), "disk baseline\n");
  await writeFile(
    path.join(extension, "package.json"),
    JSON.stringify({
      name: "acp-filesystem-fixture",
      publisher: "valoride-tests",
      version: "1.0.0",
      engines: { vscode: "^1.103.0" },
      activationEvents: ["onStartupFinished"],
      main: "extension.cjs",
    }),
  );
  await build({
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["vscode"],
    target: "node20",
    outfile: path.join(extension, "extension.cjs"),
    stdin: {
      resolveDir: root,
      contents: `import {AcpFileSystem} from "./src/integrations/acp/AcpFileSystem";
export function activate(){return {AcpFileSystem};}`,
    },
  });
  await writeFile(
    path.join(profile, "User", "settings.json"),
    JSON.stringify({
      "telemetry.telemetryLevel": "off",
      "extensions.autoUpdate": false,
      "update.mode": "none",
      "workbench.startupEditor": "none",
      "files.autoSave": "off",
      "git.enabled": false,
    }),
  );
  await runTests({
    vscodeExecutablePath: executable,
    extensionDevelopmentPath: extension,
    extensionTestsPath: path.join(
      root,
      "src",
      "test",
      "acp-filesystem.acceptance.cjs",
    ),
    launchArgs: [
      workspace,
      "--disable-extensions",
      "--disable-workspace-trust",
      "--disable-updates",
      "--skip-welcome",
      "--skip-release-notes",
      "--user-data-dir=" + profile,
      "--extensions-dir=" + path.join(scratch, "extensions"),
    ],
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
