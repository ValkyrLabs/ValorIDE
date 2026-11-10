const { build } = require("esbuild");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const inventory = require("./host-test-inventory.cjs")();
const additional = new Set([
  "src/core/task/ExternalTaskInteraction.test.ts",
  "src/core/task/ToolExecutionEngine.authority.test.ts",
  "src/core/task/ToolExecutionEngine.streaming.test.ts",
  "src/core/task/tools/__tests__/FileToolHandler.acpSafety.test.ts",
  "src/services/vsixPackageAudit.test.ts",
]);
const selected = (file) =>
  file.startsWith("src/integrations/acp/") || additional.has(file);
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `ACP regression tests failed (${result.signal || result.status}).`,
    );
}
(async () => {
  run([
    require.resolve("jest/bin/jest"),
    "--runInBand",
    ...inventory.jest.filter(selected),
  ]);
  const temporary = await fs.mkdtemp(
    path.join(os.tmpdir(), "valoride-acp-tests-"),
  );
  try {
    const tests = inventory.node.filter(selected);
    await build({
      absWorkingDir: root,
      entryPoints: tests,
      outbase: "src",
      outdir: temporary,
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node20",
      logLevel: "warning",
    });
    run([
      "--test",
      ...tests.map((file) =>
        path.join(temporary, file.slice(4).replace(/\.tsx?$/, ".js")),
      ),
    ]);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
