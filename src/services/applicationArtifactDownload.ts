import axios from "axios";
import fs from "fs/promises";
import * as path from "path";
import { getReadablePath, getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import { extractLocalZip, isZipBuffer } from "@utils/zipExtractor";

export interface ApplicationArtifactDownloadRequest {
  applicationId: string;
  applicationName?: string;
  jwtToken: string;
  onProgress?: (message: string) => void | Promise<void>;
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
  const raw = decodeURIComponent(
    match?.[1] || match?.[2] || `${applicationId}.zip`,
  );
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
}: ApplicationArtifactDownloadRequest): Promise<ApplicationArtifactDownloadResult> {
  const workspaceRoot = getWorkspacePath();
  if (!workspaceRoot) {
    throw new Error("Open a workspace before downloading generated artifacts.");
  }

  await onProgress?.(
    "Generating the canonical application artifact in ValkyrAI...",
  );
  const response = await axios.post<ArrayBuffer>(
    `${getValkyraiBasePath()}/thorapi/generate/${encodeURIComponent(applicationId)}`,
    undefined,
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        jwtSession: jwtToken,
      },
      responseType: "arraybuffer",
      timeout: 10 * 60_000,
    },
  );

  const archive = Buffer.from(response.data);
  if (!isZipBuffer(archive)) {
    throw new Error("ValkyrAI returned a non-ZIP generation response.");
  }

  const filename = filenameFromDisposition(
    response.headers["content-disposition"],
    applicationId,
  );
  const thorapiRoot = resolveThorapiFolderPath(workspaceRoot);
  await fs.mkdir(thorapiRoot, { recursive: true });
  const archivePath = path.join(thorapiRoot, filename);
  await fs.writeFile(archivePath, archive);

  try {
    await onProgress?.(
      "Extracting the refreshed artifact into the thorapi folder...",
    );
    const extractedPath = await extractLocalZip(
      archivePath,
      thorapiRoot,
      applicationName || applicationId,
    );
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
      `Downloaded to ${getReadablePath(workspaceRoot, extractedPath)}`,
    );
    return { extractedPath, filename };
  } finally {
    await fs.unlink(archivePath).catch(() => undefined);
  }
}

export { filenameFromDisposition };
