import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, readdir, rename, rm } from "node:fs/promises";
import * as path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import AdmZip from "adm-zip";
import fetch from "node-fetch";
import * as vscode from "vscode";
import {
  findCompatibleJavaHome,
  parseJavaMajorVersion,
} from "./projectRuntime";

const execFileAsync = promisify(execFile);
const NODE_MINIMUM_MAJOR = 20;

interface AdoptiumAsset {
  binary?: {
    package?: { checksum?: string; link?: string; name?: string };
  };
}

export interface NodeRelease {
  version: string;
  files?: string[];
  lts?: string | boolean;
}

export interface ManagedNodeRuntime {
  bin: string;
  home: string;
  major: number;
  version: string;
}

const runtimePlatform = () => {
  if (process.platform === "darwin") return "mac";
  if (process.platform === "win32") return "windows";
  if (process.platform === "linux") return "linux";
  throw new Error(
    `ValorIDE runtime installation does not support ${process.platform}.`,
  );
};

const runtimeArchitecture = () => {
  if (process.arch === "arm64") return "aarch64";
  if (process.arch === "x64") return "x64";
  throw new Error(
    `ValorIDE runtime installation does not support ${process.arch}.`,
  );
};

export const adoptiumAssetUrl = (
  platform = runtimePlatform(),
  architecture = runtimeArchitecture(),
) =>
  `https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=${architecture}&image_type=jdk&jvm_impl=hotspot&os=${platform}&vendor=eclipse`;

const nodePlatform = () => {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "win32") return "win";
  if (process.platform === "linux") return "linux";
  throw new Error(
    `ValorIDE Node installation does not support ${process.platform}.`,
  );
};

const nodeArchitecture = () => {
  if (process.arch === "arm64") return "arm64";
  if (process.arch === "x64") return "x64";
  throw new Error(
    `ValorIDE Node installation does not support ${process.arch}.`,
  );
};

const nodeReleaseFileKey = (platform: string, architecture: string) =>
  platform === "darwin"
    ? `osx-${architecture}-tar`
    : platform === "win"
      ? `win-${architecture}-zip`
      : `${platform}-${architecture}`;

export const selectNodeLtsRelease = (
  releases: NodeRelease[],
  platform = nodePlatform(),
  architecture = nodeArchitecture(),
) =>
  releases.find(
    (release) =>
      Boolean(release.lts) &&
      release.files?.includes(nodeReleaseFileKey(platform, architecture)),
  );

