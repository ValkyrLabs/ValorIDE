import { promises as fs } from "fs";
import type { Dirent } from "fs";
import * as path from "path";

interface ArtifactPathEntry {
  path?: unknown;
  kind?: unknown;
}

interface ArtifactLayout {
  sourceRoots?: unknown;
  assetRoots?: unknown;
  buildOutputs?: unknown;
}

export interface GeneratedProjectEditorSetup {
  workspaceFile: string;
  settingsFile: string;
  modules: string[];
  referencedLibraries: string[];
  updatedTypeScriptConfigs: string[];
}

const exists = async (candidate: string) => {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
};

const isDirectory = async (candidate: string) => {
  try {
    return (await fs.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
};

const asEntries = (value: unknown): ArtifactPathEntry[] =>
  Array.isArray(value) ? (value as ArtifactPathEntry[]) : [];

const toPosix = (value: string) => value.split(path.sep).join("/");

const safePath = (root: string, value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, value);
  const relative = path.relative(resolvedRoot, resolved);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    return relative === "" ? resolvedRoot : undefined;
  }
  return resolved;
};

const readJsonObject = async (
  filename: string,
): Promise<Record<string, any> | undefined> => {
  try {
    const parsed = JSON.parse(await fs.readFile(filename, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

const stripJsonComments = (raw: string) => {
  let result = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (lineComment) {
      if (char === "\n" || char === "\r") {
        lineComment = false;
        result += char;
      } else {
        result += " ";
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        result += "  ";
        index += 1;
        blockComment = false;
      } else {
        result += char === "\n" || char === "\r" ? char : " ";
      }
      continue;
    }
    if (inString) {
      result += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
    } else if (char === "/" && next === "/") {
      result += "  ";
      index += 1;
      lineComment = true;
    } else if (char === "/" && next === "*") {
      result += "  ";
      index += 1;
      blockComment = true;
    } else {
      result += char;
    }
  }
  return result;
};

const stripTrailingCommas = (raw: string) => {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      result += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === ",") {
      let lookahead = index + 1;
      while (/\s/.test(raw[lookahead] ?? "")) lookahead += 1;
      if (raw[lookahead] === "}" || raw[lookahead] === "]") continue;
    }
    result += char;
  }
  return result;
};

const parseJsoncObject = (raw: string): Record<string, any> | undefined => {
  try {
    const parsed = JSON.parse(stripTrailingCommas(stripJsonComments(raw)));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

const readJsoncObject = async (
  filename: string,
): Promise<Record<string, any> | undefined> => {
  try {
    return parseJsoncObject(await fs.readFile(filename, "utf8"));
  } catch {
    return undefined;
  }
};

const readArtifactLayout = async (root: string): Promise<ArtifactLayout> =>
  (await readJsonObject(path.join(root, "thorapi-artifact-layout.json"))) ?? {};

const firstExistingDirectory = async (
  root: string,
  candidates: string[],
): Promise<string | undefined> => {
  for (const candidate of candidates) {
    const resolved = safePath(root, candidate);
    if (resolved && (await isDirectory(resolved))) return resolved;
  }
  return undefined;
};

const descriptorDirectory = async (
  root: string,
  entries: ArtifactPathEntry[],
  kind: string,
): Promise<string | undefined> => {
  const descriptor = entries.find((entry) => entry.kind === kind);
  const candidate = safePath(root, descriptor?.path);
  return candidate && (await isDirectory(candidate)) ? candidate : undefined;
};

const relativeFrom = (fromDirectory: string, target: string) => {
  const relative = toPosix(path.relative(fromDirectory, target));
  return relative && !relative.startsWith(".") ? `./${relative}` : relative;
};

const addUnique = (values: unknown, additions: string[]): string[] => {
  const result = Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : [];
  for (const addition of additions) {
    if (!result.includes(addition)) result.push(addition);
  }
  return result;
};

const updateTypeScriptConfigs = async (
  root: string,
  layout: ArtifactLayout,
): Promise<string[]> => {
  const sourceRoots = asEntries(layout.sourceRoots);
  const assetRoots = asEntries(layout.assetRoots);
  const host =
    (await descriptorDirectory(root, sourceRoots, "frontend-host-source")) ??
    (await firstExistingDirectory(root, ["ui", "frontend", "web", "client"]));
  const client =
    (await descriptorDirectory(root, sourceRoots, "frontend-rtk-source")) ??
    (await firstExistingDirectory(root, [
      "typescript-redux-query",
      "typescript-client",
      "client-library",
    ]));
  const componentLibrary =
    (await descriptorDirectory(root, assetRoots, "core-component-library")) ??
    (await firstExistingDirectory(root, [
      "bundle-assets/component-library",
      "component-library",
    ]));

  const updated: string[] = [];
  if (host && client) {
    const filename = path.join(host, "tsconfig.json");
    const config = await readJsoncObject(filename);
    if (config) {
      const clientPath = relativeFrom(host, client);
      config.compilerOptions = config.compilerOptions ?? {};
      config.compilerOptions.baseUrl = config.compilerOptions.baseUrl ?? ".";
      config.compilerOptions.paths = config.compilerOptions.paths ?? {};
      Object.assign(config.compilerOptions.paths, {
        "@thorapi": [`${clientPath}/src/index.ts`],
        "@thorapi/*": [`${clientPath}/*`],
        "@thorapi/model": [`${clientPath}/model`],
        "@thorapi/redux": [`${clientPath}/redux`],
        "@thorapi/redux/*": [`${clientPath}/redux/*`],
        "@thorapi/src": [`${clientPath}/src/index.ts`],
        "@thorapi/utils/*": [`${clientPath}/utils/*`],
        "@valkyrai/thorapi": [`${clientPath}/src/index.ts`],
        "@valkyrai/thorapi/*": [`${clientPath}/*`],
      });
      const includes = [clientPath];
      if (componentLibrary) {
        const componentPath = relativeFrom(host, componentLibrary);
        Object.assign(config.compilerOptions.paths, {
          "@valkyr/component-library": [`${componentPath}/index.ts`],
          "@valkyr/component-library/*": [`${componentPath}/components/*`],
        });
        includes.push(componentPath);
      }
      config.include = addUnique(config.include, includes);
      await fs.writeFile(
        filename,
        `${JSON.stringify(config, null, 2)}\n`,
        "utf8",
      );
      updated.push(filename);
    }
  }

  if (client) {
    const filename = path.join(client, "tsconfig.json");
    const config = await readJsoncObject(filename);
    if (config) {
      const sourceDirectories = [
        "src",
        "api",
        "model",
        "redux",
        "types",
        "utils",
      ];
      const present: string[] = [];
      for (const directory of sourceDirectories) {
        if (await exists(path.join(client, directory))) present.push(directory);
      }
      config.include = addUnique(config.include, present);
      if (componentLibrary) {
        const componentPath = relativeFrom(client, componentLibrary);
        config.compilerOptions = config.compilerOptions ?? {};
        config.compilerOptions.baseUrl = config.compilerOptions.baseUrl ?? ".";
        config.compilerOptions.paths = config.compilerOptions.paths ?? {};
        Object.assign(config.compilerOptions.paths, {
          "@valkyr/component-library": [`${componentPath}/index.ts`],
          "@valkyr/component-library/*": [`${componentPath}/components/*`],
        });
      }
      await fs.writeFile(
        filename,
        `${JSON.stringify(config, null, 2)}\n`,
        "utf8",
      );
      updated.push(filename);
    }
  }
  return updated;
};

const collectLibraryJars = async (
  root: string,
  directory = root,
  depth = 0,
): Promise<string[]> => {
  if (depth > 8) return [];
  let entries: Dirent[];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const ignored = new Set([
    ".git",
    ".gradle",
    "node_modules",
    "target",
    "build",
    "dist",
    "out",
  ]);
  const jars: string[] = [];
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) {
        jars.push(...(await collectLibraryJars(root, candidate, depth + 1)));
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jar")) {
      jars.push(toPosix(path.relative(root, candidate)));
    }
  }
  return jars;
};

const editorSettings = (referencedLibraries: string[]) => ({
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.import.maven.enabled": true,
  "java.import.gradle.enabled": true,
  "java.project.referencedLibraries": addUnique(referencedLibraries, [
    "lib/**/*.jar",
    "libs/**/*.jar",
    "**/lib/**/*.jar",
    "**/libs/**/*.jar",
  ]),
  "npm.autoDetect": "on",
  "typescript.disableAutomaticTypeAcquisition": false,
  "typescript.tsserver.maxTsServerMemory": 4096,
});

const mergeReferencedLibraries = (
  current: unknown,
  additions: string[],
): string[] | Record<string, unknown> => {
  if (current && typeof current === "object" && !Array.isArray(current)) {
    const objectValue = current as Record<string, unknown>;
    return {
      ...objectValue,
      include: addUnique(objectValue.include, additions),
    };
  }
  return addUnique(current, additions);
};

const mergeSettingsFile = async (
  filename: string,
  managedSettings: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  let raw: string | undefined;
  try {
    raw = await fs.readFile(filename, "utf8");
  } catch {
    raw = undefined;
  }
  const strictCurrent = raw ? await readJsonObject(filename) : undefined;
  const current =
    strictCurrent ?? (raw ? parseJsoncObject(raw) : undefined) ?? {};
  const managedLibraries = managedSettings[
    "java.project.referencedLibraries"
  ] as string[];
  const effective = {
    ...managedSettings,
    ...current,
    "java.project.referencedLibraries": mergeReferencedLibraries(
      current["java.project.referencedLibraries"],
      managedLibraries,
    ),
  };
  await fs.mkdir(path.dirname(filename), { recursive: true });
  // Preserve valid JSONC byte-for-byte. The generated workspace carries the
  // merged values, so comments and trailing commas never need to be rewritten.
  if (!raw || strictCurrent) {
    await fs.writeFile(
      filename,
      `${JSON.stringify(effective, null, 2)}\n`,
      "utf8",
    );
  }
  return effective;
};

/**
 * Makes a generated ThorAPI download self-describing to VS Code. The setup is
 * deliberately artifact-local: opening the project imports its Maven/Gradle
 * build, indexes bundled JARs, and resolves the generated TypeScript clients
 * without changing the developer's parent workspace configuration.
 */
export async function prepareGeneratedProjectForEditor(
  extractedRoot: string,
): Promise<GeneratedProjectEditorSetup> {
  const root = path.resolve(extractedRoot);
  const layout = await readArtifactLayout(root);
  const sourceRoots = asEntries(layout.sourceRoots);
  const assetRoots = asEntries(layout.assetRoots);
  const modulePaths = [...sourceRoots, ...assetRoots]
    .map((entry) => safePath(root, entry.path))
    .filter((candidate): candidate is string => Boolean(candidate));
  const modules: string[] = [];
  for (const candidate of modulePaths) {
    if ((await isDirectory(candidate)) && candidate !== root) {
      modules.push(toPosix(path.relative(root, candidate)));
    }
  }

  const referencedLibraries = await collectLibraryJars(root);
  const managedSettings = editorSettings(referencedLibraries);
  const settingsFile = path.join(root, ".vscode", "settings.json");
  const settings = await mergeSettingsFile(settingsFile, managedSettings);

  const workspaceFile = path.join(root, ".valoride", "project.code-workspace");
  await fs.mkdir(path.dirname(workspaceFile), { recursive: true });
  await fs.writeFile(
    workspaceFile,
    `${JSON.stringify(
      {
        folders: [{ name: path.basename(root), path: ".." }],
        settings,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const updatedTypeScriptConfigs = await updateTypeScriptConfigs(root, layout);
  return {
    workspaceFile,
    settingsFile,
    modules: [...new Set(modules)].sort(),
    referencedLibraries: [...new Set(referencedLibraries)].sort(),
    updatedTypeScriptConfigs,
  };
}
