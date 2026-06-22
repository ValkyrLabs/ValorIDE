import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { redactCommandSecrets } from "./BuildModeCommandPolicy";

export interface BuildModeArtifactWriteRequest {
  artifactId?: string;
  commandId: string;
  content: Buffer | string;
  extension: string;
  globalStoragePath: string;
  kind: string;
  taskId: string;
}

export interface BuildModeArtifactWriteResult {
  filePath: string;
  uri: string;
}

export interface BuildModeDataUrlPayload {
  buffer: Buffer;
  extension: string;
  mimeType: string;
}

export const persistBuildModeArtifact = async (
  request: BuildModeArtifactWriteRequest,
): Promise<BuildModeArtifactWriteResult> => {
  const content = redactArtifactContent(request.content);
  const taskId = sanitizePathSegment(request.taskId);
  const commandId = sanitizePathSegment(request.commandId);
  const kind = sanitizePathSegment(request.kind);
  const artifactId = sanitizePathSegment(
    request.artifactId ?? createArtifactId(content),
  );
  const extension = sanitizeExtension(request.extension);
  const directory = path.join(
    request.globalStoragePath,
    "build-mode",
    "artifacts",
    taskId,
    commandId,
  );
  await fs.mkdir(directory, { recursive: true });
  const filename = `${artifactId}-${kind}.${extension}`;
  const filePath = path.join(directory, filename);
  await fs.writeFile(filePath, content);
  return {
    filePath,
    uri: `valoride://build-mode/artifacts/${encodeURIComponent(
      taskId,
    )}/${encodeURIComponent(commandId)}/${encodeURIComponent(filename)}`,
  };
};

const redactArtifactContent = (content: Buffer | string): Buffer | string =>
  typeof content === "string" ? redactCommandSecrets(content) : content;

export const decodeBuildModeDataUrl = (
  value: string,
): BuildModeDataUrlPayload | undefined => {
  const match = value.match(/^data:(?<mime>[^;,]+);base64,(?<data>.+)$/s);
  const mimeType = match?.groups?.mime;
  const data = match?.groups?.data;
  if (!mimeType || !data) {
    return undefined;
  }
  return {
    buffer: Buffer.from(data, "base64"),
    extension: extensionFromMimeType(mimeType),
    mimeType,
  };
};

export const resolveBuildModeArtifactUri = (
  globalStoragePath: string,
  uri: string,
): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return undefined;
  }
  if (
    parsed.protocol !== "valoride:" ||
    parsed.hostname !== "build-mode" ||
    !parsed.pathname.startsWith("/artifacts/")
  ) {
    return undefined;
  }
  const segments = parsed.pathname
    .split("/")
    .filter(Boolean)
    .slice(1)
    .map((segment) => decodeURIComponent(segment));
  if (
    segments.length !== 3 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\"),
    )
  ) {
    return undefined;
  }
  const artifactRoot = path.resolve(
    globalStoragePath,
    "build-mode",
    "artifacts",
  );
  const filePath = path.resolve(artifactRoot, ...segments);
  const inArtifactRoot =
    filePath === artifactRoot ||
    filePath.startsWith(`${artifactRoot}${path.sep}`);
  return inArtifactRoot ? filePath : undefined;
};

const createArtifactId = (content: Buffer | string): string => {
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `${new Date().toISOString()}-${hash.slice(0, 12)}`;
};

const sanitizePathSegment = (value: string): string =>
  value
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "artifact";

const sanitizeExtension = (value: string): string =>
  value.replace(/[^A-Za-z0-9]+/g, "").slice(0, 16) || "txt";

const extensionFromMimeType = (mimeType: string): string => {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
};
