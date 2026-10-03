import fs from "fs/promises";
import AdmZip from "adm-zip";
import { createHash } from "crypto";
import * as path from "path";
import os from "os";
import * as vscode from "vscode";
import { getReadablePath, getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import { extractLocalZip, isZipBuffer } from "@utils/zipExtractor";
import { generateCanonicalArchive } from "./canonicalApplicationGeneration";
import { canonicalProjectFolder, generatedProjectDestination, installGeneratedProject } from "./generatedProjectInstall";
import { connectGeneratedSources, initializeGeneratedProject } from "./generatedProjectConfiguration";

export type ApplicationArtifactStage =
  | "receiving"
  | "processing"
  | "extracting"
  | "finalizing";

const activeGenerations = new Set<string>();

export interface ApplicationArtifactDownloadRequest {
  applicationId: string;
  applicationName?: string;
  applicationVersion?: string;
  jwtToken: string;
  recoveryDirectory?: string;
  fetch?: typeof fetch;
  onProgress?: (
    message: string,
    step: ApplicationArtifactStage,
  ) => void | Promise<void>;
  assertCurrent?: () => void | Promise<void>;
  confirmOverwrite?: (affectedPaths: string[]) => boolean | Promise<boolean>;
}

export interface ApplicationArtifactDownloadResult {
  extractedPath: string;
  filename: string;
  applicationVersion: string;
  preservedFiles: string[];
  configurationWarnings: string[];
  generationReceiptRef: string;
}

const filenameFromDisposition = (
  contentDisposition: string | undefined,
  applicationId: string,
): string => {
  const match = contentDisposition?.match(
    /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i,
  );
  let raw = match?.[1] || match?.[2] || `${applicationId}.zip`;
  if (match?.[1]) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      raw = `${applicationId}.zip`;
    }
  }
  const safe = path
    .basename(raw)
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  return /\.zip$/i.test(safe) ? safe : `${safe || applicationId}.zip`;
};

