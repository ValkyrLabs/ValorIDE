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
});
