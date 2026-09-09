import fs from "fs/promises";
import * as path from "path";
import os from "os";
import { getReadablePath, getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import { extractLocalZip, isZipBuffer } from "@utils/zipExtractor";
import { getValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";

export type ApplicationArtifactStage =
  | "receiving"
  | "processing"
  | "extracting"
  | "finalizing";

const activeGenerations = new Set<string>();

export interface ApplicationArtifactDownloadRequest {
  applicationId: string;
  applicationName?: string;
  jwtToken: string;
  onProgress?: (
    message: string,
    step: ApplicationArtifactStage,
  ) => void | Promise<void>;
  assertCurrent?: () => void | Promise<void>;
}

export interface ApplicationArtifactDownloadResult {
  extractedPath: string;
  filename: string;
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
  jwtToken,
  onProgress,
  assertCurrent,
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
  const generationKey = `${workspaceRoot}:${applicationId.toLowerCase()}`;
  if (activeGenerations.has(generationKey))
    throw new Error(
      "This application is already being generated in this workspace.",
    );
  activeGenerations.add(generationKey);
  let stagingRoot: string | undefined;
  const ensureCurrent = async () => {
    if (getWorkspacePath() !== workspaceRoot)
      throw new Error(
        "The workspace changed during generation. Reopen the original workspace to retry.",
      );
    await assertCurrent?.();
  };
  try {
    await ensureCurrent();
    await onProgress?.(
      "Generating your application in ValkyrAI...",
      "receiving",
    );
    const response = await getValkyrLabsRtkApiClient().request<ArrayBuffer>({
      url: `${getValkyraiBasePath()}/thorapi/generate/${encodeURIComponent(applicationId)}`,
      method: "POST",
      headers: { Authorization: `Bearer ${jwtToken}`, jwtSession: jwtToken },
      responseType: "arrayBuffer",
    });
    await ensureCurrent();
    const archive = Buffer.from(response.data);
    if (!isZipBuffer(archive))
      throw new Error("ValkyrAI returned a non-ZIP generation response.");
    await onProgress?.("Checking the generated archive...", "processing");
    const filename = filenameFromDisposition(
      response.headers["content-disposition"],
      applicationId,
    );
    stagingRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-generation-"),
    );
    const archivePath = path.join(stagingRoot, filename);
    await fs.writeFile(archivePath, archive);
    // Stable identity keeps applications with identical names from overwriting each other.
    const applicationRoot = path.join(
      resolveThorapiFolderPath(workspaceRoot),
      applicationId.toLowerCase(),
    );
    await fs.mkdir(applicationRoot, { recursive: true });
    await ensureCurrent();
    await onProgress?.("Extracting your project files...", "extracting");
    const extractedPath = await extractLocalZip(
      archivePath,
      applicationRoot,
      applicationName || applicationId,
      { fresh: true },
    );
    await ensureCurrent();
    await fs.writeFile(
      path.join(extractedPath, ".valoride-generation.json"),
      JSON.stringify(
        {
          applicationId,
          applicationName: applicationName || applicationId,
          generatedAt: new Date().toISOString(),
          source: "valkyrai",
          direction: "valkyrai-to-valoride",
          editableUpstreamSurface: "openapi-only",
        },
        null,
        2,
      ),
      "utf8",
    );
    await onProgress?.(
      `Ready in ${getReadablePath(workspaceRoot, extractedPath)}`,
      "finalizing",
    );
    return { extractedPath, filename };
  } finally {
    if (stagingRoot)
      await fs
        .rm(stagingRoot, { recursive: true, force: true })
        .catch(() => undefined);
    activeGenerations.delete(generationKey);
  }
}

export { filenameFromDisposition };
