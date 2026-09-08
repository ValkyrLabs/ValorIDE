const { build } = require("esbuild");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const tests = require("./host-test-inventory.cjs")().node;
const root = path.resolve(__dirname, "..");

(async () => {
  await build({
    absWorkingDir: root,
    entryPoints: tests,
    outbase: "src",
    outdir: "out/node-host-tests",
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    sourcemap: "inline",
  });
  const files = tests.map((file) =>
    path.join(
      root,
      "out/node-host-tests",
      file.slice(4).replace(/\.tsx?$/, ".js"),
    ),
  );
  const result = spawnSync(process.execPath, ["--test", ...files], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
