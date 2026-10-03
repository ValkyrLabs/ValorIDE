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
  build?: ProjectTarget;
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
    if (target) {
      if (target.tool === "maven") {
        const pom = await fs.readFile(path.join(target.directory, "pom.xml"), "utf8").catch(() => "");
        if (/<packaging>\s*pom\s*<\/packaging>/.test(pom)) continue;
      }
      return target;
    }
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
  const rootTool = await detectProjectTool(root);
  const childModules: string[] = [];
  try {
    const pom = await fs.readFile(path.join(root, "pom.xml"), "utf8");
    for (const match of pom.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g)) childModules.push(match[1]);
  } catch { /* No Maven reactor at the canonical root. */ }

  const backend = backendDescriptor
    ? await targetAt(root, backendDescriptor.path as string)
    : await firstTarget(root, [
        ".",
        "spring-server",
        "backend",
        "server",
        "api",
        ...childModules,
      ]);
  const frontend = frontendDescriptor
    ? await targetAt(root, frontendDescriptor.path as string)
    : await firstTarget(root, [".", "ui", "frontend", "web", "client"]);

  return {
    root: path.resolve(root),
    build: rootTool && rootTool !== "node" ? { directory: path.resolve(root), tool: rootTool } : undefined,
    backend:
      backend && backend.tool !== "node"
        ? backend
        : await firstTarget(root, [
            "spring-server",
            "backend",
            "server",
            "api",
            ...childModules,
          ]),
    frontend:
      frontend?.tool === "node"
        ? frontend
        : await firstTarget(root, ["ui", "frontend", "web", "client"]),
  };
}

export async function projectCommand(target: ProjectTarget, task: "build" | "run", javaHome?: string): Promise<string> {
  let command: string;
  if (target.tool === "node") {
    let pkg: any;
    try { pkg = JSON.parse(await fs.readFile(path.join(target.directory, "package.json"), "utf8")); }
    catch { throw new Error(`Fix package.json in ${target.directory} before ${task}ing this project.`); }
    const script = (task === "build" ? ["build", "typecheck"] : ["dev", "start", "serve"]).find((name) => typeof pkg.scripts?.[name] === "string");
    if (!script) throw new Error(`${target.directory}/package.json needs a ${task === "build" ? "build" : "dev, start, or serve"} script. A generated client library cannot run by itself; open the UI/server module.`);
    const install = await exists(path.join(target.directory, "node_modules")) ? "" : await exists(path.join(target.directory, "package-lock.json")) ? "npm ci && " : "npm install && ";
    command = `${install}npm run ${script}`;
  } else if (target.tool === "maven") {
    const mvn = await exists(path.join(target.directory, "mvnw")) ? "./mvnw" : "mvn";
    let installLibraries = "";
    try {
      const links = JSON.parse(await fs.readFile(path.join(target.directory, ".valoride-java-libraries.json"), "utf8"));
      if (!Array.isArray(links.modules)) throw new Error("Invalid generated Java module list.");
      for (const module of links.modules) {
        if (typeof module !== "string" || !safeProjectPath(target.directory, module) || module === ".") throw new Error("Invalid generated Java module path.");
        installLibraries += `${mvn} -f ${shellQuote(path.join(module, "pom.xml"))} -DskipTests install && `;
      }
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (task === "build") command = `${mvn} -DskipTests install`;
    else {
      const pom = await fs.readFile(path.join(target.directory, "pom.xml"), "utf8");
      if (/<artifactId>\s*spring-boot-maven-plugin\s*<\/artifactId>/.test(pom)) command = `${mvn} spring-boot:run`;
      else {
        let mainClass: string | undefined;
        try { mainClass = JSON.parse(await fs.readFile(path.join(target.directory, ".valoride-runtime.json"), "utf8")).mainClass; } catch { /* A Maven library is buildable but has no runnable entry point. */ }
        if (!mainClass || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(mainClass)) throw new Error(`${target.directory} is a Java library. Select the Spring Boot module or set mainClass in .valoride-runtime.json before running.`);
        command = /<dependencies>/.test(pom)
          ? `${mvn} compile org.apache.maven.plugins:maven-dependency-plugin:3.6.1:copy-dependencies -DincludeScope=runtime && java -cp 'target/classes${path.delimiter}target/dependency/*' ${mainClass}`
          : `${mvn} compile && java -cp target/classes ${mainClass}`;
      }
    }
    command = installLibraries + command;
  } else {
    const gradle = await exists(path.join(target.directory, "gradlew")) ? "./gradlew" : "gradle";
    if (task === "build") command = `${gradle} build -x test`;
    else {
      const build = await fs.readFile(path.join(target.directory, "build.gradle"), "utf8").catch(() => fs.readFile(path.join(target.directory, "build.gradle.kts"), "utf8"));
      if (build.includes("org.springframework.boot")) command = `${gradle} bootRun`;
      else if (/\bapplication\b/.test(build)) command = `${gradle} run`;
      else throw new Error(`${target.directory} has no Gradle application or Spring Boot entry point. Select the application module before running.`);
    }
  }
  // Prefix each command so both Maven and the Java entry point use the managed JDK.
  return javaHome && target.tool !== "node" ? command.split(" && ").map((part) => commandWithJavaHome(part, javaHome)).join(" && ") : command;
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
