import AdmZip from "adm-zip";
import { getValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";
import crypto from "crypto";
import fs from "fs/promises";
import ignore, { Ignore } from "ignore";
import path from "path";
import { getSecret } from "@core/storage/state";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import type * as vscode from "vscode";

const MANIFEST_FILE = ".valoride-deploy.json";
const MAX_SOURCE_BYTES = 95 * 1024 * 1024;
const MAX_SOURCE_FILES = 25_000;

const REQUIRED_EXCLUSIONS = [
  ".git/",
  "**/.git/",
  ".hg/",
  "**/.hg/",
  ".svn/",
  "**/.svn/",
  "node_modules/",
  "**/node_modules/",
  "target/",
  "**/target/",
  "dist/",
  "**/dist/",
  "build/",
  "**/build/",
  ".next/",
  "**/.next/",
  "coverage/",
  "**/coverage/",
  "thorapi/",
  "**/thorapi/",
  "generated/",
  "**/generated/",
  "logs/",
  "**/logs/",
  ".env",
  ".env.*",
  "**/.env",
  "**/.env.*",
  "*.pem",
  "**/*.pem",
  "*.key",
  "**/*.key",
  "*.p12",
  "**/*.p12",
  "*.pfx",
  "**/*.pfx",
  "*.jks",
  "**/*.jks",
  "*.keystore",
  "**/*.keystore",
  MANIFEST_FILE,
];

export interface ApplicationSourceManifest {
  schemaVersion: 1;
  applicationId: string;
  applicationName: string;
  runtimeTemplate: "java_spring_boot";
  backendRoot: string;
  openApiInputPath: string;
  frontendRoot?: string;
  thorapiClientPath?: string;
  packageManager?: "yarn";
  createdAt: string;
  fileCount: number;
  sourceBytes: number;
}

export interface ApplicationSourceArchive {
  buffer: Buffer;
  manifest: ApplicationSourceManifest;
  checksumSha256: string;
}

export interface ApplicationSourcePublishResult {
  applicationId: string;
  artifactId: string;
  revisionRef: string;
  checksumSha256: string;
  sizeBytes: number;
  createdAt: string;
  status: string;
  manifest: ApplicationSourceManifest;
}

export interface PublishApplicationSourceRequest {
  context: vscode.ExtensionContext;
  applicationId: string;
  applicationName?: string;
  onProgress?: (message: string) => void | Promise<void>;
}

const toPosix = (value: string) => value.split(path.sep).join("/");

const exists = async (candidate: string) =>
  fs
    .stat(candidate)
    .then((stat) => stat.isFile())
    .catch(() => false);

async function addIgnoreFile(
  matcher: Ignore,
  workspaceRoot: string,
  ignoreFile: string,
  visited = new Set<string>(),
): Promise<void> {
  const absolute = path.resolve(workspaceRoot, ignoreFile);
  if (visited.has(absolute) || !(await exists(absolute))) return;
  visited.add(absolute);
  const content = await fs.readFile(absolute, "utf8");
  const patterns: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("!include ")) {
      const included = line.slice("!include ".length).trim();
      if (included && !path.isAbsolute(included)) {
        await addIgnoreFile(matcher, workspaceRoot, included, visited);
      }
    } else {
      patterns.push(rawLine);
    }
  }
  matcher.add(patterns.join("\n"));
}

async function sourceIgnoreMatcher(workspaceRoot: string): Promise<Ignore> {
  const matcher = ignore().add(REQUIRED_EXCLUSIONS);
  await addIgnoreFile(matcher, workspaceRoot, ".gitignore");
  await addIgnoreFile(matcher, workspaceRoot, ".valorignore");
  await addIgnoreFile(matcher, workspaceRoot, ".valorideignore");
  // Project ignore files can opt source back in, but never generated output or credentials.
  matcher.add(REQUIRED_EXCLUSIONS);
  return matcher;
}

async function collectSourceFiles(workspaceRoot: string, matcher: Ignore) {
  const files: Array<{ absolute: string; relative: string; size: number }> = [];
  let sourceBytes = 0;

  const visit = async (directory: string): Promise<void> => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = toPosix(path.relative(workspaceRoot, absolute));
      if (
        !relative ||
        matcher.ignores(entry.isDirectory() ? `${relative}/` : relative)
      ) {
        continue;
      }
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(absolute);
      sourceBytes += stat.size;
      if (files.length + 1 > MAX_SOURCE_FILES) {
        throw new Error(
          `Source snapshot exceeds ${MAX_SOURCE_FILES.toLocaleString()} files.`,
        );
      }
      if (sourceBytes > MAX_SOURCE_BYTES) {
        throw new Error(
          "Source snapshot exceeds the 95 MB uncompressed limit.",
        );
      }
      files.push({ absolute, relative, size: stat.size });
    }
  };

  await visit(workspaceRoot);
  return { files, sourceBytes };
}

