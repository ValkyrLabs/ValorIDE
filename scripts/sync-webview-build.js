#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "webview-ui", "build");
const targetDir = path.join(rootDir, "dist", "webview");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

if (!fs.existsSync(sourceDir)) {
  console.error(
    `[sync-webview-build] Expected build output not found at ${sourceDir}. ` +
      "Run `yarn run build:webview` before syncing.",
  );
  process.exit(1);
}

ensureDir(path.join(rootDir, "dist"));
try {
  fs.rmSync(targetDir, { recursive: true, force: true });
} catch (error) {
  console.warn(
    `[sync-webview-build] Failed to clean previous directory ${targetDir}:`,
    error,
  );
}

copyRecursive(sourceDir, targetDir);
console.log(
  `[sync-webview-build] Copied webview assets from ${sourceDir} to ${targetDir}`,
);
