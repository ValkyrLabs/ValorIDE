import AdmZip from "adm-zip";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
import crypto from "crypto";
import fs from "fs/promises";
import ignore, { Ignore } from "ignore";
import path from "path";
import { getSecret } from "@core/storage/state";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import type * as vscode from "vscode";
import { assertNoProjectLinks, readGenerationManifest } from "./generatedProjectInstall";
import { PROJECT_UUID, normalizeBlueprintBackend, readProjectBlueprintState, safeProjectRelativePath } from "./projectBlueprintSync";
import { applicationSourceSelection, latestPublishedApplicationSource, selectPublishedApplicationSource,
  DeveloperSourceRevision, SourceHandoffOptions } from "./projectSourceRevision";

const MANIFEST_FILE = ".valoride-deploy.json";
export const SOURCE_PUBLICATION_MARKER = ".valoride-source-publication.json";
const activePublications = new Set<string>();
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
  ".DS_Store",
  "**/.DS_Store",
  ".valoride-generation.json",
  "**/.valoride-generation.json",
  ".valoride-blueprint.json",
  "**/.valoride-blueprint.json",
  "artifacts/generated-*.zip",
  MANIFEST_FILE,
  `${SOURCE_PUBLICATION_MARKER}*`,
];

export interface ApplicationSourceManifest {
  schemaVersion: 1;
  applicationId: string;
  applicationName?: string;
  runtimeTemplate: "java_spring_boot";
  backendRoot: string;
  openApiInputPath: string;
  frontendRoot?: string;
  thorapiClientPath?: string;
  packageManager?: "yarn" | "npm";
  createdAt?: string;
  fileCount?: number;
  sourceBytes?: number;
}

export interface ApplicationSourceArchive {
  buffer: Buffer;
  manifest: ApplicationSourceManifest;
  checksumSha256: string;
  fileCount: number;
  sourceBytes: number;
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
  selected?: boolean;
  sourceRevision?: DeveloperSourceRevision;
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
      const handle = await fs.open(absolute, "r");
      try {
        const signature = Buffer.alloc(4);
        const { bytesRead } = await handle.read(signature, 0, 4, 0);
        if (bytesRead === 4 && ["feedface", "cefaedfe", "feedfacf", "cffaedfe", "cafebabe", "bebafeca"].includes(signature.toString("hex"))) {
          throw new Error(`Source contains a compiled macOS or JVM binary: ${relative}. Publish source and a target-platform dependency recipe; keep local binaries outside the source snapshot.`);
        }
      } finally { await handle.close(); }
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
  // A downloaded ThorAPI project has a root reactor and its Boot app in spring-server.
  const backendRoot = await exists(path.join(workspaceRoot, "spring-server/pom.xml"))
    ? "spring-server"
    : ".";
  if (!(await exists(path.join(workspaceRoot, backendRoot, "pom.xml")))) {
    throw new Error(
      "Publish Source requires a Maven pom.xml at the workspace root or in spring-server. Open the complete generated project before retrying.",
    );
  }
  const frontendRoot = await detectFrontendRoot(workspaceRoot, sourceFiles);
  const nativeNpmWorkspace = frontendRoot === "ui" &&
    await exists(path.join(workspaceRoot, "package.json")) &&
    await exists(path.join(workspaceRoot, "typescript-redux-query/package.json"));
  const openApiCandidates = [
    ...(backendRoot === "." ? [] : ["spring-server/src/main/resources/openapi.yaml"]),
    "src/main/resources/openapi/api-out.yaml",
    "src/main/resources/openapi/api.yaml",
    "src/main/resources/openapi/openapi.yaml",
  ].map((candidate) => backendRoot === "." || candidate.startsWith("spring-server/") ? candidate : path.posix.join(backendRoot, candidate));
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
    backendRoot,
    openApiInputPath,
    ...(frontendRoot
      ? {
          frontendRoot,
          thorapiClientPath: nativeNpmWorkspace ? "typescript-redux-query" : toPosix(path.join(frontendRoot, "src", "thorapi")),
          packageManager: nativeNpmWorkspace ? "npm" as const : "yarn" as const,
        }
      : {}),
    fileCount: sourceFiles.length,
    sourceBytes,
  };
}

function manifestPath(value: unknown, label: string, rootAllowed = false): string {
  if (rootAllowed && value === ".") return ".";
  if (typeof value !== "string") throw new Error(`${label} is required in ${MANIFEST_FILE}.`);
  try { return safeProjectRelativePath(value); }
  catch { throw new Error(`${label} must stay inside the source project.`); }
}

function assertCredentialFreeManifest(value: unknown, depth = 0): void {
  if (depth > 16) throw new Error("The deployment manifest is too deeply nested.");
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(authorization|credentials?|api.?key|password|secret|(?:access|refresh|jwt|github)[-_]?token|token)$/i.test(key))
      throw new Error("Remove credentials from the deployment manifest; use the existing authorized account connection.");
    assertCredentialFreeManifest(child, depth + 1);
  }
}

