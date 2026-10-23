import { defineConfig } from "@vscode/test-cli";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tests = require("./scripts/host-test-inventory.cjs")();

export default defineConfig({
  files: tests.mocha.map((file) => resolve(root, file)),
  extensionDevelopmentPath: root,
  version: "stable",
  ...(process.env.VALORIDE_TEST_VSCODE_EXECUTABLE
    ? {
        useInstallation: {
          fromPath: process.env.VALORIDE_TEST_VSCODE_EXECUTABLE,
        },
      }
    : {}),
  launchArgs: [
    "--disable-extensions",
    "--skip-welcome",
    "--skip-release-notes",
    ...(process.env.VALORIDE_TEST_USER_DATA_DIR
      ? [
          `--user-data-dir=${process.env.VALORIDE_TEST_USER_DATA_DIR}`,
          `--extensions-dir=${resolve(process.env.VALORIDE_TEST_USER_DATA_DIR, "extensions")}`,
        ]
      : []),
  ],
  mocha: {
    ui: "bdd",
    timeout: 20000,
    require: resolve(root, "scripts/register-vscode-tests.cjs"),
  },
});