export const nodeArchiveName = (
  version: string,
  platform = nodePlatform(),
  architecture = nodeArchitecture(),
) =>
  `node-${version}-${platform}-${architecture}.${platform === "win" ? "zip" : "tar.gz"}`;

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download metadata request failed (${response.status}) for ${url}`,
    );
  }
  return (await response.json()) as T;
};

const downloadVerified = async (
  url: string,
  destination: string,
  expectedSha256: string,
  allowedHosts: string[],
) => {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Runtime download failed (${response.status}) for ${url}`);
  }
  const finalHost = new URL(response.url).hostname;
  if (!allowedHosts.includes(finalHost)) {
    throw new Error(
      `Runtime download redirected to an untrusted host: ${finalHost}`,
    );
  }
  const digest = createHash("sha256");
  const hashingStream = new Transform({
    transform(chunk, _encoding, callback) {
      digest.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(
    response.body as unknown as Readable,
    hashingStream,
    createWriteStream(destination, { mode: 0o600 }),
  );
  const actual = digest.digest("hex");
  if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
    await rm(destination, { force: true });
    throw new Error(
      `Runtime checksum mismatch: expected ${expectedSha256}, received ${actual}`,
    );
  }
};

const extractArchive = async (archive: string, destination: string) => {
  await mkdir(destination, { recursive: true });
  if (archive.endsWith(".zip")) {
    const zip = new AdmZip(archive);
    for (const entry of zip.getEntries()) {
      const resolved = path.resolve(destination, entry.entryName);
      if (!resolved.startsWith(`${path.resolve(destination)}${path.sep}`)) {
        throw new Error(`Unsafe path in runtime archive: ${entry.entryName}`);
      }
    }
    zip.extractAllTo(destination, true);
    return;
  }
  await execFileAsync("tar", ["-xzf", archive, "-C", destination], {
    timeout: 120_000,
  });
};

const scanForExecutableRoot = async (
  root: string,
  executable: string,
  maxDepth = 5,
): Promise<string | undefined> => {
  try {
    await access(path.join(root, "bin", executable));
    return root;
  } catch {
    if (maxDepth <= 0) return undefined;
  }
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const found = await scanForExecutableRoot(
        path.join(root, entry.name),
        executable,
        maxDepth - 1,
      );
      if (found) return found;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const parseNodeMajor = (version: string) => {
  const major = Number(version.trim().replace(/^v/, "").split(".")[0]);
  return Number.isFinite(major) ? major : undefined;
};

export class ManagedProjectRuntimes {
  private javaPromise?: Promise<{ home: string; major: number }>;
  private nodePromise?: Promise<ManagedNodeRuntime>;
  private readonly root: string;

  constructor(
    context: vscode.ExtensionContext,
    private readonly output: Pick<vscode.OutputChannel, "appendLine">,
  ) {
    this.root = path.join(context.globalStorageUri.fsPath, "runtimes");
  }

  ensureJava(): Promise<{ home: string; major: number }> {
    return (this.javaPromise ??= this.ensureJavaImpl().catch((error) => {
      this.javaPromise = undefined;
      throw error;
    }));
  }

  ensureNode(): Promise<ManagedNodeRuntime> {
    return (this.nodePromise ??= this.ensureNodeImpl().catch((error) => {
      this.nodePromise = undefined;
      throw error;
    }));
  }

  private async ensureJavaImpl() {
    await mkdir(this.root, { recursive: true });
    let runtime = await findCompatibleJavaHome([
      path.join(this.root, "jdk-21"),
    ]);
    if (!runtime) {
      runtime = await vscode.window
        .withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "ValorIDE is installing Eclipse Temurin JDK 21",
            cancellable: false,
          },
          async (progress) => {
            progress.report({
              message: "Resolving the official Adoptium build…",
            });
            const assets = await fetchJson<AdoptiumAsset[]>(adoptiumAssetUrl());
            const artifact = assets[0]?.binary?.package;
            if (!artifact?.link || !artifact.checksum || !artifact.name) {
              throw new Error(
                "Adoptium did not return a JDK 21 package for this system.",
              );
            }
            return this.installArchive(
              artifact.link,
              artifact.name,
              artifact.checksum,
              path.join(this.root, "jdk-21"),
              ["github.com", "release-assets.githubusercontent.com"],
              "javac",
              progress,
            );
          },
        )
        .then(async (home) => {
          const result = await execFileAsync(path.join(home, "bin", "java"), [
            "-version",
          ]);
          const major = parseJavaMajorVersion(
            `${result.stdout}\n${result.stderr}`,
          );
          if (major !== 21)
            throw new Error(
              `Managed JDK reported unexpected version ${major}.`,
            );
          return { home, major };
        });
    }
    await this.configureEclipseJava(runtime.home);
    this.output.appendLine(
      `[Runtime] JDK ${runtime.major} ready at ${runtime.home}`,
    );
    return runtime;
  }

  private async ensureNodeImpl(): Promise<ManagedNodeRuntime> {
    const current = await this.findNodeOnPath();
    if (current) return current;
    await mkdir(this.root, { recursive: true });
    const managedRoot = path.join(this.root, "node-lts");
    const managedHome = await scanForExecutableRoot(
      managedRoot,
      process.platform === "win32" ? "node.exe" : "node",
    );
    if (managedHome) {
      const managed = await this.inspectNode(managedHome);
      if (managed) return managed;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ValorIDE is installing Node.js LTS",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "Resolving the official LTS build…" });
        const releases = await fetchJson<NodeRelease[]>(
          "https://nodejs.org/dist/index.json",
        );
        const release = selectNodeLtsRelease(releases);
        if (!release)
          throw new Error(
            "Node.js did not publish an LTS build for this system.",
          );
        const archiveName = nodeArchiveName(release.version);
        const releaseRoot = `https://nodejs.org/dist/${release.version}`;
        const shasums = await fetch(`${releaseRoot}/SHASUMS256.txt`).then(
          async (response) => {
            if (!response.ok)
              throw new Error("Unable to load the Node.js checksum manifest.");
            return response.text();
          },
        );
        const checksum = shasums
          .split(/\r?\n/)
          .find((line) => line.trim().endsWith(`  ${archiveName}`))
          ?.trim()
          .split(/\s+/)[0];
        if (!checksum)
          throw new Error(`Node.js checksum missing for ${archiveName}.`);
        const home = await this.installArchive(
          `${releaseRoot}/${archiveName}`,
          archiveName,
          checksum,
          managedRoot,
          ["nodejs.org"],
          process.platform === "win32" ? "node.exe" : "node",
          progress,
        );
        const runtime = await this.inspectNode(home);
        if (!runtime)
          throw new Error("The managed Node.js installation did not verify.");
        this.output.appendLine(
          `[Runtime] Node ${runtime.version} ready at ${runtime.home}`,
        );
        return runtime;
      },
    );
  }

  private async installArchive(
    url: string,
    archiveName: string,
    checksum: string,
    finalRoot: string,
    allowedHosts: string[],
    executable: string,
    progress: vscode.Progress<{ message?: string }>,
  ) {
    const staging = path.join(this.root, `.install-${randomUUID()}`);
    const archive = path.join(staging, archiveName);
    const extracted = path.join(staging, "extracted");
    await mkdir(staging, { recursive: true });
    try {
      progress.report({ message: "Downloading and verifying SHA-256…" });
      await downloadVerified(url, archive, checksum, allowedHosts);
      progress.report({ message: "Extracting the managed runtime…" });
      await extractArchive(archive, extracted);
      const home = await scanForExecutableRoot(extracted, executable);
      if (!home)
        throw new Error(
          `Downloaded runtime does not contain bin/${executable}.`,
        );
      const relativeHome = path.relative(extracted, home);
      await rm(finalRoot, { recursive: true, force: true });
      await rename(extracted, finalRoot);
      return path.join(finalRoot, relativeHome);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }

  private async findNodeOnPath() {
    try {
      const [result] = await Promise.all([
        execFileAsync("node", ["--version"], { timeout: 5_000 }),
        execFileAsync("npm", ["--version"], { timeout: 5_000 }),
      ]);
      const major = parseNodeMajor(result.stdout);
      if (major && major >= NODE_MINIMUM_MAJOR) {
        const bin = process.platform === "win32" ? "node.exe" : "node";
        return { bin, home: "", major, version: result.stdout.trim() };
      }
    } catch {
      // Install a managed runtime below.
    }
    return undefined;
  }

  private async inspectNode(
    home: string,
  ): Promise<ManagedNodeRuntime | undefined> {
    const bin = path.join(home, "bin");
    const executable = path.join(
      bin,
      process.platform === "win32" ? "node.exe" : "node",
    );
    const npm = path.join(
      bin,
      process.platform === "win32" ? "npm.cmd" : "npm",
    );
    try {
      const [result] = await Promise.all([
        execFileAsync(executable, ["--version"], { timeout: 5_000 }),
        execFileAsync(npm, ["--version"], { timeout: 5_000 }),
      ]);
      const major = parseNodeMajor(result.stdout);
      if (major && major >= NODE_MINIMUM_MAJOR) {
        return { bin, home, major, version: result.stdout.trim() };
      }
    } catch {
      // Ignore incomplete managed installations.
    }
    return undefined;
  }

  private async configureEclipseJava(javaHome: string) {
    const java = vscode.workspace.getConfiguration("java");
    await java.update(
      "jdt.ls.java.home",
      javaHome,
      vscode.ConfigurationTarget.Global,
    );
    const runtimes = java.get<Array<Record<string, unknown>>>(
      "configuration.runtimes",
      [],
    );
    const retained = runtimes.filter((runtime) => runtime.name !== "JavaSE-21");
    await java.update(
      "configuration.runtimes",
      [...retained, { name: "JavaSE-21", path: javaHome, default: true }],
      vscode.ConfigurationTarget.Global,
    );
  }
}
