import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const writeFixtureFile = async (root, relativePath, contents) => {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
};

test("dry-run report includes source hash, validation, and changed ThorAPI names", async () => {
  const tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "valoride-thorapi-sync-"),
  );
  const sourceRoot = path.join(tempRoot, "thorapi");
  const supportRoot = path.join(tempRoot, "utils");
  const reportPath = path.join(tempRoot, "sync-report.json");

  try {
    await writeFixtureFile(
      sourceRoot,
      "api/AgentService.ts",
      "export const agentService = true;\n",
    );
    await writeFixtureFile(
      sourceRoot,
      "api/MemoryEntryService.ts",
      "export const memoryEntryService = true;\n",
    );
    await writeFixtureFile(
      sourceRoot,
      "model/Agent.ts",
      "export type Agent = { id: string };\n",
    );
    await writeFixtureFile(
      sourceRoot,
      "model/MemoryEntry.ts",
      "export type MemoryEntry = { id: string };\n",
    );
    await writeFixtureFile(
      sourceRoot,
      "redux/AgentForm.tsx",
      "export const AgentForm = () => null;\n",
    );
    await writeFixtureFile(
      sourceRoot,
      "src/runtime.ts",
      "export const Configuration = { basePath: '' };\n",
    );
    await writeFixtureFile(
      supportRoot,
      "authTokenStorage.ts",
      "export const getStoredJwtToken = () => null;\n",
    );
    await writeFixtureFile(
      supportRoot,
      "csrfToken.ts",
      "export const getCsrfToken = () => undefined;\n",
    );

    const result = spawnSync(
      process.execPath,
      [
        "scripts/sync-thorapi-from-valkyrai.mjs",
        "--dry-run",
        "--source",
        sourceRoot,
        "--support-source",
        supportRoot,
        "--report-json",
        reportPath,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    assert.equal(
      result.status,
      0,
      `sync script failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );

    const report = JSON.parse(await fs.readFile(reportPath, "utf8"));

    assert.equal(report.dryRun, true);
    assert.equal(report.source.root, sourceRoot);
    assert.match(report.source.contentHash, /^[a-f0-9]{64}$/);
    assert.ok("revision" in report.source);
    assert.deepEqual(
      report.changed.services.sort(),
      ["AgentService", "MemoryEntryService"].sort(),
    );
    assert.deepEqual(
      report.changed.models.sort(),
      ["Agent", "MemoryEntry"].sort(),
    );
    assert.deepEqual(
      report.validation.requiredFolders.map(({ name, ok }) => ({
        name,
        ok,
      })),
      [
        { name: "api", ok: true },
        { name: "model", ok: true },
        { name: "redux", ok: true },
        { name: "src", ok: true },
      ],
    );
    assert.deepEqual(
      report.validation.supportFiles.map(({ name, ok }) => ({ name, ok })),
      [
        { name: "authTokenStorage.ts", ok: true },
        { name: "csrfToken.ts", ok: true },
      ],
    );
    assert.equal(report.copied.length, 1);
    assert.equal(report.copied[0].target, "webview-ui/src/thorapi");
    assert.ok(
      report.copied.every(({ fileCount }) => fileCount === 6),
      `unexpected copied file counts: ${JSON.stringify(report.copied)}`,
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

const makeIsolatedSync = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-origin-sync-"));
  const source = path.join(root, "upstream", "thorapi");
  const support = path.join(root, "upstream", "utils");
  const localHelpers = new Map();
  await writeFixtureFile(root, "scripts/sync-thorapi-from-valkyrai.mjs",
    await fs.readFile(path.join(repoRoot, "scripts/sync-thorapi-from-valkyrai.mjs"), "utf8"));
  for (const name of ["authTokenStorage.ts", "csrfToken.ts"]) {
    const content = await fs.readFile(path.join(repoRoot, "webview-ui/src/utils", name), "utf8");
    localHelpers.set(name, content);
    await writeFixtureFile(root, "webview-ui/src/utils/" + name, content);
    await writeFixtureFile(support, name, "export const unboundUpstreamHelper = true;\n");
  }
  for (const [file, content] of [
    ["api/Example.ts", "export const revision = 1;\n"],
    ["model/Example.ts", "export type Example = { id: string };\n"],
    ["redux/customBaseQuery.tsx", "// unbound upstream auth transport\nexport const credentials = 'include';\n"],
    ["src/runtime.ts", "export const Configuration = { basePath: '' };\n"],
  ]) await writeFixtureFile(source, file, content);
  await writeFixtureFile(root, "webview-ui/src/thorapi/model/Old.ts", "old generated model\n");
  const run = () => spawnSync(process.execPath, ["scripts/sync-thorapi-from-valkyrai.mjs",
    "--source", source, "--support-source", support, "--report-json", path.join(root, "report.json")],
  { cwd: root, encoding: "utf8" });
  const verifyPolicy = async () => {
    const adapter = await fs.readFile(path.join(root, "webview-ui/src/thorapi/redux/customBaseQuery.tsx"), "utf8");
    assert.match(adapter, /export \{ default \} from "\.\.\/\.\.\/redux\/customBaseQuery"/);
    assert.doesNotMatch(adapter, /unbound upstream|credentials.*include/);
    for (const [name, content] of localHelpers)
      assert.equal(await fs.readFile(path.join(root, "webview-ui/src/utils", name), "utf8"), content);
  };
  return { root, source, run, verifyPolicy };
};

test("real sync retains origin policy through changed generation, late interruption and retry", async () => {
  const fixture = await makeIsolatedSync();
  try {
    let result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    await fixture.verifyPolicy();
    await writeFixtureFile(fixture.source, "api/Example.ts", "export const revision = 2;\n");
    await writeFixtureFile(fixture.source, "redux/customBaseQuery.tsx", "// regenerated unbound upstream\nexport const credentials = 'include';\n");
    result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    await fixture.verifyPolicy();
    assert.equal(await fs.readFile(path.join(fixture.root, "webview-ui/src/thorapi/api/Example.ts"), "utf8"), "export const revision = 2;\n");
    const report = JSON.parse(await fs.readFile(path.join(fixture.root, "report.json"), "utf8"));
    assert.deepEqual(report.support.applicationOwnedFiles.sort(),
      ["webview-ui/src/utils/authTokenStorage.ts", "webview-ui/src/utils/csrfToken.ts"]);
    // Force a later support-copy failure after the generated tree was published.
    await fs.rm(path.join(fixture.root, "src/utils"), { recursive: true, force: true });
    await writeFixtureFile(fixture.root, "src/utils", "interrupted-install fixture\n");
    result = fixture.run();
    assert.notEqual(result.status, 0);
    await fixture.verifyPolicy();
    await fs.rm(path.join(fixture.root, "src/utils"));
    result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    await fixture.verifyPolicy();
  } finally { await fs.rm(fixture.root, { recursive: true, force: true }); }
});

test("missing local origin policy aborts sync before changing generated files", async () => {
  const fixture = await makeIsolatedSync();
  try {
    await fs.rm(path.join(fixture.root, "webview-ui/src/utils/authTokenStorage.ts"));
    const result = fixture.run();
    assert.notEqual(result.status, 0);
    assert.equal(await fs.readFile(path.join(fixture.root, "webview-ui/src/thorapi/model/Old.ts"), "utf8"), "old generated model\n");
    await assert.rejects(fs.stat(path.join(fixture.root, "webview-ui/src/thorapi/redux/customBaseQuery.tsx")));
  } finally { await fs.rm(fixture.root, { recursive: true, force: true }); }
});
