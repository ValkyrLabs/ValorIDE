import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import AdmZip from "adm-zip";

describe("VSIX runtime completeness", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-vsix-audit-"));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function audit(
    files: string[],
    env: NodeJS.ProcessEnv = {},
    entrypoint = path.resolve("scripts/audit-vsix-package.mjs"),
  ) {
    const zip = new AdmZip();
    for (const name of files) zip.addFile(name, Buffer.from("runtime fixture"));
    const archive = path.join(root, "fixture.vsix");
    zip.writeZip(archive);
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [entrypoint, archive], {
        env: { ...process.env, ...env, VALORIDE_VSIX_AUDIT_DIR: root },
        stdio: "pipe",
        timeout: 10000,
      });
    } catch (error) {
      exitCode = (error as { status: number }).status;
    }
    const report = JSON.parse(
      await fs.readFile(path.join(root, "valoride-vsix-audit.json"), "utf8"),
    );
    return { exitCode, report };
  }

  it("refuses a small metadata-only archive that cannot activate", async () => {
    const { exitCode, report } = await audit([
      "extension/package.json",
      "extension/README.md",
    ]);
    expect(exitCode).toBe(1);
    expect(report.ok).toBe(false);
    expect(
      report.missingRuntimeEntries.map((entry: { rule: string }) => entry.rule),
    ).toEqual(["extension_bundle", "webview_bundle"]);
  });

  it("accepts an archive containing both extension and webview runtime bundles", async () => {
    const { exitCode, report } = await audit([
      "extension/package.json",
      "extension/dist/extension.js",
      "extension/dist/webview/assets/index.js",
    ]);
    expect(exitCode).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.missingRuntimeEntries).toEqual([]);
  });

  it("retains source-exclusion checks when runtime bundles are present", async () => {
    const { exitCode, report } = await audit([
      "extension/package.json",
      "extension/dist/extension.js",
      "extension/dist/webview/assets/index.js",
      "extension/src/private.ts",
    ]);
    expect(exitCode).toBe(1);
    expect(report.forbiddenMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "source_tree" }),
      ]),
    );
  });

  describe("existing audit coverage in Jest", () => {
    const runtime = [
      "extension/package.json",
      "extension/dist/extension.js",
      "extension/dist/webview/assets/index.js",
    ];

    it.each(["2026-05-22", "05-22-2026", "05-22-26"])(
      "parses unzip entries with the platform date layout %s",
      (date) => {
        const listing = `Archive: fixture.vsix\n  Length Date Time Name\n  0 ${date} 17:00 extension/dist/\n  2048 ${date} 17:00 extension/dist/extension.js\n  512 ${date} 17:00 extension/package.json\n  2560 2 files\n`;
        const moduleUrl = pathToFileURL(
          path.resolve("scripts/audit-vsix-package.mjs"),
        ).href;
        const parsed = JSON.parse(
          execFileSync(
            process.execPath,
            [
              "--input-type=module",
              "-e",
              `import { parseUnzipListing } from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(parseUnzipListing(${JSON.stringify(listing)})));`,
            ],
            { encoding: "utf8", timeout: 5000 },
          ),
        );
        expect(parsed).toEqual([
          { size: 2048, name: "extension/dist/extension.js" },
          { size: 512, name: "extension/package.json" },
        ]);
      },
    );

    it("counts files and bytes without counting ZIP directories", async () => {
      const { report } = await audit([...runtime, "extension/dist/empty/"]);
      expect(report.fileCount).toBe(3);
      expect(report.totalUncompressedBytes).toBe(
        3 * Buffer.byteLength("runtime fixture"),
      );
    });

    it("enforces archive-size and file-count budgets", async () => {
      const { exitCode, report } = await audit(runtime, {
        VALORIDE_VSIX_MAX_BYTES: "1",
        VALORIDE_VSIX_MAX_FILES: "1",
      });
      expect(exitCode).toBe(1);
      expect(report.failures.join("\n")).toMatch(
        /archive size .* exceeds budget 1/,
      );
      expect(report.failures.join("\n")).toMatch(
        /file count 3 exceeds budget 1/,
      );
    });

    it("blocks the existing source, dependency, lockfile and development-tool leakage paths", async () => {
      const { report } = await audit([
        ...runtime,
        "extension/.worktrees/feature/package.json",
        "extension/src/extension.ts",
        "extension/docs/release-notes.md",
        "extension/webview-ui/src/main.tsx",
        "extension/yarn.lock",
        "extension/tsconfig.json",
        "extension/webview-ui/build/assets/index.js",
        "extension/dist/extension.js.map",
        "extension/node_modules/@esbuild/darwin-arm64/bin/esbuild",
        "extension/node_modules/@swc/core-darwin-arm64/swc.darwin-arm64.node",
      ]);
      expect(report.ok).toBe(false);
      expect(
        report.forbiddenMatches
          .map((entry: { rule: string }) => entry.rule)
          .sort(),
      ).toEqual([
        "dev_config",
        "docs_tree",
        "duplicate_webview_build",
        "native_esbuild_binary",
        "native_swc_binary",
        "node_modules",
        "node_modules",
        "package_lock",
        "source_map",
        "source_tree",
        "webview_source",
        "webview_source",
        "worktrees",
      ]);
    });

    it("allows runtime metadata and assets while refusing other packaged source", async () => {
      const passing = await audit([
        ...runtime,
        "[Content_Types].xml",
        "extension.vsixmanifest",
        "extension/readme.md",
        "extension/LICENSE.txt",
        "extension/assets/icons/icon.png",
        "extension/assets/valorIde.acorn",
      ]);
      expect(passing.report.ok).toBe(true);
      expect(passing.report.unexpectedRuntimeEntries).toEqual([]);
      const failing = await audit([
        ...runtime,
        "extension/CHANGELOG.md",
        "extension/assets/docs/demo.gif",
      ]);
      expect(failing.report.ok).toBe(false);
      expect(
        failing.report.unexpectedRuntimeEntries.map(
          (entry: { path: string }) => entry.path,
        ),
      ).toEqual(["extension/assets/docs/demo.gif", "extension/CHANGELOG.md"]);
    });

    it("writes a truthful Markdown summary of the real archive", async () => {
      await audit(runtime);
      const markdown = await fs.readFile(
        path.join(root, "valoride-vsix-audit.md"),
        "utf8",
      );
      expect(markdown).toContain("Status: PASS");
      expect(markdown).toContain("File count: 3");
      expect(markdown).toContain("extension/dist/extension.js");
    });

    it.each([
      ["symbolic-path", false],
      ["symbolic-path", true],
      ["path with spaces", false],
      ["path with spaces", true],
    ] as const)(
      "CLI %s handles source leakage=%s",
      async (launch, forbiddenSource) => {
        const source = path.resolve("scripts/audit-vsix-package.mjs");
        const target = path.join(root, "audit package.mjs");
        if (launch === "symbolic-path") await fs.symlink(source, target);
        else await fs.copyFile(source, target);
        const { exitCode, report } = await audit(
          [
            ...runtime,
            ...(forbiddenSource ? ["extension/src/private-source.ts"] : []),
          ],
          {},
          target,
        );
        expect(exitCode).toBe(forbiddenSource ? 1 : 0);
        expect(report.ok).toBe(!forbiddenSource);
        expect(report.fileCount).toBe(forbiddenSource ? 4 : 3);
      },
    );
  });
});
