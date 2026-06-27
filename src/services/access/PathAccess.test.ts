import * as path from "path";
import * as os from "os";
import * as fsp from "fs/promises";

import { PathAccess } from "./PathAccess";

describe("PathAccess", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "valoride-path-access-"),
    );
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fsp.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("allows ordinary workspace files when no .valoriderules is present", () => {
    const access = new PathAccess({ workspaceRoot });
    expect(access.validateAccess("src/index.ts")).toBeTruthy();
  });

  it("blocks default deny globs even without .valoriderules", () => {
    const access = new PathAccess({ workspaceRoot });
    expect(access.validateAccess("node_modules/package/index.js")).toBeFalsy();
    expect(access.getLastRejection()).toMatchObject({
      pattern: "**/node_modules/**",
      relativePath: "node_modules/package/index.js",
      reason: "deny-pattern",
    });
    expect(access.validateAccess(".git/config")).toBeFalsy();
    expect(access.getLastRejection()).toMatchObject({
      pattern: "**/.git/**",
      relativePath: ".git/config",
      reason: "deny-pattern",
    });
  });

  it("respects .valorideignore patterns even without .valoriderules", async () => {
    await fsp.writeFile(
      path.join(workspaceRoot, ".valorideignore"),
      "secrets/\n",
    );
    const access = new PathAccess({ workspaceRoot });
    expect(access.validateAccess("secrets/creds.txt")).toBeFalsy();
    expect(access.validateAccess("src/index.ts")).toBeTruthy();
  });

  it("loads ignore includes only from inside the workspace", async () => {
    await fsp.mkdir(path.join(workspaceRoot, ".valoride"), {
      recursive: true,
    });
    await fsp.writeFile(
      path.join(workspaceRoot, ".valoride", "build-mode.ignore"),
      "private/\n",
    );
    await fsp.writeFile(
      path.join(workspaceRoot, ".valorideignore"),
      "!include .valoride/build-mode.ignore\n",
    );

    const access = new PathAccess({ workspaceRoot });

    expect(access.validateAccess("private/config.json")).toBeFalsy();
    expect(access.getLastRejection()).toMatchObject({
      pattern: "**/private/**",
      relativePath: "private/config.json",
      reason: "deny-pattern",
    });
  });

  it("ignores .valorideignore include targets outside the workspace", async () => {
    const outsideRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "valoride-path-access-outside-"),
    );
    try {
      const outsideIgnore = path.join(outsideRoot, "outside.ignore");
      await fsp.writeFile(outsideIgnore, "outside-secret/\n");
      await fsp.writeFile(
        path.join(workspaceRoot, ".valorideignore"),
        `!include ${outsideIgnore}\n`,
      );

      const access = new PathAccess({ workspaceRoot });

      expect(access.validateAccess("outside-secret/token.txt")).toBeTruthy();
    } finally {
      await fsp.rm(outsideRoot, { recursive: true, force: true });
    }
  });

  it("normalizes injected deny globs like .valorideignore directory patterns", () => {
    const access = new PathAccess({
      denyGlobs: ["secrets/"],
      workspaceRoot,
    });

    expect(access.validateAccess("secrets/creds.txt")).toBeFalsy();
    expect(access.getLastRejection()).toMatchObject({
      pattern: "**/secrets/**",
      relativePath: "secrets/creds.txt",
      reason: "deny-pattern",
    });
    expect(access.validateAccess("src/index.ts")).toBeTruthy();
  });
});
