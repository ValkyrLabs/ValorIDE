import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  decodeBuildModeDataUrl,
  persistBuildModeArtifact,
  resolveBuildModeArtifactUri,
} from "./BuildModeArtifactStore";

describe("BuildModeArtifactStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "valor-artifacts-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("persists Build Mode artifacts under sanitized task and command paths", async () => {
    const artifact = await persistBuildModeArtifact({
      artifactId: "attempt:1",
      commandId: "cmd/test",
      content: "tests passed",
      extension: "txt",
      globalStoragePath: tempDir,
      kind: "command_stdout",
      taskId: "task:alpha",
    });

    await expect(fs.readFile(artifact.filePath, "utf8")).resolves.toBe(
      "tests passed",
    );
    expect(artifact.filePath).toContain(
      path.join(
        "build-mode",
        "artifacts",
        "task-alpha",
        "cmd-test",
        "attempt-1-command_stdout.txt",
      ),
    );
    expect(artifact.uri).toBe(
      "valoride://build-mode/artifacts/task-alpha/cmd-test/attempt-1-command_stdout.txt",
    );
  });

  it("decodes browser screenshot data urls for durable artifact writes", () => {
    const decoded = decodeBuildModeDataUrl(
      `data:image/webp;base64,${Buffer.from("image-bytes").toString("base64")}`,
    );

    expect(decoded).toMatchObject({
      extension: "webp",
      mimeType: "image/webp",
    });
    expect(decoded?.buffer.toString("utf8")).toBe("image-bytes");
  });

  it("redacts secret material before persisting text artifacts", async () => {
    const artifact = await persistBuildModeArtifact({
      artifactId: "attempt-secret",
      commandId: "cmd-test",
      content:
        "OPENAI_API_KEY=sk-live-secretvalue1234567890 Authorization: Bearer secret-token token=secret-value",
      extension: "log",
      globalStoragePath: tempDir,
      kind: "browser_console",
      taskId: "task-alpha",
    });

    const stored = await fs.readFile(artifact.filePath, "utf8");
    expect(stored).toContain("OPENAI_API_KEY=<redacted>");
    expect(stored).toContain("Authorization: Bearer <redacted-secret>");
    expect(stored).toContain("token=<redacted>");
    expect(stored).not.toContain("sk-live-secretvalue1234567890");
    expect(stored).not.toContain("secret-token");
    expect(stored).not.toContain("secret-value");
  });

  it("resolves stored artifact uris without allowing path traversal", async () => {
    const artifact = await persistBuildModeArtifact({
      artifactId: "attempt-1",
      commandId: "cmd-test",
      content: "output",
      extension: "txt",
      globalStoragePath: tempDir,
      kind: "command_stdout",
      taskId: "task-alpha",
    });

    expect(resolveBuildModeArtifactUri(tempDir, artifact.uri)).toBe(
      artifact.filePath,
    );
    expect(
      resolveBuildModeArtifactUri(
        tempDir,
        "valoride://build-mode/artifacts/task-alpha/cmd-test/%2E%2E%2Fsecret.txt",
      ),
    ).toBeUndefined();
    expect(
      resolveBuildModeArtifactUri(
        tempDir,
        "valoride://build-mode/commands/cmd-test/command_stdout",
      ),
    ).toBeUndefined();
  });
});
