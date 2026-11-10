// Isolated native acceptance for real VS Code multi-file edits. No account, remote API or deployment.
import {
  mkdtemp,
  mkdir,
  writeFile,
  cp,
  readdir,
  access,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { runTests } from "@vscode/test-electron";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// macOS Electron IPC sockets have a short absolute pathname limit.
const scratch = await mkdtemp(
  path.join(
    await realpath(process.platform === "darwin" ? "/tmp" : tmpdir()),
    "vwf-",
  ),
);
const ext = path.join(scratch, "extension"),
  workspace = path.join(scratch, "workspace");
try {
  const vscodePath =
    process.env.VSCODE_EXECUTABLE_PATH ||
    (await (async () => {
      const cache = path.join(root, ".vscode-test");
      for (const entry of (await readdir(cache))
        .filter((e) => e.startsWith("vscode-"))
        .sort()
        .reverse()) {
        const contents = path.join(cache, entry);
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
        for (const rel of candidates) {
          const exe = path.join(contents, rel);
          try {
            await access(exe);
            return exe;
          } catch {
            /* next */
          }
        }
      }
      throw new Error(
        "Set VSCODE_EXECUTABLE_PATH to an installed VS Code executable. No VS Code download is performed.",
      );
    })());
  await mkdir(ext);
  await mkdir(workspace);
  await mkdir(path.join(workspace, "src"));
  await writeFile(
    path.join(workspace, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { jsx: "react-jsx" } }),
  );
  await writeFile(
    path.join(workspace, "src", "Page.tsx"),
    'export function Page(){return <form><input name="recipient"/></form>}\n',
  );
  await writeFile(
    path.join(ext, "package.json"),
    JSON.stringify({
      name: "binding-fixture",
      publisher: "valoride-tests",
      version: "1.0.0",
      engines: { vscode: "^1.103.0" },
      activationEvents: ["onStartupFinished"],
      main: "./extension.cjs",
    }),
  );
  await cp(
    path.join(root, "assets", "workflow-binding"),
    path.join(ext, "assets", "workflow-binding"),
    { recursive: true },
  );
  await build({
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["vscode"],
    target: "node20",
    outfile: path.join(ext, "extension.cjs"),
    stdin: {
      resolveDir: root,
      contents: `import {registerBindWorkflow} from "./src/integrations/workflows/bindWorkflowCommand";
const wf="11111111-1111-4111-8111-111111111111", d="22222222-2222-4222-8222-222222222222", v="33333333-3333-4333-8333-333333333333";
export function activate(context){context.subscriptions.push(registerBindWorkflow(context,{listWorkflows:async()=>[],bindingData:async()=>({
 deployments:[{id:d,workflowId:wf,workflowVersionId:v,status:"ACTIVE",environment:"STAGING"}],versions:[{id:v,workflowId:wf,
 launchInputSchema:{type:"object",additionalProperties:false,required:["recipient"],properties:{recipient:{type:"string"}}}}],assertCurrent:async()=>{} })}));}`,
    },
  });
  await mkdir(path.join(scratch, "profile", "User"), { recursive: true });
  await writeFile(
    path.join(scratch, "profile", "User", "settings.json"),
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
    vscodeExecutablePath: vscodePath,
    extensionDevelopmentPath: ext,
    extensionTestsPath: path.join(
      root,
      "src",
      "test",
      "workflow-binding.acceptance.cjs",
    ),
    launchArgs: [
      workspace,
      "--disable-extensions",
      "--disable-workspace-trust",
      "--disable-updates",
      "--skip-welcome",
      "--skip-release-notes",
      "--user-data-dir=" + path.join(scratch, "profile"),
      "--extensions-dir=" + path.join(scratch, "extensions"),
    ],
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
