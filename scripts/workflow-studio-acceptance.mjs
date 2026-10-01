import { runTests } from "@vscode/test-electron";
import { createServer as createSocketServer } from "node:net";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const freePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createSocketServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });

export async function run() {
  const [runtimeUrl, reportFile, evidenceDir, frontendDir, frontendUrl] =
    process.argv.slice(3);
  if (
    !runtimeUrl ||
    !reportFile ||
    !evidenceDir ||
    !frontendDir ||
    !frontendUrl ||
    !process.env.VALKYR_ACCEPTANCE_PASSWORD
  ) {
    throw new Error(
      "Usage: run-vscode-tests.mjs --workflow-studio BASE_URL REPORT EVIDENCE FRONTEND_DIR FRONTEND_URL (local acceptance password in environment)",
    );
  }
  for (const value of [runtimeUrl, frontendUrl]) {
    const url = new URL(value);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.protocol !== "http:"
    )
      throw new Error("Native acceptance requires loopback URLs");
  }
  // Cookies must use the frontend's same local hostname across the redirect.
  const backend = new URL(runtimeUrl);
  backend.hostname = new URL(frontendUrl).hostname;
  const baseUrl = backend.origin;
  const executable = process.env.VALORIDE_TEST_VSCODE_EXECUTABLE;
  if (!executable || !existsSync(executable))
    throw new Error(
      "Set VALORIDE_TEST_VSCODE_EXECUTABLE to the installed VS Code executable",
    );
  if (
    !existsSync(join(root, "dist/extension.js")) ||
    !existsSync(join(root, "dist/webview/index.html"))
  ) {
    throw new Error(
      "Build the current extension and webview before native acceptance",
    );
  }
  mkdirSync(evidenceDir, { recursive: true });
  // macOS Unix-domain sockets have a short path limit; VS Code appends its socket name.
  const isolated = mkdtempSync(join(tmpdir(), "vai-"));
  const engineeringModel = process.env.VALORIDE_ACCEPTANCE_ENGINEERING_MODEL?.trim();
  const engineeringUrl = process.env.VALORIDE_ACCEPTANCE_ENGINEERING_URL?.trim();
  if (Boolean(engineeringModel) !== Boolean(engineeringUrl))
    throw new Error("Native engineering requires both a local model and URL; no fixture inference fallback");
  let engineeringWorkspace;
  if (engineeringModel) {
    const modelUrl = new URL(engineeringUrl);
    if (modelUrl.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(modelUrl.hostname)
      || modelUrl.username || modelUrl.password || modelUrl.pathname !== "/")
      throw new Error("Native engineering LM Studio URL must be a loopback HTTP origin without credentials or /v1");
    const modelsResponse = await fetch(new URL("/v1/models", modelUrl), { signal: AbortSignal.timeout(15_000) });
    const models = await modelsResponse.json();
    if (!modelsResponse.ok || !models.data?.some(model => model.id === engineeringModel))
      throw new Error("The exact native engineering model is unavailable locally");
    engineeringWorkspace = join(isolated, "engineering-workspace");
    mkdirSync(engineeringWorkspace);
    writeFileSync(join(engineeringWorkspace, "quote-total.cjs"),
      "exports.totalCents = (items) => items.reduce((sum, item) => sum + item.unitCents, 0);\n");
    const testSource = `const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { totalCents } = require('./quote-total.cjs');
test('quote totals include every item quantity in integer cents', () => {
  assert.equal(totalCents([{ unitCents: 1250, quantity: 3 }, { unitCents: 99, quantity: 2 }]), 3948);
  assert.equal(totalCents([{ unitCents: 1250, quantity: 0 }]), 0);
  assert.equal(totalCents([]), 0);
  const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'quote-total.cjs'))).digest('hex');
  fs.writeFileSync(path.join(__dirname, 'test-result.json'), JSON.stringify({schemaVersion:'native-engineering-test/1', sourceSha256, assertions:3, status:'passed'}, null, 2));
});
`;
    writeFileSync(join(engineeringWorkspace, "quote-total.test.cjs"), testSource);
    const red = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "quote-total.test.cjs"], {
      cwd: engineeringWorkspace, encoding: "utf8", timeout: 30_000,
    });
    writeFileSync(join(evidenceDir, "engineering-red.txt"), red.stdout + red.stderr, { mode: 0o600 });
    if (red.status !== 1 || !red.stdout.includes("not ok") || !red.stdout.includes("ERR_ASSERTION")
      || existsSync(join(engineeringWorkspace, "test-result.json")))
      throw new Error("Native engineering fixture did not establish its actual failing test");
    writeFileSync(join(evidenceDir, "engineering-fixture.json"), JSON.stringify({
      workspace: engineeringWorkspace, providerBoundary: "live-local-model", model: engineeringModel,
      originalSourceSha256: createHash("sha256").update(readFileSync(join(engineeringWorkspace, "quote-total.cjs"))).digest("hex"),
      testSourceSha256: createHash("sha256").update(testSource).digest("hex"), redExitCode: red.status,
    }, null, 2), { mode: 0o600 });
  }
  const developmentRoot = join(isolated, "extension");
  mkdirSync(developmentRoot);
  const userSettings = join(isolated, "profile", "User");
  mkdirSync(userSettings, { recursive: true });
  writeFileSync(
    join(userSettings, "settings.json"),
    JSON.stringify({
      "window.newWindowDimensions": "maximized",
      "workbench.secondarySideBar.defaultVisibility": "hidden",
      ...(engineeringWorkspace ? { "security.workspace.trust.enabled": false,
        "valoride.enableCheckpoints": true } : {}),
    }),
  );
  // Run the existing built extension with a test-only authentication bootstrap.
  // VS Code supplies real SecretStorage in an isolated profile; no token enters HTML.
  for (const name of readdirSync(root)) {
    if (![".git", "package.json"].includes(name))
      symlinkSync(join(root, name), join(developmentRoot, name));
  }
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  manifest.main = "./src/test/workflow-studio-bootstrap.cjs";
  writeFileSync(
    join(developmentRoot, "package.json"),
    JSON.stringify(manifest),
  );
  const { createServer } = await import(
    pathToFileURL(join(frontendDir, "node_modules/vite/dist/node/index.js"))
  );
  const proxy = {
    target: runtimeUrl,
    changeOrigin: true,
    configure(instance) {
      instance.on("proxyReq", (request) => request.removeHeader("origin"));
    },
  };
  const frontend = await createServer({
    root: frontendDir,
    configFile: join(frontendDir, "vite.config.ts"),
    define: {
      "import.meta.env.VITE_basePath": JSON.stringify(`${baseUrl}/v1`),
      "import.meta.env.VITE_wssBasePath": JSON.stringify(
        new URL("/ws", baseUrl).toString().replace(/^http/, "ws"),
      ),
    },
    server: {
      host: "localhost",
      port: Number(new URL(frontendUrl).port),
      strictPort: true,
      proxy: {
        "/v1": proxy,
        "/oauth2": proxy,
        "/login/oauth2": proxy,
        "/actuator": proxy,
      },
    },
  });
  const debugPort = await freePort();
  try {
    await frontend.listen();
    writeFileSync(
      join(evidenceDir, "native-environment.json"),
      JSON.stringify(
        { isolated, executable, frontendUrl, preauthenticated: true },
        null,
        2,
      ),
    );
    await runTests({
      vscodeExecutablePath: executable,
      extensionDevelopmentPath: developmentRoot,
      extensionTestsPath: join(root, "src/test/workflow-studio.acceptance.cjs"),
      launchArgs: [
        ...(engineeringWorkspace ? [engineeringWorkspace] : []),
        "--disable-extensions",
        "--skip-welcome",
        "--skip-release-notes",
        "--disable-telemetry",
        `--user-data-dir=${join(isolated, "profile")}`,
        `--extensions-dir=${join(isolated, "extensions")}`,
        `--remote-debugging-port=${debugPort}`,
      ],
      extensionTestsEnv: {
        VALKYR_ACCEPTANCE_PASSWORD: process.env.VALKYR_ACCEPTANCE_PASSWORD,
        VALORIDE_NATIVE_BASE_URL: baseUrl,
        VALORIDE_NATIVE_REPORT: reportFile,
        VALORIDE_NATIVE_EVIDENCE: evidenceDir,
        VALORIDE_NATIVE_FRONTEND_URL: frontendUrl,
        VALORIDE_NATIVE_DEBUG_PORT: String(debugPort),
        VALORIDE_NATIVE_BUNDLE: join(root, "dist/extension.js"),
        ...(process.env.VALKYR_ACCEPTANCE_BUSINESS_MODEL ? {
          VALKYR_ACCEPTANCE_BUSINESS_MODEL: process.env.VALKYR_ACCEPTANCE_BUSINESS_MODEL,
          VALKYR_ACCEPTANCE_BUSINESS_MODEL_URL: process.env.VALKYR_ACCEPTANCE_BUSINESS_MODEL_URL,
        } : {}),
        ...(engineeringWorkspace ? {
          VALORIDE_ACCEPTANCE_ENGINEERING_MODEL: engineeringModel,
          VALORIDE_ACCEPTANCE_ENGINEERING_URL: engineeringUrl,
          VALORIDE_NATIVE_ENGINEERING_WORKSPACE: engineeringWorkspace,
        } : {}),
        VITE_basePath: `${baseUrl}/v1`,
      },
    });
    // Prove the native engineering component before the independent browser
    // workbook journey. Both are still mandatory for the combined result.
    const browserProof = process.env.VALORIDE_TEST_BROWSER_EXECUTABLE
      ? await (await import("./workflow-studio-browser-acceptance.mjs")).runBrowserJourney({
          executablePath: process.env.VALORIDE_TEST_BROWSER_EXECUTABLE,
          frontendUrl, baseUrl, report: JSON.parse(readFileSync(reportFile, "utf8")),
          evidenceDir, password: process.env.VALKYR_ACCEPTANCE_PASSWORD,
        })
      : null;
    if (browserProof) {
      const file = join(evidenceDir, "verification.json");
      const verified = JSON.parse(readFileSync(file, "utf8"));
      verified.browserStudio = browserProof;
      writeFileSync(file, JSON.stringify(verified, null, 2));
    }
  } finally {
    await frontend.close();
  }
}
