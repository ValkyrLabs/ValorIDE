import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { PathAccess } from "../access/PathAccess";

export interface BuildModeFileWriteCommand {
  content: string;
  targetPath: string;
}

export interface BuildModeFileWriteResult {
  bytesDelta: number;
  filePath: string;
  postHash: string;
}

export const parseBuildModeFileWriteCommand = (
  command: string,
): BuildModeFileWriteCommand | undefined => {
  const match = command.match(
    /^file-write:(?<targetPath>\S+)\s+content:(?<content>"(?:\\.|[^"])*"|'(?:\\.|[^'])*')$/s,
  );
  if (!match?.groups) {
    return undefined;
  }
  return {
    content: unquoteBuildModeFileWriteValue(match.groups.content),
    targetPath: match.groups.targetPath,
  };
};

export const executeBuildModeFileWriteCommand = async ({
  command,
  pathAccess,
  workspaceRoot,
}: {
  command: BuildModeFileWriteCommand;
  pathAccess: PathAccess;
  workspaceRoot: string;
}): Promise<BuildModeFileWriteResult> => {
  if (!pathAccess.validateAccess(command.targetPath)) {
    const rejection = pathAccess.getLastRejection();
    throw new Error(
      `Build Mode file write is outside the allowed workspace scope: ${
        rejection?.reason ?? command.targetPath
      }.`,
    );
  }

  const absolutePath = pathAccess.resolve(command.targetPath);
  const relativePath = path.relative(workspaceRoot, absolutePath);
  let previousBytes = 0;
  try {
    previousBytes = Buffer.byteLength(await fs.readFile(absolutePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, command.content, "utf8");
  const nextBytes = Buffer.byteLength(command.content, "utf8");
  const postHash = crypto
    .createHash("sha256")
    .update(command.content)
    .digest("hex");

  return {
    bytesDelta: nextBytes - previousBytes,
    filePath: relativePath.split(path.sep).join("/"),
    postHash,
  };
};

const unquoteBuildModeFileWriteValue = (value: string): string =>
  value
    .slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
