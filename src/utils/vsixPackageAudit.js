const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DEFAULT_BUDGET = Object.freeze({
  maxBytes: 75 * 1024 * 1024,
  maxFiles: 8000,
});

const BLOCKED_PATH_PATTERNS = [
  /(^|\/)\.worktrees(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)webview-ui\/build(\/|$)/,
  /(^|\/)packages\/[^/]+\/dist(\/|$)/,
  /\.map$/i,
  /\.vsix$/i,
];

function normalizeEntry(entry) {
  if (typeof entry === "string") {
    return { path: entry, bytes: 0 };
  }

  return {
    path: String(entry.path || ""),
    bytes: Number.isFinite(entry.bytes) ? entry.bytes : 0,
  };
}

function auditEntries(entries, budget = DEFAULT_BUDGET) {
  const normalizedEntries = entries.map(normalizeEntry).filter((entry) => entry.path);
  const totalBytes = normalizedEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  const blockedEntries = normalizedEntries
    .filter((entry) => BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(entry.path)))
    .map((entry) => entry.path);
  const oversized = totalBytes > budget.maxBytes;
  const tooManyFiles = normalizedEntries.length > budget.maxFiles;

  return {
    ok: blockedEntries.length === 0 && !oversized && !tooManyFiles,
    totalBytes,
    totalFiles: normalizedEntries.length,
    maxBytes: budget.maxBytes,
    maxFiles: budget.maxFiles,
    blockedEntries,
    topFiles: normalizedEntries
      .slice()
      .sort((left, right) => right.bytes - left.bytes)
      .slice(0, 50),
    failures: [
      ...blockedEntries.map((entry) => `blocked package entry: ${entry}`),
      ...(oversized ? [`package size ${totalBytes} exceeds budget ${budget.maxBytes}`] : []),
      ...(tooManyFiles
        ? [`package file count ${normalizedEntries.length} exceeds budget ${budget.maxFiles}`]
        : []),
    ],
  };
}

function parseUnzipListing(listing) {
  return listing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(\d+)\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+(.+)$/);
      if (!match) {
        return null;
      }
      return { bytes: Number(match[1]), path: match[2] };
    })
    .filter(Boolean);
}

function readVsixEntries(vsixPath) {
  const listing = execFileSync("unzip", ["-l", vsixPath], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseUnzipListing(listing);
}

function auditVsix(vsixPath, budget = DEFAULT_BUDGET) {
  const entries = readVsixEntries(vsixPath);
  const audit = auditEntries(entries, budget);
  const stat = fs.statSync(vsixPath);
  return {
    ...audit,
    archiveBytes: stat.size,
    vsixPath: path.resolve(vsixPath),
  };
}

function printAudit(audit) {
  console.log(JSON.stringify(audit, null, 2));
  if (!audit.ok) {
    console.error(audit.failures.join("\n"));
  }
}

function runCli(argv = process.argv.slice(2)) {
  const [vsixPath] = argv;
  if (!vsixPath) {
    console.error("Usage: node src/utils/vsixPackageAudit.js <extension.vsix>");
    return 2;
  }

  const audit = auditVsix(vsixPath);
  printAudit(audit);
  return audit.ok ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = runCli();
}

module.exports = {
  BLOCKED_PATH_PATTERNS,
  DEFAULT_BUDGET,
  auditEntries,
  auditVsix,
  parseUnzipListing,
  runCli,
};
