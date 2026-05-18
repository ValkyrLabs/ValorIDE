#!/usr/bin/env node

import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const defaultSource = path.resolve(
  repoRoot,
  "..",
  "ValkyrAI",
  "web",
  "typescript",
  "valkyr_labs_com",
  "src",
  "thorapi",
);

const defaultSupportRoot = path.resolve(defaultSource, "..", "utils");

const args = new Set(process.argv.slice(2));
const getArgValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return path.resolve(repoRoot, value);
};

const getOptionalPathArg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? fallback : process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    if (index !== -1) {
      throw new Error(`${name} requires a value`);
    }
    return undefined;
  }
  return path.resolve(repoRoot, value);
};

const sourceRoot = getArgValue(
  "--source",
  process.env.VALKYRAI_THORAPI_SOURCE || defaultSource,
);
const supportRoot = getArgValue(
  "--support-source",
  process.env.VALKYRAI_WEB_UTILS_SOURCE || defaultSupportRoot,
);
const dryRun = args.has("--dry-run");
const reportJsonPath = getOptionalPathArg(
  "--report-json",
  process.env.VALORIDE_THORAPI_SYNC_REPORT,
);

const thorapiTargets = [
  path.join(repoRoot, "webview-ui", "src", "thorapi"),
  path.join(repoRoot, "src", "thorapi"),
];

const requiredThorapiFolders = ["api", "model", "redux", "src"];
const supportFiles = ["authTokenStorage.ts", "csrfToken.ts"];
const supportTargets = [
  path.join(repoRoot, "webview-ui", "src", "utils"),
  path.join(repoRoot, "src", "utils"),
];

const assertDirectory = async (dir) => {
  const stat = await fs.stat(dir);
  if (!stat.isDirectory()) {
    throw new Error(`${dir} is not a directory`);
  }
};

const assertFile = async (file) => {
  const stat = await fs.stat(file);
  if (!stat.isFile()) {
    throw new Error(`${file} is not a file`);
  }
};

const listFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      return [fullPath];
    }),
  );
  return nested.flat();
};

const normalizeRelativePath = (filePath) => filePath.split(path.sep).join("/");