async function validateSourceManifest(root: string, applicationId: string, manifest: ApplicationSourceManifest,
    files: Array<{ relative: string }>): Promise<void> {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || manifest.schemaVersion !== 1 ||
      manifest.applicationId !== applicationId || manifest.runtimeTemplate !== "java_spring_boot")
    throw new Error("The deployment manifest belongs to another Application or uses an unsupported runtime. Open the complete canonical Application project.");
  assertCredentialFreeManifest(manifest);
  const backend = manifestPath(manifest.backendRoot, "backendRoot", true);
  const input = manifestPath(manifest.openApiInputPath, "openApiInputPath");
  const within = (parent: string, child: string) => parent === "." || child.startsWith(parent + "/");
  if (!within(backend, input) || !/\.ya?ml$/.test(input))
    throw new Error("openApiInputPath must be a YAML file inside backendRoot.");
  const paths = new Set(files.map(file => file.relative));
  const requireFile = (relative: string) => {
    if (!paths.has(relative)) throw new Error(`Publish the complete project, including ${relative}; check its source ignore rules.`);
  };
  requireFile(toPosix(path.join(backend, "pom.xml"))); requireFile(input);
  if (manifest.frontendRoot != null) {
    const frontend = manifestPath(manifest.frontendRoot, "frontendRoot", true);
    const sdk = manifestPath(manifest.thorapiClientPath, "thorapiClientPath");
    requireFile(toPosix(path.join(frontend, "package.json")));
    if (manifest.packageManager === "npm") {
      if (frontend !== "ui" || sdk !== "typescript-redux-query")
        throw new Error("The generated npm workspace needs frontendRoot ui and thorapiClientPath typescript-redux-query.");
      requireFile("package.json"); requireFile("typescript-redux-query/package.json");
      let pkg: any, client: any;
      try {
        pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
        client = JSON.parse(await fs.readFile(path.join(root, sdk, "package.json"), "utf8"));
      } catch { throw new Error("Repair the root workspace and local client package.json files before publishing."); }
      if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.includes("ui") || !pkg.workspaces.includes(sdk) || client.name !== "@valkyrai/thorapi")
        throw new Error("Restore the complete root npm workspace and its local @valkyrai/thorapi client before publishing.");
    } else if (manifest.packageManager !== "yarn" || !within(frontend, sdk) || path.posix.basename(sdk) !== "thorapi") {
      throw new Error("Declare the generated npm workspace or a Yarn frontend with its thorapi folder inside frontendRoot.");
    }
  } else if (manifest.thorapiClientPath != null || manifest.packageManager != null) {
    throw new Error("frontendRoot is required when declaring a frontend package manager or client.");
  }
}