export async function downloadApplicationArtifact({
  applicationId,
  applicationName,
  applicationVersion,
  jwtToken,
  recoveryDirectory,
  fetch: fetcher,
  onProgress,
  assertCurrent,
  confirmOverwrite,
}: ApplicationArtifactDownloadRequest): Promise<ApplicationArtifactDownloadResult> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      applicationId,
    )
  ) {
    throw new Error(
      "A valid application id is required to generate artifacts.",
    );
  }
  if (!jwtToken.trim())
    throw new Error("Sign in before generating an application.");
  const workspaceRoot = getWorkspacePath();
  if (!workspaceRoot)
    throw new Error("Open a workspace before downloading generated artifacts.");
  if (!applicationName?.trim()) throw new Error("Save a project name before downloading the application.");
  if (applicationVersion) canonicalProjectFolder(applicationName, applicationVersion);
  const backend = getValkyraiBasePath();
  const generationKey = `${workspaceRoot}:${applicationId.toLowerCase()}`;
  if (activeGenerations.has(generationKey))
    throw new Error(
      "This application is already being generated in this workspace.",
    );
  activeGenerations.add(generationKey);
  let stagingRoot: string | undefined;
  const ensureTarget = () => {
    if (getValkyraiBasePath() !== backend)
      throw new Error(
        "The ValkyrAI backend changed during generation. Return to the original backend before retrying.",
      );
    if (getWorkspacePath() !== workspaceRoot)
      throw new Error(
        "The workspace changed during generation. Reopen the original workspace to retry.",
      );
  };
  const ensureCurrent = async () => {
    ensureTarget();
    await assertCurrent?.();
    ensureTarget();
  };
  try {
    await ensureCurrent();
    await onProgress?.(
      "Generating your application in ValkyrAI...",
      "receiving",
    );
    await ensureCurrent();
    const generated = await generateCanonicalArchive({
      backend, workspaceRoot, applicationId, applicationVersion, jwtToken, recoveryDirectory,
      assertCurrent: ensureCurrent, fetch: fetcher,
      onProgress: (message) => onProgress?.(message, "receiving"),
    });
    await ensureCurrent();
    const archive = generated.archive;
    if (!isZipBuffer(archive))
      throw new Error("ValkyrAI returned a non-ZIP generation response.");
    await onProgress?.("Checking the generated archive...", "processing");
    await ensureCurrent();
    const filename = filenameFromDisposition(
      generated.fileName ? `attachment; filename="${generated.fileName}"` : undefined,
      applicationId,
    );
    stagingRoot = await fs.realpath(await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-generation-"),
    ));
    const archivePath = path.join(stagingRoot, filename);
    await fs.writeFile(archivePath, archive);
    await ensureCurrent();
    await onProgress?.("Extracting your project files...", "extracting");
    await ensureCurrent();
    const incomingRoot = await extractLocalZip(
      archivePath,
      stagingRoot,
      applicationName,
      { fresh: true },
    );
    const generatedPaths = async (directory: string, prefix = ""): Promise<string[]> => {
      const files: string[] = [];
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const relative = path.posix.join(prefix, entry.name);
        if (entry.isDirectory()) files.push(...await generatedPaths(path.join(directory, entry.name), relative));
        else if (entry.isFile() && relative !== ".valoride-generator-ignore") files.push(relative);
      }
      return files;
    };
    let generatedFiles = await generatedPaths(incomingRoot);
    const lineageBytes = await fs.readFile(path.join(incomingRoot, "generation-lineage.json")).catch((error) => { if (error.code === "ENOENT") return undefined; throw error; });
    if (lineageBytes) {
      const lineage = JSON.parse(lineageBytes.toString("utf8"));
      const original = await fs.readFile(path.join(incomingRoot, "export-reference/generator-original.zip"));
      if (lineage.applicationId !== applicationId || !/^[a-f0-9]{64}$/.test(lineage.originalGeneratorChecksumSha256 || "") || createHash("sha256").update(original).digest("hex") !== lineage.originalGeneratorChecksumSha256 || !Array.isArray(lineage.generatedFiles))
        throw new Error("The canonical package has invalid generator ownership evidence. Existing project files were preserved.");
      const owned = new AdmZip(original).getEntries().filter((entry) => !entry.isDirectory).map((entry) => entry.entryName).sort();
      if (JSON.stringify([...lineage.generatedFiles].sort()) !== JSON.stringify(owned) || owned.some((relative) => !generatedFiles.includes(relative) || relative === ".valoride-generator-ignore"))
        throw new Error("The original generator ZIP and canonical ownership manifest disagree. Existing project files were preserved.");
      generatedFiles = owned;
    }
    await ensureCurrent();
    // Current generators publish the actual API version in the plan; ZIP names contain an id, not a version.
    let plannedVersion: string | undefined;
    try {
      const plan = JSON.parse(await fs.readFile(path.join(incomingRoot, "generation-plan.json"), "utf8"));
      plannedVersion = typeof plan.api?.version === "string" ? plan.api.version : undefined;
    } catch (error) {
      if (error.code !== "ENOENT") throw new Error("The generated version manifest is invalid. Regenerate from the saved Blueprint.");
    }
    if (plannedVersion && applicationVersion && plannedVersion !== applicationVersion)
      throw new Error("The generated API version changed. Refresh the application list and retry from the current Blueprint.");
    const version = plannedVersion || applicationVersion || filename.match(/^v(\d+(?:\.\d+){0,2})\./i)?.[1];
    if (!version) throw new Error("The archive has no API version. Save OpenAPI info.version and regenerate; existing project files were preserved.");
    canonicalProjectFolder(applicationName, version);
    const configurationWarnings = await initializeGeneratedProject(incomingRoot, applicationName, version);
    await ensureCurrent();
    const destination = await generatedProjectDestination(workspaceRoot, resolveThorapiFolderPath(workspaceRoot), applicationId);
    const { extractedPath, preservedFiles } = await installGeneratedProject(incomingRoot, destination.parent, {
      applicationId, applicationName, applicationVersion: version, generation: generated.provenance,
    }, ensureCurrent, { mode: "regenerate", generatedFiles, confirmOverwrite: confirmOverwrite || (async (affectedPaths) => {
      const preview = await vscode.workspace.openTextDocument({ language: "plaintext", content: `Regeneration replaces these canonical generated files:\n\n${affectedPaths.join("\n")}\n\nCommit .valoride-generator-ignore to protect intentional overrides. Custom extensions and unknown files remain protected.\n` });
      await vscode.window.showTextDocument(preview, { preview: false });
      return await vscode.window.showWarningMessage(`Replace ${affectedPaths.length} generated files with the canonical Blueprint output?`, { modal: true }, "Replace generated files") === "Replace generated files";
    }) });
    await connectGeneratedSources(extractedPath, destination.standalone ? extractedPath : workspaceRoot, configurationWarnings);
    await ensureCurrent();
    await onProgress?.(
      `Ready in ${getReadablePath(workspaceRoot, extractedPath)}${preservedFiles.length ? `; preserved ${preservedFiles.length} edited or existing files` : ""}`,
      "finalizing",
    );
    await generated.complete();
    return { extractedPath, filename, applicationVersion: version, preservedFiles, configurationWarnings, generationReceiptRef: generated.provenance.receiptRef };
  } finally {
    if (stagingRoot)
      await fs
        .rm(stagingRoot, { recursive: true, force: true })
        .catch(() => undefined);
    activeGenerations.delete(generationKey);
  }
}

export { filenameFromDisposition };