const hashFiles = async (root, files) => {
  const hash = createHash("sha256");
  const sortedFiles = [...files].sort((left, right) =>
    left.localeCompare(right),
  );
  for (const file of sortedFiles) {
    hash.update(normalizeRelativePath(path.relative(root, file)));
    hash.update("\0");
    hash.update(await fs.readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
};

const getGitRevision = (dir) => {
  const result = spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
};

const validateDirectory = async (root, name) => {
  const fullPath = path.join(root, name);
  try {
    const stat = await fs.stat(fullPath);
    return {
      name,
      ok: stat.isDirectory(),
      path: fullPath,
      type: stat.isDirectory() ? "directory" : "not-directory",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      name,
      ok: false,
      path: fullPath,
      type: "missing",
    };
  }
};

const validateFile = async (root, name) => {
  const fullPath = path.join(root, name);
  try {
    const stat = await fs.stat(fullPath);
    return {
      name,
      ok: stat.isFile(),
      path: fullPath,
      type: stat.isFile() ? "file" : "not-file",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      name,
      ok: false,
      path: fullPath,
      type: "missing",
    };
  }
};

const buildValidationReport = async () => ({
  requiredFolders: await Promise.all(
    requiredThorapiFolders.map((folder) =>
      validateDirectory(sourceRoot, folder),
    ),
  ),
  supportFiles: await Promise.all(
    supportFiles.map((file) => validateFile(supportRoot, file)),
  ),
});

const assertValidationReport = (validation) => {
  const invalidFolder = validation.requiredFolders.find(({ ok }) => !ok);
  if (invalidFolder) {
    throw new Error(`${invalidFolder.path} is not a directory`);
  }
  const invalidSupportFile = validation.supportFiles.find(({ ok }) => !ok);
  if (invalidSupportFile) {
    throw new Error(`${invalidSupportFile.path} is not a file`);
  }
};

const hasDifferentTargetContent = async (sourceFile, targetFile) => {
  let sourceContent;
  try {
    sourceContent = await fs.readFile(sourceFile, "utf8");
  } catch {
    return true;
  }

  try {
    const targetContent = await fs.readFile(targetFile, "utf8");
    return targetContent !== sourceContent;
  } catch {
    return true;
  }
};

const hasAnyChangedTarget = async (sourceFile, relativePath, targets) => {
  const comparisons = await Promise.all(
    targets.map((target) =>
      hasDifferentTargetContent(sourceFile, path.join(target, relativePath)),
    ),
  );
  return comparisons.some(Boolean);
};

const getGeneratedName = (file) =>
  path
    .basename(file)
    .replace(/\.d\.ts$/u, "")
    .replace(/\.[^.]+$/u, "");

const getChangedGeneratedNames = async (folder, targets) => {
  const folderRoot = path.join(sourceRoot, folder);
  const files = (await listFiles(folderRoot)).filter((file) =>
    /\.(?:ts|tsx|js|jsx)$/u.test(file),
  );
  const changed = [];

  for (const file of files) {
    const name = getGeneratedName(file);
    if (!name || name === "index") {
      continue;
    }
    const relativePath = path.relative(sourceRoot, file);
    if (await hasAnyChangedTarget(file, relativePath, targets)) {
      changed.push(name);
    }
  }

  return [...new Set(changed)].sort((left, right) => left.localeCompare(right));
};

const getChangedSupportFiles = async () => {
  const changed = [];
  for (const file of supportFiles) {
    const sourceFile = path.join(supportRoot, file);
    if (await hasAnyChangedTarget(sourceFile, file, supportTargets)) {
      changed.push(file);
    }
  }
  return changed;
};

const copyDirectory = async (source, target) => {
  const files = await listFiles(source);
  if (!dryRun) {
    await fs.rm(target, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.cp(source, target, { recursive: true });
  }
  return files.length;
};

const copySupportFiles = async () => {
  for (const file of supportFiles) {
    await assertFile(path.join(supportRoot, file));
  }

  if (!dryRun) {
    for (const targetDir of supportTargets) {
      await fs.mkdir(targetDir, { recursive: true });
      for (const file of supportFiles) {
        await fs.copyFile(
          path.join(supportRoot, file),
          path.join(targetDir, file),
        );
      }
    }
  }
};

const patchAuthTokenStorage = async (targetDir) => {
  const authTokenStoragePath = path.join(targetDir, "authTokenStorage.ts");
  const original = await fs.readFile(authTokenStoragePath, "utf8");
  const patched = original
    .replace(
      "for (const [key, value] of preservedValues)",
      "for (const [key, value] of Array.from(preservedValues.entries()))",
    )
    .replace(
      "for (const path of paths)",
      "for (const path of Array.from(paths))",
    );

  if (patched !== original) {
    await fs.writeFile(authTokenStoragePath, patched);
  }
  return patched !== original;
};

const patchRuntimeBasePath = async (thorapiRoot) => {
  const runtimePath = path.join(thorapiRoot, "src", "runtime.ts");
  const original = await fs.readFile(runtimePath, "utf8");
  const viteBasePath = `// un-comment for Vite apps
export const BASE_PATH = import.meta.env.VITE_basePath.replace(/\\/+\$/, "");`;
  if (!original.includes(viteBasePath)) {
    return false;
  }

  const patched = original
    .replace(
      viteBasePath,
      `const sanitizeBasePath = (value?: string): string => {
    const raw = (value ?? "").trim();
    return raw ? raw.replace(/\\/+\$/, "") : "";
};

// Mutable base path so it can be overridden by runtime settings.
export let BASE_PATH = sanitizeBasePath(import.meta.env?.VITE_basePath ?? "");`,
    )
    .replace(
      `// export const BASE_PATH = process.env.REACT_APP_BASE_PATH.replace(/\\/+\$/, "");`,
      `// export let BASE_PATH = sanitizeBasePath(process.env.REACT_APP_BASE_PATH);`,
    )
    .replace(
      `export const Configuration = {
    basePath: BASE_PATH, // This is the value that will be prepended to all endpoints.  For compatibility with
                  // previous versions, the default is an empty string.  Other generators typically use
                  // BASE_PATH as the default.
};`,
      `export const Configuration = {
    basePath: BASE_PATH, // This is the value that will be prepended to all endpoints.  For compatibility with
                  // previous versions, the default is an empty string.  Other generators typically use
                  // BASE_PATH as the default.
};

export const setBasePath = (value?: string) => {
    BASE_PATH = sanitizeBasePath(value ?? import.meta.env?.VITE_basePath ?? "");
    Configuration.basePath = BASE_PATH;
    return BASE_PATH;
};

export const getBasePath = () => BASE_PATH;`,
    );

  await fs.writeFile(runtimePath, patched);
  return true;
};

const main = async () => {
  await assertDirectory(sourceRoot);
  const validation = await buildValidationReport();
  assertValidationReport(validation);

  const sourceFiles = await listFiles(sourceRoot);
  const source = {
    contentHash: await hashFiles(sourceRoot, sourceFiles),
    fileCount: sourceFiles.length,
    revision: getGitRevision(sourceRoot),
    root: sourceRoot,
  };
  const changed = {
    models: await getChangedGeneratedNames("model", thorapiTargets),
    services: await getChangedGeneratedNames("api", thorapiTargets),
    supportFiles: await getChangedSupportFiles(),
  };

  const copied = [];
  for (const target of thorapiTargets) {
    const fileCount = await copyDirectory(sourceRoot, target);
    let runtimeBasePathPatched = null;
    if (!dryRun) {
      runtimeBasePathPatched = await patchRuntimeBasePath(target);
    }
    copied.push({
      target: path.relative(repoRoot, target),
      fileCount,
      runtimeBasePathPatched,
    });
  }

  await copySupportFiles();
  const supportPatches = [];
  if (!dryRun) {
    for (const target of supportTargets) {
      supportPatches.push({
        authTokenStoragePatched: await patchAuthTokenStorage(target),
        target: path.relative(repoRoot, target),
      });
    }
  } else {
    for (const target of supportTargets) {
      supportPatches.push({
        authTokenStoragePatched: null,
        target: path.relative(repoRoot, target),
      });
    }
  }

  const mode = dryRun ? "Would sync" : "Synced";
  for (const item of copied) {
    console.log(`${mode} ${item.fileCount} ThorAPI files into ${item.target}`);
  }
  console.log(
    `${mode} support files ${supportFiles.join(", ")} into ${supportTargets
      .map((target) => path.relative(repoRoot, target))
      .join(" and ")}`,
  );

  if (reportJsonPath) {
    await fs.mkdir(path.dirname(reportJsonPath), { recursive: true });
    await fs.writeFile(
      reportJsonPath,
      `${JSON.stringify(
        {
          copied,
          changed,
          dryRun,
          generatedAt: new Date().toISOString(),
          source,
          sourceRoot,
          support: {
            files: supportFiles,
            patches: supportPatches,
            sourceRoot: supportRoot,
            targets: supportTargets.map((target) =>
              path.relative(repoRoot, target),
            ),
          },
          validation,
        },
        null,
        2,
      )}\n`,
    );
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
