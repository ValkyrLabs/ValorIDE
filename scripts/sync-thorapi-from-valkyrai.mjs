#!/usr/bin/env node

import fs from "node:fs/promises";
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

const sourceRoot = getArgValue(
  "--source",
  process.env.VALKYRAI_THORAPI_SOURCE || defaultSource,
);
const supportRoot = getArgValue(
  "--support-source",
  process.env.VALKYRAI_WEB_UTILS_SOURCE || defaultSupportRoot,
);
const dryRun = args.has("--dry-run");

const thorapiTargets = [
  path.join(repoRoot, "webview-ui", "src", "thorapi"),
  path.join(repoRoot, "src", "thorapi"),
];

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
  for (const required of ["api", "model", "redux", "src"]) {
    await assertDirectory(path.join(sourceRoot, required));
  }

  const copied = [];
  for (const target of thorapiTargets) {
    const fileCount = await copyDirectory(sourceRoot, target);
    if (!dryRun) {
      await patchRuntimeBasePath(target);
    }
    copied.push({ target: path.relative(repoRoot, target), fileCount });
  }

  await copySupportFiles();
  if (!dryRun) {
    for (const target of supportTargets) {
      await patchAuthTokenStorage(target);
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
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
