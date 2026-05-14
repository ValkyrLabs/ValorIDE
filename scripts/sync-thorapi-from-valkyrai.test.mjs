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
    assert.equal(report.copied.length, 2);
    assert.ok(
      report.copied.every(({ fileCount }) => fileCount === 6),
      `unexpected copied file counts: ${JSON.stringify(report.copied)}`,
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
