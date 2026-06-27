import fs from "fs/promises";
import os from "os";
import path from "path";
import { PathAccess } from "../access/PathAccess";
import {
  executeBuildModeFileWriteCommand,
  parseBuildModeFileWriteCommand,
} from "./BuildModeFileWriteCommand";

describe("BuildModeFileWriteCommand", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-file-write-"),
    );
  });

  afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it("parses quoted file-write commands with escaped content", () => {
    expect(
      parseBuildModeFileWriteCommand(
        'file-write:src/generated-note.txt content:"hello\\nworld"',
      ),
    ).toEqual({
      content: "hello\nworld",
      targetPath: "src/generated-note.txt",
    });
  });

  it("writes files inside the workspace and returns a post-write hash", async () => {
    const parsed = parseBuildModeFileWriteCommand(
      'file-write:src/generated-note.txt content:"hello world"',
    );

    const result = await executeBuildModeFileWriteCommand({
      command: parsed!,
      pathAccess: new PathAccess({ workspaceRoot }),
      workspaceRoot,
    });

    await expect(
      fs.readFile(path.join(workspaceRoot, "src/generated-note.txt"), "utf8"),
    ).resolves.toBe("hello world");
    expect(result).toMatchObject({
      bytesDelta: 11,
      filePath: "src/generated-note.txt",
    });
    expect(result.postHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reports byte deltas for overwrites", async () => {
    await fs.mkdir(path.join(workspaceRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "src/existing.txt"), "old");

    const result = await executeBuildModeFileWriteCommand({
      command: {
        content: "replacement",
        targetPath: "src/existing.txt",
      },
      pathAccess: new PathAccess({ workspaceRoot }),
      workspaceRoot,
    });

    expect(result.bytesDelta).toBe(8);
    await expect(
      fs.readFile(path.join(workspaceRoot, "src/existing.txt"), "utf8"),
    ).resolves.toBe("replacement");
  });

  it("blocks writes denied by .valorideignore", async () => {
    await fs.writeFile(path.join(workspaceRoot, ".valorideignore"), "secrets/\n");

    await expect(
      executeBuildModeFileWriteCommand({
        command: {
          content: "do not write",
          targetPath: "secrets/token.txt",
        },
        pathAccess: new PathAccess({ workspaceRoot }),
        workspaceRoot,
      }),
    ).rejects.toThrow(
      "Build Mode file write is outside the allowed workspace scope: deny-pattern.",
    );
  });
});
