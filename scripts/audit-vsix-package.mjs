#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULT_MAX_ARCHIVE_BYTES = 95 * 1024 * 1024;
const DEFAULT_MAX_FILE_COUNT = 15000;

const FORBIDDEN_RULES = [
  { id: 'worktrees', pattern: /(^|\/)\.worktrees(\/|$)/, message: 'workspace worktrees must never ship in the VSIX' },
  { id: 'node_modules', pattern: /(^|\/)node_modules(\/|$)/, message: 'dependency trees must be bundled into dist, not packaged raw' },
  { id: 'source_map', pattern: /\.map$/i, message: 'source maps are dev-only and bloat marketplace uploads' },
  { id: 'duplicate_webview_build', pattern: /(^|\/)webview-ui\/build(\/|$)/, message: 'webview build output should ship only from dist/webview' },
  { id: 'native_swc_binary', pattern: /(^|\/)@swc\/core-[^/]+(\/|$)/, message: 'native SWC binaries are development tooling, not runtime extension assets' },
  { id: 'native_esbuild_binary', pattern: /(^|\/)@esbuild\/[^/]+(\/|$)/, message: 'native esbuild binaries are development tooling, not runtime extension assets' },
  { id: 'vsix_inside_vsix', pattern: /\.vsix$/i, message: 'previous VSIX artifacts must never be nested in a release package' },
];

export function parseUnzipListing(listing) {
  const entries = [];
  for (const line of listing.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+(.+?)\s*$/);
    if (!match) continue;
    const size = Number(match[1]);
    const name = match[2];
    if (!name || name.endsWith('/')) continue;
    entries.push({ size, name });
  }
  return entries;
}

export function auditEntries(entries, options = {}) {
  const maxArchiveBytes = Number(options.maxArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES);
  const maxFileCount = Number(options.maxFileCount ?? DEFAULT_MAX_FILE_COUNT);
  const archiveBytes = Number(options.archiveBytes ?? 0);
  const totalUncompressedBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const forbiddenMatches = [];

  for (const entry of entries) {
    for (const rule of FORBIDDEN_RULES) {
      if (rule.pattern.test(entry.name)) {
        forbiddenMatches.push({ rule: rule.id, message: rule.message, path: entry.name, size: entry.size });
      }
    }
  }

  const failures = [];
  if (archiveBytes > maxArchiveBytes) {
    failures.push(`archive size ${archiveBytes} exceeds budget ${maxArchiveBytes}`);
  }
  if (entries.length > maxFileCount) {
    failures.push(`file count ${entries.length} exceeds budget ${maxFileCount}`);
  }
  if (forbiddenMatches.length > 0) {
    failures.push(`${forbiddenMatches.length} forbidden package entries detected`);
  }

  return {
    ok: failures.length === 0,
    budgets: { maxArchiveBytes, maxFileCount },
    archiveBytes,
    totalUncompressedBytes,
    fileCount: entries.length,
    failures,
    forbiddenMatches,
    largestFiles: [...entries].sort((a, b) => b.size - a.size).slice(0, 50),
  };
}

export function formatMarkdownReport(report, vsixPath = 'unknown') {
  const lines = [
    '# ValorIDE VSIX package audit',
    '',
    `VSIX: ${vsixPath}`,
    `Status: ${report.ok ? 'PASS' : 'FAIL'}`,
    `Archive bytes: ${report.archiveBytes}`,
    `Uncompressed bytes: ${report.totalUncompressedBytes}`,
    `File count: ${report.fileCount}`,
    `Budgets: ${report.budgets.maxArchiveBytes} bytes, ${report.budgets.maxFileCount} files`,
    '',
    '## Failures',
    ...(report.failures.length ? report.failures.map((failure) => `- ${failure}`) : ['- none']),
    '',
    '## Forbidden entries',
    ...(report.forbiddenMatches.length
      ? report.forbiddenMatches.slice(0, 100).map((entry) => `- ${entry.rule}: ${entry.path} (${entry.size} bytes)`)
      : ['- none']),
    '',
    '## Largest files',
    ...report.largestFiles.map((entry) => `- ${entry.size}\t${entry.name}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function findNewestVsix(cwd) {
  const candidates = fs.readdirSync(cwd)
    .filter((file) => file.endsWith('.vsix'))
    .map((file) => ({ file: path.join(cwd, file), mtimeMs: fs.statSync(path.join(cwd, file)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.file;
}

function readEntriesFromVsix(vsixPath) {
  const listing = execFileSync('unzip', ['-l', vsixPath], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return parseUnzipListing(listing);
}

function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const vsixPath = args.find((arg) => arg.endsWith('.vsix')) ?? findNewestVsix(process.cwd());
  if (!vsixPath) {
    console.error('No .vsix path supplied and no .vsix found in the current directory.');
    process.exit(2);
  }

  const resolvedVsix = path.resolve(vsixPath);
  const entries = readEntriesFromVsix(resolvedVsix);
  const report = auditEntries(entries, {
    archiveBytes: fs.statSync(resolvedVsix).size,
    maxArchiveBytes: process.env.VALORIDE_VSIX_MAX_BYTES,
    maxFileCount: process.env.VALORIDE_VSIX_MAX_FILES,
  });

  const outDir = path.resolve(process.env.VALORIDE_VSIX_AUDIT_DIR || 'artifacts/vsix-audit');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'valoride-vsix-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'valoride-vsix-audit.md'), formatMarkdownReport(report, resolvedVsix));

  console.log(`ValorIDE VSIX audit ${report.ok ? 'PASS' : 'FAIL'}: ${report.archiveBytes} bytes, ${report.fileCount} files`);
  console.log(`Report: ${path.join(outDir, 'valoride-vsix-audit.json')}`);
  if (!report.ok) {
    for (const failure of report.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
