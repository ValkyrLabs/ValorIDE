import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const readText = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("ValorIDE keeps generated ThorAPI in the webview only", () => {
  assert.equal(
    fs.existsSync(path.join(repoRoot, "src", "thorapi")),
    false,
    "generated ThorAPI clients should live only in webview-ui/src/thorapi",
  );

  const tsconfig = JSON.parse(readText("tsconfig.json"));
  const paths = tsconfig.compilerOptions?.paths ?? {};
  for (const [alias, targets] of Object.entries(paths)) {
    assert.equal(
      targets.some(
        (target) => target === "src/thorapi" || target.startsWith("src/thorapi/"),
      ),
      false,
      `${alias} should not resolve to root src/thorapi`,
    );
  }

  assert.doesNotMatch(
    readText("eslint.config.mjs"),
    /src\/thorapi/,
    "eslint should not carry an ignore for a removed generated folder",
  );

  assert.doesNotMatch(
    readText("scripts/sync-thorapi-from-valkyrai.mjs"),
    /path\.join\(repoRoot,\s*"src",\s*"thorapi"\)/,
    "sync script must not recreate root src/thorapi",
  );

  const viteConfig = readText("webview-ui/vite.config.ts");
  assert.doesNotMatch(
    viteConfig,
    /ValkyrAI\/web\/typescript\/valkyr_labs_com\/src\/thorapi/,
    "webview aliases must not point at the removed ValkyrAI external thorapi path",
  );

  const expectedThorapiAliases = new Map([
    ["@thorapi/model", "./src/thorapi/model"],
    ["@thorapi/src", "./src/thorapi/src"],
    ["@thorapi/redux", "./src/thorapi/redux"],
    ["@thorapi/api", "./src/thorapi/api"],
  ]);

  for (const [alias, target] of expectedThorapiAliases) {
    assert.match(
      viteConfig,
      new RegExp(`find: "${alias}"`),
      `${alias} should be declared in webview-ui/vite.config.ts`,
    );
    assert.match(
      viteConfig,
      new RegExp(`replacement: resolve\\(__dirname, "${target}"\\)`),
      `${alias} should resolve to ${target}`,
    );
  }
});

test("account credits use the webview RTK Query client boundary", () => {
  const forbiddenCreditBridgeTokens = [
    "fetchUserCreditsData",
    "userCreditsBalance",
    "userCreditsUsage",
    "userCreditsPayments",
    "requestBalanceRefresh",
  ];

  const files = [
    "src/shared/ExtensionMessage.tsx",
    "src/shared/WebviewMessage.ts",
    "src/core/controller/index.ts",
    "src/services/account/ValorIDEAccountService.ts",
    "webview-ui/src/context/ExtensionStateContext.tsx",
    "webview-ui/src/components/account/AccountView.tsx",
  ];

  for (const file of files) {
    const text = readText(file);
    for (const token of forbiddenCreditBridgeTokens) {
      assert.doesNotMatch(
        text,
        new RegExp(`\\b${token}\\b`),
        `${file} must not reintroduce the extension-host credit bridge; use webview-ui/src/services/creditsApi.ts RTK Query endpoints instead`,
      );
    }
  }

  assert.match(
    readText("webview-ui/src/components/account/AccountView.tsx"),
    /useGetAccountBalanceQuery as useGetCreditAccountBalanceQuery/,
    "AccountView should read account credits through the creditsApi RTK Query hook",
  );
});
