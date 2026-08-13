import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as http from "http";
import * as https from "https";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

export type ProjectTool = "maven" | "gradle" | "node";

export interface ProjectTarget {
  directory: string;
  tool: ProjectTool;
}

export interface ProjectRuntimeLayout {
  root: string;
  backend?: ProjectTarget;
  frontend?: ProjectTarget;
}

interface ArtifactSourceRoot {
  path?: unknown;
  kind?: unknown;
}

interface ArtifactLayout {
  sourceRoots?: unknown;
}

const execFileAsync = promisify(execFile);

const exists = async (candidate: string) => {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
};

const safeProjectPath = (root: string, relativePath: string) => {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolved);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? resolved
    : relative === ""
      ? resolvedRoot
      : undefined;
};

export async function detectProjectTool(
  directory: string,
): Promise<ProjectTool | undefined> {
  if (
    (await exists(path.join(directory, "pom.xml"))) ||
    (await exists(path.join(directory, "mvnw")))
  ) {
    return "maven";
  }
  if (
    (await exists(path.join(directory, "gradlew"))) ||
    (await exists(path.join(directory, "build.gradle"))) ||
    (await exists(path.join(directory, "build.gradle.kts")))
  ) {
    return "gradle";
  }
  if (await exists(path.join(directory, "package.json"))) {
    return "node";
  }
  return undefined;
}

const targetAt = async (
  root: string,
  relativePath: string,
): Promise<ProjectTarget | undefined> => {
  const directory = safeProjectPath(root, relativePath);
  if (!directory) return undefined;
  const tool = await detectProjectTool(directory);
  return tool ? { directory, tool } : undefined;
};

const readArtifactRoots = async (
  root: string,
): Promise<ArtifactSourceRoot[]> => {
  try {
    const raw = await fs.readFile(
      path.join(root, "thorapi-artifact-layout.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as ArtifactLayout;
    return Array.isArray(parsed.sourceRoots)
      ? (parsed.sourceRoots as ArtifactSourceRoot[])
      : [];
  } catch {
    return [];
  }
};

const firstTarget = async (root: string, candidates: string[]) => {
  for (const candidate of candidates) {
    const target = await targetAt(root, candidate);
    if (target) return target;
  }
  return undefined;
};

export async function discoverProjectRuntime(
  root: string,
): Promise<ProjectRuntimeLayout> {
  const sourceRoots = await readArtifactRoots(root);
  const backendDescriptor = sourceRoots.find(
    (entry) =>
      entry.kind === "backend-source" && typeof entry.path === "string",
  );
  const frontendDescriptor = sourceRoots.find(
    (entry) =>
      entry.kind === "frontend-host-source" && typeof entry.path === "string",
  );

  const backend = backendDescriptor
    ? await targetAt(root, backendDescriptor.path as string)
    : await firstTarget(root, [
        ".",
        "spring-server",
        "backend",
        "server",
        "api",
      ]);
  const frontend = frontendDescriptor
    ? await targetAt(root, frontendDescriptor.path as string)
    : await firstTarget(root, [".", "ui", "frontend", "web", "client"]);

  return {
    root: path.resolve(root),
    backend:
      backend && backend.tool !== "node"
        ? backend
        : await firstTarget(root, [
            "spring-server",
            "backend",
            "server",
            "api",
          ]),
    frontend:
      frontend?.tool === "node"
        ? frontend
        : await firstTarget(root, ["ui", "frontend", "web", "client"]),
  };
}

export const parseJavaMajorVersion = (versionOutput: string) => {
  const match = versionOutput.match(/version\s+"([^"]+)"/i);
  if (!match) return undefined;
  const parts = match[1].split(/[._+-]/);
  const first = Number(parts[0]);
  if (!Number.isFinite(first)) return undefined;
  return first === 1 ? Number(parts[1]) || undefined : first;
};

const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

export const commandWithJavaHome = (command: string, javaHome: string) => {
  const thor_javaBin = path.join(javaHome, "bin");
  return `env JAVA_HOME=${shellQuote(javaHome)} PATH=${shellQuote(thor_javaBin)}:"$PATH" ${command}`;
};

const scanForJavaHomes = async (
  root: string,
  maxDepth: number,
): Promise<string[]> => {
  if (!(await exists(root))) return [];
  if (await exists(path.join(root, "bin", "java"))) return [root];
  if (maxDepth <= 0) return [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const nested = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) =>
          scanForJavaHomes(path.join(root, entry.name), maxDepth - 1),
        ),
    );
    return nested.flat();
  } catch {
    return [];
  }
};

const javaHomeCandidates = async (additionalRoots: string[] = []) => {
  const candidates = new Set<string>();
  if (process.env.JAVA_HOME) candidates.add(process.env.JAVA_HOME);

  for (const root of additionalRoots) {
    for (const candidate of await scanForJavaHomes(root, 6)) {
      candidates.add(candidate);
    }
  }

  for (const root of [
    "/Library/Java/JavaVirtualMachines",
    path.join(os.homedir(), "Library", "Java", "JavaVirtualMachines"),
  ]) {
    for (const candidate of await scanForJavaHomes(root, 3)) {
      candidates.add(candidate);
    }
  }

  const extensionsRoot = path.join(os.homedir(), ".vscode", "extensions");
  try {
    const extensions = await fs.readdir(extensionsRoot, {
      withFileTypes: true,
    });
    for (const extension of extensions) {
      if (
        !extension.isDirectory() ||
        !/^(redhat\.java|sonarsource\.sonarlint|vmware\.vscode-spring-boot)-/i.test(
          extension.name,
        )
      ) {
        continue;
      }
      for (const candidate of await scanForJavaHomes(
        path.join(extensionsRoot, extension.name),
        4,
      )) {
        candidates.add(candidate);
      }
    }
  } catch {
    // VS Code extensions are optional.
  }
  return [...candidates];
};

export async function findCompatibleJavaHome(
  additionalRoots: string[] = [],
): Promise<{ home: string; major: number } | undefined> {
  const compatible: { home: string; major: number }[] = [];
  for (const home of await javaHomeCandidates(additionalRoots)) {
    if (!(await exists(path.join(home, "bin", "javac")))) {
      continue;
    }
    try {
      const result = await execFileAsync(
        path.join(home, "bin", "java"),
        ["-version"],
        { timeout: 5_000 },
      );
      const major = parseJavaMajorVersion(`${result.stdout}\n${result.stderr}`);
      if (major && major >= 17 && major <= 23) {
        compatible.push({ home, major });
      }
    } catch {
      // Ignore incomplete or broken JDK installations.
    }
  }
  compatible.sort((left, right) => {
    const score = (major: number) => (major === 21 ? 0 : major === 17 ? 1 : 2);
    return score(left.major) - score(right.major) || right.major - left.major;
  });
  return compatible[0];
}

export async function findAvailablePort(preferred: number): Promise<number> {
  for (let port = preferred; port < preferred + 100; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`No available local port found near ${preferred}.`);
}

/**
 * Keep legacy generated applications on the hostname their Spring template
 * allowed before the Vite /v1 proxy became part of the generation contract.
 */
export const localProjectUrl = (port: number) => `http://localhost:${port}`;

const urlResponds = (url: string) =>
  new Promise<boolean>((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.setTimeout(1_500, () => request.destroy());
    request.once("error", () => resolve(false));
  });

export async function waitForUrl(
  url: string,
  timeoutMs = 60_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await urlResponds(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}
