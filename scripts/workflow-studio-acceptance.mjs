import { runTests } from "@vscode/test-electron";
import { createServer as createSocketServer } from "node:net";
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
  const developmentRoot = join(isolated, "extension");
  mkdirSync(developmentRoot);
  const userSettings = join(isolated, "profile", "User");
  mkdirSync(userSettings, { recursive: true });
  writeFileSync(
    join(userSettings, "settings.json"),
    JSON.stringify({
      "window.newWindowDimensions": "maximized",
      "workbench.secondarySideBar.defaultVisibility": "hidden",
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
        VITE_basePath: `${baseUrl}/v1`,
      },
    });
  } finally {
    await frontend.close();
  }
}
