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
    { size: 1, name: 'extension/webview-ui/build/assets/index.js' },
    { size: 1, name: 'extension/dist/extension.js.map' },
    { size: 1, name: 'extension/node_modules/@esbuild/darwin-arm64/bin/esbuild' },
    { size: 1, name: 'extension/node_modules/@swc/core-darwin-arm64/swc.darwin-arm64.node' },
  ], { archiveBytes: 5, maxArchiveBytes: 1000, maxFileCount: 20 });

  assert.equal(report.ok, false);
  assert.deepEqual(report.forbiddenMatches.map((match) => match.rule).sort(), [
    'duplicate_webview_build',
    'native_esbuild_binary',
    'native_swc_binary',
    'node_modules',
    'node_modules',
    'source_map',
    'worktrees',
  ]);
});

test('formatMarkdownReport includes package summary and largest files', () => {
  const report = auditEntries([
    { size: 20, name: 'extension/dist/extension.js' },
    { size: 10, name: 'extension/package.json' },
  ], { archiveBytes: 30, maxArchiveBytes: 1000, maxFileCount: 10 });

  const markdown = formatMarkdownReport(report, 'valoride.vsix');
  assert.match(markdown, /Status: PASS/);
  assert.match(markdown, /File count: 2/);
  assert.match(markdown, /20\textension\/dist\/extension.js/);
});
