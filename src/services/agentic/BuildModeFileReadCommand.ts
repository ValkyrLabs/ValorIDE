import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { PathAccess } from "../access/PathAccess";

const DEFAULT_MAX_BYTES = 64 * 1024;
const MAX_BYTES_LIMIT = 1024 * 1024;

export interface BuildModeFileReadCommand {
  maxBytes: number;
  targetPath: string;
}

export interface BuildModeFileReadResult {
  byteSize: number;
  content: string;
  contentHash: string;
  filePath: string;
  lineCount: number;
  truncated: boolean;
}

export const parseBuildModeFileReadCommand = (
  command: string,
): BuildModeFileReadCommand | undefined => {
  const match = command.match(
    /^file-read:(?<targetPath>\S+)(?:\s+maxBytes:(?<maxBytes>\d+))?$/s,
  );
  if (!match?.groups) {
    return undefined;
  }
  return {
    maxBytes: clampMaxBytes(match.groups.maxBytes),
    targetPath: match.groups.targetPath,
  };
};

export const executeBuildModeFileReadCommand = async ({
  command,
  pathAccess,
  workspaceRoot,
}: {
  command: BuildModeFileReadCommand;
  pathAccess: PathAccess;
  workspaceRoot: string;
}): Promise<BuildModeFileReadResult> => {
  if (!pathAccess.validateAccess(command.targetPath)) {
    const rejection = pathAccess.getLastRejection();
    throw new Error(
      `Build Mode file read is outside the allowed workspace scope: ${
        rejection?.reason ?? command.targetPath
      }.`,
    );
  }

  const absolutePath = pathAccess.resolve(command.targetPath);
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) {
    throw new Error(
      `Build Mode file read target is not a regular file: ${command.targetPath}.`,
    );
  }

  const buffer = await fs.readFile(absolutePath);
  const truncated = buffer.byteLength > command.maxBytes;
  const contentBuffer = truncated ? buffer.subarray(0, command.maxBytes) : buffer;
  const content = contentBuffer.toString("utf8");
  const relativePath = path.relative(workspaceRoot, absolutePath);

  return {
    byteSize: buffer.byteLength,
    content,
    contentHash: `sha256:${crypto.createHash("sha256").update(buffer).digest("hex")}`,
    filePath: relativePath.split(path.sep).join("/"),
    lineCount: content.length ? content.split(/\r\n|\r|\n/).length : 0,
    truncated,
  };
};

const clampMaxBytes = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_MAX_BYTES;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_BYTES;
  }
  return Math.min(parsed, MAX_BYTES_LIMIT);
};
