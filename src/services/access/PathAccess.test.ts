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

  it("allows workspace files when no .valoriderules is present", () => {
    const access = new PathAccess({ workspaceRoot });
    expect(
      access.validateAccess("node_modules/package/index.js"),
    ).toBeTruthy();
  });

  it("blocks default deny globs once .valoriderules exists", async () => {
    await fsp.writeFile(path.join(workspaceRoot, ".valoriderules"), "");
    const access = new PathAccess({ workspaceRoot });
    expect(
      access.validateAccess("node_modules/package/index.js"),
    ).toBeFalsy();
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
});
