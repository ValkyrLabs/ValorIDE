import fs from "fs/promises";
import os from "os";
import path from "path";
import { PathAccess } from "../access/PathAccess";
import {
  executeBuildModeFileReadCommand,
  parseBuildModeFileReadCommand,
} from "./BuildModeFileReadCommand";

describe("BuildModeFileReadCommand", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-file-read-"),
    );
  });

  afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it("parses file-read commands with optional byte limits", () => {
    expect(
      parseBuildModeFileReadCommand("file-read:src/App.tsx maxBytes:128"),
    ).toEqual({
      maxBytes: 128,
      targetPath: "src/App.tsx",
    });
  });

  it("reads workspace files and returns metadata without mutating content", async () => {
    await fs.mkdir(path.join(workspaceRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "src/App.tsx"), "line 1\nline 2");

    const result = await executeBuildModeFileReadCommand({
      command: {
        maxBytes: 64,
        targetPath: "src/App.tsx",
      },
      pathAccess: new PathAccess({ workspaceRoot }),
      workspaceRoot,
    });

    expect(result).toMatchObject({
      byteSize: 13,
      content: "line 1\nline 2",
      filePath: "src/App.tsx",
      lineCount: 2,
      truncated: false,
    });
    expect(result.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("truncates large reads to the requested max bytes", async () => {
    await fs.mkdir(path.join(workspaceRoot, "docs"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "docs/long.txt"), "abcdef");

    const result = await executeBuildModeFileReadCommand({
      command: {
        maxBytes: 3,
        targetPath: "docs/long.txt",
      },
      pathAccess: new PathAccess({ workspaceRoot }),
      workspaceRoot,
    });

    expect(result).toMatchObject({
      byteSize: 6,
      content: "abc",
      filePath: "docs/long.txt",
      truncated: true,
    });
  });

  it("blocks reads denied by .valorideignore", async () => {
    await fs.mkdir(path.join(workspaceRoot, "secrets"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, ".valorideignore"), "secrets/\n");
    await fs.writeFile(path.join(workspaceRoot, "secrets/token.txt"), "secret");

    await expect(
      executeBuildModeFileReadCommand({
        command: {
          maxBytes: 64,
          targetPath: "secrets/token.txt",
        },
        pathAccess: new PathAccess({ workspaceRoot }),
        workspaceRoot,
      }),
    ).rejects.toThrow(
      "Build Mode file read is outside the allowed workspace scope: deny-pattern.",
    );
  });
});