async function detectFrontendRoot(
  workspaceRoot: string,
  sourceFiles: Array<{ relative: string }>,
): Promise<string | undefined> {
  const packageFiles = sourceFiles
    .map((file) => file.relative)
    .filter((relative) => path.posix.basename(relative) === "package.json")
    .sort((left, right) => left.split("/").length - right.split("/").length);

  for (const relative of packageFiles) {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(workspaceRoot, relative), "utf8"),
      );
      if (
        packageJson?.scripts?.build &&
        (packageJson?.dependencies?.react || packageJson?.devDependencies?.vite)
      ) {
        const directory = path.posix.dirname(relative);
        return directory === "." ? "." : directory;
      }
    } catch {
      // Ignore malformed package files that are not the deployable frontend.
    }
  }
  return undefined;
}

async function createManifest(
  workspaceRoot: string,
  applicationId: string,
  applicationName: string,
  sourceFiles: Array<{ relative: string }>,
  sourceBytes: number,
): Promise<ApplicationSourceManifest> {
  if (!(await exists(path.join(workspaceRoot, "pom.xml")))) {
    throw new Error(
      "Publish Source currently requires a Maven pom.xml at the workspace root.",
    );
  }
  const frontendRoot = await detectFrontendRoot(workspaceRoot, sourceFiles);
  const openApiCandidates = [
    "src/main/resources/openapi/api-out.yaml",
    "src/main/resources/openapi/api.yaml",
    "src/main/resources/openapi/openapi.yaml",
  ];
  const openApiInputPath =
    (
      await Promise.all(
        openApiCandidates.map(
          async (candidate) =>
            [
              candidate,
              await exists(path.join(workspaceRoot, candidate)),
            ] as const,
        ),
      )
    ).find(([, present]) => present)?.[0] || openApiCandidates[0];

  return {
    schemaVersion: 1,
    applicationId,
    applicationName,
    runtimeTemplate: "java_spring_boot",
    backendRoot: ".",
    openApiInputPath,
    ...(frontendRoot
      ? {
          frontendRoot,
          thorapiClientPath: toPosix(path.join(frontendRoot, "src", "thorapi")),
          packageManager: "yarn" as const,
        }
      : {}),
    createdAt: new Date().toISOString(),
    fileCount: sourceFiles.length,
    sourceBytes,
  };
}

export async function createApplicationSourceArchive(
  workspaceRoot: string,
  applicationId: string,
  applicationName = applicationId,
): Promise<ApplicationSourceArchive> {
  const matcher = await sourceIgnoreMatcher(workspaceRoot);
  const { files, sourceBytes } = await collectSourceFiles(
    workspaceRoot,
    matcher,
  );
  const manifest = await createManifest(
    workspaceRoot,
    applicationId,
    applicationName,
    files,
    sourceBytes,
  );
  const developerFiles = files.filter(
    (file) => file.relative !== manifest.openApiInputPath,
  );
  manifest.fileCount = developerFiles.length;
  manifest.sourceBytes = developerFiles.reduce(
    (total, file) => total + file.size,
    0,
  );
  const archive = new AdmZip();
  for (const file of developerFiles) {
    archive.addFile(file.relative, await fs.readFile(file.absolute));
  }
  archive.addFile(
    MANIFEST_FILE,
    Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
  );
  const buffer = archive.toBuffer();
  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error(
      "Compressed source snapshot exceeds the 95 MB upload limit.",
    );
  }
  return {
    buffer,
    manifest,
    checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function publishApplicationSource({
  context,
  applicationId,
  applicationName = applicationId,
  onProgress,
}: PublishApplicationSourceRequest): Promise<ApplicationSourcePublishResult> {
  const workspaceRoot = getWorkspacePath();
  if (!workspaceRoot)
    throw new Error("Open a workspace before publishing source.");
  const jwtToken = await getSecret(context, "jwtToken");
  if (!jwtToken)
    throw new Error("Sign in to ValorIDE before publishing source.");

  await onProgress?.("Packaging developer-owned source files...");
  const archive = await createApplicationSourceArchive(
    workspaceRoot,
    applicationId,
    applicationName,
  );
  const formData = new FormData();
  const filename = `${applicationName.replace(/[^A-Za-z0-9._-]/g, "-")}-source.zip`;
  formData.append(
    "file",
    new Blob([new Uint8Array(archive.buffer)], { type: "application/zip" }),
    filename,
  );

  await onProgress?.(
    `Uploading ${archive.manifest.fileCount.toLocaleString()} source files to ValkyrAI...`,
  );
  const response =
    await getValkyrLabsRtkApiClient().request<ApplicationSourcePublishResult>({
      url: `${getValkyraiBasePath()}/thorapi/applications/${encodeURIComponent(applicationId)}/source-snapshots`,
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${jwtToken}`, jwtSession: jwtToken },
    });
  await onProgress?.(
    `Published immutable source revision ${response.data.revisionRef}`,
  );
  return response.data;
}