export async function createApplicationSourceArchive(workspaceRoot: string, applicationId: string,
    applicationName = applicationId): Promise<ApplicationSourceArchive> {
  await assertNoProjectLinks(workspaceRoot);
  const matcher = await sourceIgnoreMatcher(workspaceRoot);
  const { files } = await collectSourceFiles(workspaceRoot, matcher);
  let manifestBytes: Buffer;
  let manifest: ApplicationSourceManifest;
  await assertNoProjectLinks(workspaceRoot, MANIFEST_FILE);
  if (await exists(path.join(workspaceRoot, MANIFEST_FILE))) {
    manifestBytes = await fs.readFile(path.join(workspaceRoot, MANIFEST_FILE));
    if (manifestBytes.length > 65536) throw new Error("The deployment manifest exceeds 64 KiB.");
    try { manifest = JSON.parse(manifestBytes.toString("utf8")); }
    catch { throw new Error("Repair the committed deployment manifest JSON before publishing source."); }
  } else {
    manifest = await createManifest(workspaceRoot, applicationId, applicationName, files, 0);
    manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  }
  await validateSourceManifest(workspaceRoot, applicationId, manifest, files);
  const archive = new AdmZip(); let sourceBytes = 0;
  for (const file of files) {
    const bytes = await fs.readFile(file.absolute); sourceBytes += bytes.length;
    if (sourceBytes > MAX_SOURCE_BYTES) throw new Error("Source snapshot exceeds the 95 MB uncompressed limit.");
    archive.addFile(file.relative, bytes);
  }
  if (!(await exists(path.join(workspaceRoot, MANIFEST_FILE)))) {
    manifest.fileCount = files.length; manifest.sourceBytes = sourceBytes;
    manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  }
  // Preserve committed manifest bytes and generator policy/lineage; never strip the declared OpenAPI input.
  archive.addFile(MANIFEST_FILE, manifestBytes);
  for (const entry of archive.getEntries()) entry.header.time = new Date(1980, 0, 1);
  const buffer = archive.toBuffer();
  if (buffer.length > MAX_SOURCE_BYTES) throw new Error("Compressed source snapshot exceeds the 95 MB upload limit.");
  return { buffer, manifest, checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"), fileCount: files.length, sourceBytes };
}

interface SourcePublicationRecovery {
  schemaVersion: 1; applicationId: string; backend: string; checksumSha256: string;
  originalGeneratorChecksum: string; expectedArtifactRef: string | null; result?: ApplicationSourcePublishResult;
}

function publishedSource(value: ApplicationSourcePublishResult | undefined, applicationId: string,
    archive: ApplicationSourceArchive): ApplicationSourcePublishResult | undefined {
  if (!value) return undefined;
  if (value.applicationId !== applicationId || !PROJECT_UUID.test(value.artifactId) ||
      value.revisionRef !== `source-snapshot:${applicationId}:${value.artifactId}` ||
      value.checksumSha256 !== archive.checksumSha256 || value.sizeBytes !== archive.buffer.length ||
      typeof value.createdAt !== "string" || !["validated", "superseded"].includes(value.status))
    throw new Error("The backend returned a different or invalid immutable source revision. No source selection was changed.");
  return { applicationId, artifactId: value.artifactId, revisionRef: value.revisionRef, checksumSha256: value.checksumSha256,
    sizeBytes: value.sizeBytes, createdAt: value.createdAt, status: value.status, manifest: archive.manifest };
}

async function savePublication(root: string, value: SourcePublicationRecovery): Promise<void> {
  await assertNoProjectLinks(root, SOURCE_PUBLICATION_MARKER);
  const file = path.join(root, SOURCE_PUBLICATION_MARKER);
  const temporary = file + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
  try { await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 }); await fs.rename(temporary, file); }
  finally { await fs.rm(temporary, { force: true }); }
}

async function readPublication(root: string): Promise<SourcePublicationRecovery | undefined> {
  await assertNoProjectLinks(root, SOURCE_PUBLICATION_MARKER);
  try {
    const bytes = await fs.readFile(path.join(root, SOURCE_PUBLICATION_MARKER));
    if (bytes.length > 131072) throw new Error("Source publication recovery metadata exceeds its limit.");
    let value: SourcePublicationRecovery;
    try { value = JSON.parse(bytes.toString("utf8")); }
    catch { throw new Error("Review the saved source publication metadata JSON before retrying."); }
    if (value.schemaVersion !== 1 || !PROJECT_UUID.test(value.applicationId) || typeof value.backend !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.checksumSha256) || !/^[a-f0-9]{64}$/.test(value.originalGeneratorChecksum) ||
        (value.expectedArtifactRef !== null && (typeof value.expectedArtifactRef !== "string" || value.expectedArtifactRef.length > 512)))
      throw new Error("Review the saved source publication metadata before retrying.");
    return value;
  } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

