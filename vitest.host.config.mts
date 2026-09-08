import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const inventory = require("./scripts/host-test-inventory.cjs")();

export default defineConfig({
  test: {
    include: inventory.vitest,
    environment: "node",
  },
  resolve: {
    alias: [
      { find: "vscode", replacement: resolve("__mocks__/vscode.vitest.ts") },
      {
        find: "@thorapi/model",
        replacement: resolve("webview-ui/src/thorapi/model"),
      },
      { find: "@thorapi/services", replacement: resolve("src/services") },
      { find: "@thorapi", replacement: resolve("webview-ui/src") },
      { find: "@utils", replacement: resolve("src/utils") },
      { find: "@services", replacement: resolve("src/services") },
      { find: "@shared", replacement: resolve("src/shared") },
      { find: "@core", replacement: resolve("src/core") },
      { find: "@api", replacement: resolve("src/api") },
      { find: "@integrations", replacement: resolve("src/integrations") },
    ],
  },
});
