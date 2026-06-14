import { auditEntries, parseUnzipListing } from "./vsixPackageAudit";

describe("vsixPackageAudit", () => {
  it("rejects accidental workspace, dependency, source map, and nested build artifacts", () => {
    const audit = auditEntries([
      "extension/dist/extension.js",
      "extension/.worktrees/feature-llm-prompt-refresh/package.json",
      "extension/webview-ui/build/assets/index.js",
      "extension/packages/valor-cli/dist/index.js",
      "extension/node_modules/@swc/core-darwin-arm64/swc.darwin-arm64.node",
      "extension/dist/extension.js.map",
    ]);

    expect(audit.ok).toBe(false);
    expect(audit.blockedEntries).toEqual([
      "extension/.worktrees/feature-llm-prompt-refresh/package.json",
      "extension/webview-ui/build/assets/index.js",
      "extension/packages/valor-cli/dist/index.js",
      "extension/node_modules/@swc/core-darwin-arm64/swc.darwin-arm64.node",
      "extension/dist/extension.js.map",
    ]);
  });

  it("fails release budgets before a bloated VSIX reaches publication", () => {
    const audit = auditEntries(
      [
        { path: "extension/dist/extension.js", bytes: 50 },
        { path: "extension/dist/webview/assets/index.js", bytes: 75 },
      ],
      { maxBytes: 100, maxFiles: 1 },
    );

    expect(audit.ok).toBe(false);
    expect(audit.failures).toContain("package size 125 exceeds budget 100");
    expect(audit.failures).toContain("package file count 2 exceeds budget 1");
  });

  it("parses unzip listings into package entries", () => {
    const entries = parseUnzipListing(`
Archive:  valoride-dev.vsix
  Length      Date    Time    Name
---------  ---------- -----   ----
     4096  06-14-2026 15:44   extension/dist/extension.js
      512  06-14-2026 15:44   extension/package.json
---------                     -------
`);

    expect(entries).toEqual([
      { bytes: 4096, path: "extension/dist/extension.js" },
      { bytes: 512, path: "extension/package.json" },
    ]);
  });
});