export async function publishApplicationSource({ context, applicationId, applicationName = applicationId,
    onProgress }: PublishApplicationSourceRequest): Promise<ApplicationSourcePublishResult> {
  const workspaceRoot = getWorkspacePath();
  if (!workspaceRoot) throw new Error("Open the complete canonical Application project before publishing source.");
  if (!PROJECT_UUID.test(applicationId)) throw new Error("Choose the canonical Application before publishing source.");
  const key = workspaceRoot + ":" + applicationId;
  if (activePublications.has(key)) throw new Error("This Application source is already being published. Wait for it to finish before retrying.");
  activePublications.add(key);
  try {
    const backend = normalizeBlueprintBackend(getValkyraiBasePath());
    const jwtToken = await getSecret(context, "jwtToken");
    if (!jwtToken) throw new Error("Sign in to the Application's authorized account before publishing source.");
    const blueprint = await readProjectBlueprintState(workspaceRoot);
    const generation = await readGenerationManifest(workspaceRoot);
    if ((blueprint && (blueprint.applicationId !== applicationId || blueprint.backend && normalizeBlueprintBackend(blueprint.backend) !== backend)) ||
        generation && generation.applicationId !== applicationId)
      throw new Error("This project belongs to another Application or backend. Reconnect its original authorized account before publishing.");
    const options: SourceHandoffOptions = { backend, applicationId, jwtToken, sourceKind: "upload", assertCurrent: async () => {
      if (normalizeBlueprintBackend(getValkyraiBasePath()) !== backend || await getSecret(context, "jwtToken") !== jwtToken)
        throw new Error("The backend or session changed. Return to this Application's original account and retry its immutable source publication.");
    } };
    await onProgress?.("Packaging source with its committed manifest and generator protection policy...");
    const archive = await createApplicationSourceArchive(workspaceRoot, applicationId, applicationName);
    const zip = new AdmZip(archive.buffer);
    const lineageEntry = zip.getEntry("generation-lineage.json"), originalEntry = zip.getEntry("export-reference/generator-original.zip");
    if (await exists(path.join(workspaceRoot, ".valoride-generator-ignore")) && !zip.getEntry(".valoride-generator-ignore"))
      throw new Error("The committed generator protection policy was excluded from source. Review the source ignore rules before publishing; your protected edits were preserved.");
    if (!lineageEntry || !originalEntry)
      throw new Error("Open the complete canonical project export, including generation-lineage.json and export-reference/generator-original.zip, before selecting source for generation.");
    let lineage: { applicationId: string; originalGeneratorChecksumSha256: string };
    try { lineage = JSON.parse(lineageEntry.getData().toString("utf8")); }
    catch { throw new Error("The canonical generation lineage is invalid. Re-import its complete project export before publishing."); }
    const originalGeneratorChecksum = crypto.createHash("sha256").update(originalEntry.getData()).digest("hex");
    if (lineage.applicationId !== applicationId || lineage.originalGeneratorChecksumSha256 !== originalGeneratorChecksum)
      throw new Error("The immutable generator baseline does not match this Application. Re-import its complete canonical export before publishing.");
    let pending = await readPublication(workspaceRoot);
    if (pending && (pending.applicationId !== applicationId || pending.backend !== backend ||
        pending.checksumSha256 !== archive.checksumSha256 || pending.originalGeneratorChecksum !== originalGeneratorChecksum))
      throw new Error("Source or account changed after an interrupted publication. Keep your edits and review " + SOURCE_PUBLICATION_MARKER + " before publishing a different revision.");
    await options.assertCurrent();
    if (!pending) {
      const current = await applicationSourceSelection(options);
      pending = { schemaVersion: 1, applicationId, backend, checksumSha256: archive.checksumSha256,
        originalGeneratorChecksum, expectedArtifactRef: current.artifactRef ?? null };
      await savePublication(workspaceRoot, pending);
    }
    let result = pending.result ? publishedSource(pending.result, applicationId, archive) : undefined;
    if (!result) {
      // Recover a lost upload response using the exact checksum, never mutable branch HEAD or another source.
      const latest = await latestPublishedApplicationSource<ApplicationSourcePublishResult>(options);
      if (latest?.checksumSha256 === archive.checksumSha256) result = publishedSource(latest, applicationId, archive);
    }
    if (!result) {
      const formData = new FormData();
      const filename = `${applicationName.replace(/[^A-Za-z0-9._-]/g, "-")}-source.zip`;
      formData.append("file", new Blob([new Uint8Array(archive.buffer)], { type: "application/zip" }), filename);
      await options.assertCurrent();
      await onProgress?.(`Uploading ${archive.fileCount.toLocaleString()} source files to the authorized Application...`);
      let response: { data: ApplicationSourcePublishResult };
      try {
        response = await getValkyrLabsRtkApiClient().request<ApplicationSourcePublishResult>({
          url: `${backend}/thorapi/applications/${encodeURIComponent(applicationId)}/source-snapshots`, method: "POST", body: formData,
          headers: { Authorization: `Bearer ${jwtToken}` }, responseType: "json", redirect: "error", maxResponseBytes: 1024 * 1024,
        });
      } catch (error) {
        const status = error instanceof ValkyrLabsApiError ? error.status : undefined;
        throw new Error(`Source upload${status ? ` (${status})` : ""} was interrupted or rejected. Reconnect the authorized account and retry this exact source; credential-free recovery metadata is saved in ${SOURCE_PUBLICATION_MARKER}.`);
      }
      result = publishedSource(response.data, applicationId, archive);
      if (!result) throw new Error("The backend returned no immutable source revision.");
      pending.result = result; await savePublication(workspaceRoot, pending);
    } else {
      pending.result = result; await savePublication(workspaceRoot, pending);
    }
    await options.assertCurrent();
    await onProgress?.(`Selecting immutable source revision ${result.revisionRef}...`);
    let sourceRevision: DeveloperSourceRevision;
    try { sourceRevision = await selectPublishedApplicationSource(options, result, pending.expectedArtifactRef, originalGeneratorChecksum); }
    catch (error) {
      throw new Error(`Uploaded revision ${result.revisionRef} remains intact. ${error instanceof Error ? error.message : "Reconnect and retry selecting that exact source."}`);
    }
    await options.assertCurrent();
    await fs.rm(path.join(workspaceRoot, SOURCE_PUBLICATION_MARKER), { force: true });
    await onProgress?.(`Selected immutable source revision ${result.revisionRef} for the next generation.`);
    return { ...result, selected: true, sourceRevision };
  } finally { activePublications.delete(key); }
}
