import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { pullBoundProject, ProjectGitRunner } from "./projectGitPull";
import { withProjectGitOperation } from "./projectGitOperation";

const exec = promisify(execFile);
const gh = "https://github.com/example/app.git";
const bindings = [{ repository: "example/app" }];
const current = async () => undefined;
describe("linked app GitHub pull (real Git, local transport only)", () => {
  let dir: string, origin: string, app: string;
  const run: ProjectGitRunner = async (root, args) => (await exec("git", [
    "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
    "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
    // Only the test fetch is mapped to a disposable repository. No network access.
    ...(args[0] === "fetch" ? ["-c", `url.${origin}.insteadOf=${gh}`] : []), ...args,
  ], {cwd: root})).stdout.trimEnd();
  const commit = async (root: string, content: string, name = "app.txt") => {
    await fs.writeFile(path.join(root, name), content); await run(root, ["add", name]);
    await run(root, ["commit", "-m", content]); return run(root, ["rev-parse", "HEAD"]);
  };
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-pull-"));
    origin = path.join(dir, "upstream"); app = path.join(dir, "app");
    await run(dir, ["init", "-b", "main", origin]); await commit(origin, "one");
    await run(dir, ["clone", origin, app]); await run(app, ["remote", "set-url", "origin", gh]);
  });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });
  it("fast-forwards to exactly the fetched commit and leaves a repeated pull unchanged", async () => {
    const sha = await commit(origin, "two");
    expect(await pullBoundProject(app, bindings, current, run)).toEqual({branch:"main", commit:sha, changed:true});
    expect(await fs.readFile(path.join(app, "app.txt"), "utf8")).toBe("two");
    expect((await pullBoundProject(app, bindings, current, run)).changed).toBe(false);
    expect(await run(app, ["for-each-ref", "refs/valoride"])).toBe("");
  });
  it("never overwrites dirty, divergent or metadata changes", async () => {
    await commit(origin, "remote"); await fs.writeFile(path.join(app, "app.txt"), "dirty");
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/local edits/);
    const local = await commit(app, "local");
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/diverged/);
    expect(await run(app, ["rev-parse", "HEAD"])).toBe(local);
  });
  it("refuses collisions with untracked files and private project markers", async () => {
    await fs.writeFile(path.join(app, "custom.txt"), "local work");
    await commit(origin, "remote work", "custom.txt");
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/refused/);
    expect(await fs.readFile(path.join(app, "custom.txt"), "utf8")).toBe("local work");
    await commit(origin, "bad", ".valoride-generation.json");
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/metadata/);
  });
  it("rejects a nested app, unbound repo, or different push and fetch destinations", async () => {
    const nested = path.join(app, "nested"); await fs.mkdir(nested);
    await expect(pullBoundProject(nested, bindings, current, run)).rejects.toThrow(/rooted/);
    await expect(pullBoundProject(app, [], current, run)).rejects.toThrow(/linked/);
    await run(app, ["remote","set-url","--push","origin","https://github.com/example/different.git"]);
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/linked/);
  });
  it("protects nested app markers and refuses incoming symlinks", async () => {
    await fs.symlink("../outside", path.join(origin, "escape"));
    await run(origin, ["add", "escape"]); await run(origin, ["commit", "-m", "symlink"]);
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/symlink/);
    await fs.mkdir(path.join(origin, "module"));
    await commit(origin, "wrong app", "module/.valoride-blueprint.json");
    await expect(pullBoundProject(app, bindings, current, run)).rejects.toThrow(/metadata/);
    await expect(fs.lstat(path.join(app, "escape"))).rejects.toMatchObject({code: "ENOENT"});
    await expect(fs.lstat(path.join(app, "module"))).rejects.toMatchObject({code: "ENOENT"});
  });
  it("serializes toolbar mutations for the same checkout", async () => {
    await withProjectGitOperation(app, async () => {
      await expect(withProjectGitOperation(app, current)).rejects.toThrow(/already running/);
    });
    await expect(withProjectGitOperation(app, current)).resolves.toBeUndefined();
  });
});
