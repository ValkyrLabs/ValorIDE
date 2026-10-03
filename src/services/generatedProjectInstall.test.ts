import fs from "fs/promises";
import os from "os";
import path from "path";
import { canonicalProjectFolder, generatedProjectDestination, GENERATION_MARKER, installGeneratedProject, readGenerationManifest } from "./generatedProjectInstall";
import { describeGeneratedProject, listGeneratedProjects } from "../integrations/explorer/generatedProjects";

describe("canonical generated project downloads", () => {
  let root: string;
  let incoming: string;
  let parent: string;
  const identity = { applicationId: "11111111-1111-4111-8111-111111111111", applicationName: "Useful App", applicationVersion: "1.2.0" };
  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-merge-")));
    incoming = path.join(root, "incoming"); parent = path.join(root, "projects");
    await fs.mkdir(incoming); await fs.writeFile(path.join(incoming, "generated.ts"), "first");
  });
  afterEach(async () => fs.rm(root, { recursive: true, force: true }));
  const install = () => installGeneratedProject(incoming, parent, identity);

  it("uses the project name and API version and discovers both parent and standalone roots", async () => {
    const first = await install();
    expect(first.extractedPath).toBe(path.join(parent, "Useful-App-v1.2.0"));
    expect(first.extractedPath).not.toContain(identity.applicationId);
    expect((await listGeneratedProjects(parent))[0]).toMatchObject({ name: "Useful App v1.2.0", directory: first.extractedPath });
    expect(await describeGeneratedProject(first.extractedPath)).toMatchObject({ version: "1.2.0" });
    expect((await readGenerationManifest(first.extractedPath))?.files["generated.ts"].appliedHash).toMatch(/^[a-f0-9]{64}$/);
    const second = await install(); expect(second.extractedPath).toBe(first.extractedPath);
    expect(await fs.readdir(parent)).toEqual(["Useful-App-v1.2.0"]);
    expect(await generatedProjectDestination(first.extractedPath, path.join(first.extractedPath, ".thorapi"), identity.applicationId)).toEqual({ parent, standalone: true });
    expect(await generatedProjectDestination(root, parent, identity.applicationId)).toEqual({ parent, standalone: false });
  });

  it("overwrites unchanged generated code, preserves edited/new files and user deletions, and separates versions", async () => {
    await fs.writeFile(path.join(incoming, "edited.ts"), "generated");
    await fs.writeFile(path.join(incoming, "deleted.ts"), "generated");
    const first = await install();
    await fs.writeFile(path.join(first.extractedPath, "edited.ts"), "hand edited");
    await fs.writeFile(path.join(first.extractedPath, "custom.ts"), "custom");
    await fs.unlink(path.join(first.extractedPath, "deleted.ts"));
    await fs.writeFile(path.join(incoming, "generated.ts"), "second");
    await fs.writeFile(path.join(incoming, "edited.ts"), "regenerated");
    await fs.writeFile(path.join(incoming, "custom.ts"), "new generated collision");
    const second = await install();
    expect(second.preservedFiles.sort()).toEqual(["custom.ts", "deleted.ts", "edited.ts"]);
    expect(await fs.readFile(path.join(first.extractedPath, "generated.ts"), "utf8")).toBe("second");
    expect(await fs.readFile(path.join(first.extractedPath, "edited.ts"), "utf8")).toBe("hand edited");
    expect(await fs.readFile(path.join(first.extractedPath, "custom.ts"), "utf8")).toBe("custom");
    await expect(fs.access(path.join(first.extractedPath, "deleted.ts"))).rejects.toThrow();
    const next = await installGeneratedProject(incoming, parent, { ...identity, applicationVersion: "2.0.0" });
    expect(next.extractedPath).toBe(path.join(parent, "Useful-App-v2.0.0"));
    expect(await fs.readFile(path.join(first.extractedPath, "edited.ts"), "utf8")).toBe("hand edited");
  });

  it("preserves an unknown baseline and rejects a name/version collision with another application", async () => {
    const target = path.join(parent, canonicalProjectFolder(identity.applicationName, identity.applicationVersion));
    await fs.mkdir(target, { recursive: true }); await fs.writeFile(path.join(target, "generated.ts"), "unknown existing");
    expect((await install()).preservedFiles).toEqual(["generated.ts"]);
    await expect(installGeneratedProject(incoming, parent, { ...identity, applicationId: "22222222-2222-4222-8222-222222222222" })).rejects.toThrow(/another application/i);
    expect(await fs.readFile(path.join(target, "generated.ts"), "utf8")).toBe("unknown existing");
  });

  it("recovers a write-ahead baseline after interruption and still preserves edits made before retry", async () => {
    await fs.writeFile(path.join(incoming, "z.ts"), "old");
    const first = await install();
    await fs.writeFile(path.join(incoming, "generated.ts"), "new"); await fs.writeFile(path.join(incoming, "z.ts"), "new z");
    let checks = 0;
    await expect(installGeneratedProject(incoming, parent, identity, () => { if (++checks === 4) throw new Error("interrupted"); })).rejects.toThrow("interrupted");
    expect(await fs.readFile(path.join(first.extractedPath, "generated.ts"), "utf8")).toBe("new");
    await fs.writeFile(path.join(first.extractedPath, "generated.ts"), "edited after interruption");
    const retried = await install();
    expect(retried.preservedFiles).toEqual(["generated.ts"]);
    expect(await fs.readFile(path.join(first.extractedPath, "generated.ts"), "utf8")).toBe("edited after interruption");
    expect(await fs.readFile(path.join(first.extractedPath, "z.ts"), "utf8")).toBe("new z");
  });

  it("rejects reserved metadata and output links before changing any files", async () => {
    const first = await install(); const outside = path.join(root, "outside"); await fs.mkdir(outside);
    await fs.mkdir(path.join(incoming, "linked")); await fs.writeFile(path.join(incoming, "linked/x.ts"), "escape");
    await fs.symlink(outside, path.join(first.extractedPath, "linked"));
    await fs.writeFile(path.join(incoming, "generated.ts"), "do not write");
    await expect(install()).rejects.toThrow(/symbolic link/i);
    expect(await fs.readFile(path.join(first.extractedPath, "generated.ts"), "utf8")).toBe("first");
    expect(await fs.readdir(outside)).toEqual([]);
    await fs.unlink(path.join(first.extractedPath, "linked"));
    await fs.writeFile(path.join(incoming, GENERATION_MARKER), "malicious");
    await expect(install()).rejects.toThrow(/reserved/i);
    expect(await fs.readFile(path.join(first.extractedPath, "generated.ts"), "utf8")).toBe("first");
  });

  it("rejects malformed versions and supports legacy project display", async () => {
    for (const version of ["../2", "1/2", "1..2", "", "$(bad)"]) expect(() => canonicalProjectFolder("Good", version)).toThrow(/version/i);
    expect(canonicalProjectFolder("../../Good App", "1.0.0")).toBe("Good-App-v1.0.0");
    const legacy = path.join(parent, "v1.OldApp"); await fs.mkdir(legacy, { recursive: true });
    expect(await describeGeneratedProject(legacy)).toMatchObject({ version: "1", name: "v1.OldApp" });
  });
});
