import assert from 'node:assert/strict';
import test from 'node:test';
import { auditEntries, formatMarkdownReport, parseUnzipListing } from './audit-vsix-package.mjs';

test('parseUnzipListing extracts file entries and skips directories/totals', () => {
  const listing = `Archive:  valoride.vsix
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  05-22-2026 17:00   extension/dist/
     2048  05-22-2026 17:00   extension/dist/extension.js
      512  05-22-2026 17:00   extension/package.json
---------                     -------
     2560                     2 files`;

  assert.deepEqual(parseUnzipListing(listing), [
    { size: 2048, name: 'extension/dist/extension.js' },
    { size: 512, name: 'extension/package.json' },
  ]);
});

test('auditEntries fails packages that exceed budgets', () => {
  const report = auditEntries([
    { size: 400, name: 'extension/dist/extension.js' },
    { size: 400, name: 'extension/dist/webview/assets/index.js' },
  ], { archiveBytes: 1200, maxArchiveBytes: 1000, maxFileCount: 1 });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /archive size 1200 exceeds budget 1000/);
  assert.match(report.failures.join('\n'), /file count 2 exceeds budget 1/);
});

test('auditEntries blocks known VSIX bloat sources', () => {
  const report = auditEntries([
    { size: 1, name: 'extension/.worktrees/feature/package.json' },
    { size: 1, name: 'extension/src/extension.ts' },
    { size: 1, name: 'extension/docs/release-notes.md' },
    { size: 1, name: 'extension/webview-ui/src/main.tsx' },
    { size: 1, name: 'extension/yarn.lock' },
    { size: 1, name: 'extension/tsconfig.json' },
    { size: 1, name: 'extension/webview-ui/build/assets/index.js' },
    { size: 1, name: 'extension/dist/extension.js.map' },
    { size: 1, name: 'extension/node_modules/@esbuild/darwin-arm64/bin/esbuild' },
    { size: 1, name: 'extension/node_modules/@swc/core-darwin-arm64/swc.darwin-arm64.node' },
  ], { archiveBytes: 10, maxArchiveBytes: 1000, maxFileCount: 20 });

  assert.equal(report.ok, false);
  assert.deepEqual(report.forbiddenMatches.map((match) => match.rule).sort(), [
    'dev_config',
    'docs_tree',
    'duplicate_webview_build',
    'native_esbuild_binary',
    'native_swc_binary',
    'node_modules',
    'node_modules',
    'package_lock',
    'source_map',
    'source_tree',
    'webview_source',
    'webview_source',
    'worktrees',
  ]);
});

test('auditEntries enforces the runtime package allowlist', () => {
  const passing = auditEntries([
    { size: 10, name: '[Content_Types].xml' },
    { size: 10, name: 'extension.vsixmanifest' },
    { size: 20, name: 'extension/package.json' },
    { size: 20, name: 'extension/README.md' },
    { size: 20, name: 'extension/LICENSE' },
    { size: 200, name: 'extension/dist/extension.js' },
    { size: 200, name: 'extension/dist/webview/assets/index.js' },
    { size: 50, name: 'extension/assets/icons/icon.png' },
    { size: 50, name: 'extension/assets/valorIde.acorn' },
  ], { archiveBytes: 550, maxArchiveBytes: 1000, maxFileCount: 20 });

  assert.equal(passing.ok, true);
  assert.deepEqual(passing.unexpectedRuntimeEntries, []);

  const failing = auditEntries([
    { size: 10, name: 'extension/CHANGELOG.md' },
    { size: 10, name: 'extension/assets/docs/demo.gif' },
  ], { archiveBytes: 20, maxArchiveBytes: 1000, maxFileCount: 20 });

  assert.equal(failing.ok, false);
  assert.match(failing.failures.join('\n'), /entries outside the runtime package allowlist/);
  assert.deepEqual(failing.unexpectedRuntimeEntries.map((entry) => entry.path), [
    'extension/CHANGELOG.md',
    'extension/assets/docs/demo.gif',
  ]);
});

test('auditEntries fails packages missing required runtime bundles', () => {
  const report = auditEntries([
    { size: 10, name: '[Content_Types].xml' },
    { size: 10, name: 'extension.vsixmanifest' },
    { size: 20, name: 'extension/package.json' },
    { size: 20, name: 'extension/README.md' },
  ], { archiveBytes: 60, maxArchiveBytes: 1000, maxFileCount: 20 });

  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), /required runtime entries missing/);
  assert.deepEqual(report.missingRuntimeEntries.map((entry) => entry.rule), [
    'extension_bundle',
    'webview_bundle',
  ]);
});

test('formatMarkdownReport includes package summary and largest files', () => {
  const report = auditEntries([
    { size: 20, name: 'extension/dist/extension.js' },
    { size: 10, name: 'extension/package.json' },
    { size: 10, name: 'extension/dist/webview/assets/index.js' },
  ], { archiveBytes: 30, maxArchiveBytes: 1000, maxFileCount: 10 });

  const markdown = formatMarkdownReport(report, 'valoride.vsix');
  assert.match(markdown, /Status: PASS/);
  assert.match(markdown, /File count: 3/);
  assert.match(markdown, /20\textension\/dist\/extension.js/);
});
