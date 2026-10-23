import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { installGeneratedProject, readGenerationManifest } from "./generatedProjectInstall";
import { GENERATOR_POLICY, parseGeneratorPolicy } from "./generatedProjectPolicy";

const exec = promisify(execFile);
const identity = { applicationId: "11111111-1111-4111-8111-111111111111", applicationName: "Policy", applicationVersion: "1.0.0" };
describe("canonical regeneration ownership and explicit committed overrides", () => {
  let fixture: string; let incoming: string; let parent: string; let project: string;
  const regenerate = (extra: any = {}) => installGeneratedProject(incoming, parent, identity, undefined, { mode: "regenerate", generatedFiles: ["generated.ts"], ...extra });
  beforeEach(async () => {
    fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-policy-")));
    incoming = path.join(fixture, "incoming");parent = path.join(fixture, "projects");await fs.mkdir(incoming);
    await fs.writeFile(path.join(incoming, "generated.ts"), "original generated");
    await fs.writeFile(path.join(incoming, "extension.ts"), "authored extension");
    project = (await installGeneratedProject(incoming, parent, identity, undefined, { mode: "import", generatedFiles: ["generated.ts"] })).extractedPath;
    await fs.writeFile(path.join(project, "generated.ts"), "local generated edit");
    await fs.writeFile(path.join(project, "extension.ts"), "custom subclass/extension");
    await fs.writeFile(path.join(incoming, "generated.ts"), "canonical regenerated");
  });
  afterEach(async () => fs.rm(fixture, { recursive: true, force: true }));

  it("lists and replaces modified known generated files after review, while protecting extensions and unknown collisions", async () => {
    await fs.writeFile(path.join(project, "unknown.ts"), "unknown custom file");
    await fs.writeFile(path.join(incoming, "unknown.ts"), "new generated collision");
    const confirmOverwrite = jest.fn(async () => true);
    const installed = await regenerate({ generatedFiles: ["generated.ts", "unknown.ts"], confirmOverwrite });
    expect(confirmOverwrite).toHaveBeenCalledWith(["generated.ts"]);
    expect(await fs.readFile(path.join(project, "generated.ts"), "utf8")).toBe("canonical regenerated");
    expect(await fs.readFile(path.join(project, "extension.ts"), "utf8")).toBe("custom subclass/extension");
    expect(await fs.readFile(path.join(project, "unknown.ts"), "utf8")).toBe("unknown custom file");
    expect(installed.preservedFiles).toEqual(expect.arrayContaining(["extension.ts", "unknown.ts"]));
    expect((await readGenerationManifest(project))?.generatedFiles).toEqual(["generated.ts", "unknown.ts"]);
  });

  it("cancels before any writes, and refuses destructive regeneration without a review callback", async () => {
    const before = await fs.readFile(path.join(project, ".valoride-generation.json"));
    await expect(regenerate()).rejects.toThrow(/Review replacement.*generated.ts/);
    await expect(regenerate({ confirmOverwrite: () => false })).rejects.toThrow(/cancelled; no project files/);
    expect(await fs.readFile(path.join(project, "generated.ts"), "utf8")).toBe("local generated edit");
    expect(await fs.readFile(path.join(project, ".valoride-generation.json"))).toEqual(before);
  });

  it("uses an exact committed generator policy, including excluded new files, without treating .gitignore as policy", async () => {
    await exec("git", ["init", project]);
    await fs.writeFile(path.join(project, GENERATOR_POLICY), "generated.ts\nfuture.ts\n");
    await exec("git", ["-C", project, "add", GENERATOR_POLICY]);
    await exec("git", ["-C", project, "-c", "user.name=Local Acceptance", "-c", "user.email=fixture@example.invalid", "commit", "-m", "Explicit generator policy"]);
    await fs.writeFile(path.join(incoming, "future.ts"), "new generated file");
    const confirmOverwrite = jest.fn(async () => true);
    const installed = await regenerate({ generatedFiles: ["generated.ts", "future.ts"], confirmOverwrite });
    expect(confirmOverwrite).not.toHaveBeenCalled();expect(installed.preservedFiles).toContain("future.ts");
    await expect(fs.access(path.join(project, "future.ts"))).rejects.toThrow();
    expect(await fs.readFile(path.join(project, "generated.ts"), "utf8")).toBe("local generated edit");
    await fs.rm(path.join(project, GENERATOR_POLICY));await fs.writeFile(path.join(project, ".gitignore"), "generated.ts\n");
    await regenerate({ confirmOverwrite });expect(confirmOverwrite).toHaveBeenCalledWith(["generated.ts"]);
    expect(await fs.readFile(path.join(project, "generated.ts"), "utf8")).toBe("canonical regenerated");
  });

  it("fails closed for an uncommitted or modified policy before changing generated code", async () => {
    await fs.writeFile(path.join(project, GENERATOR_POLICY), "generated.ts\n");
    await expect(regenerate({ confirmOverwrite: () => true })).rejects.toThrow(/Commit .valoride-generator-ignore/);
    expect(await fs.readFile(path.join(project, "generated.ts"), "utf8")).toBe("local generated edit");
  });

  it("restores a deleted owned file only after affected-path review and requires an explicit ownership list", async () => {
    await fs.rm(path.join(project, "generated.ts"));
    const confirmOverwrite = jest.fn(async () => true);await regenerate({ confirmOverwrite });
    expect(confirmOverwrite).toHaveBeenCalledWith(["generated.ts"]);
    expect(await fs.readFile(path.join(project, "generated.ts"), "utf8")).toBe("canonical regenerated");
    await expect(installGeneratedProject(incoming, parent, identity, undefined, { mode: "regenerate" })).rejects.toThrow(/file ownership manifest/);
  });
});

describe("portable generator policy compatibility", () => {
  it("preserves an exact root file without silently protecting same-named nested files", () => {
    const preserve = parseGeneratorPolicy("generated.ts\n");
    expect(preserve("generated.ts")).toBe(true);
    expect(preserve("nested/generated.ts")).toBe(false);
    expect(preserve("generated.ts.map")).toBe(false);
  });

  it("keeps one-level wildcard protection distinct from nested paths", () => {
    const preserve = parseGeneratorPolicy("frontend/*/style.css\n");
    expect(preserve("frontend/theme/style.css")).toBe(true);
    expect(preserve("frontend/theme/mobile/style.css")).toBe(false);
    expect(preserve("other/frontend/theme/style.css")).toBe(false);
  });

  it("uses the canonical double-star and directory rule meanings", () => {
    const preserve = parseGeneratorPolicy("frontend/**/style.css\nassets/\n");
    expect(preserve("frontend/theme/mobile/style.css")).toBe(true);
    expect(preserve("frontend/style.css")).toBe(false);
    expect(preserve("assets/original.png")).toBe(true);
    expect(preserve("assets/brand/original.svg")).toBe(true);
    expect(preserve("other/assets/original.png")).toBe(false);
  });

  it("treats non-wildcard punctuation literally and accepts committed CRLF comments", () => {
    const preserve = parseGeneratorPolicy("# original layout\r\n src/brand+theme?.tsx \r\n\r\n");
    expect(preserve("src/brand+theme?.tsx")).toBe(true);
    expect(preserve("src/brandtheme1.tsx")).toBe(false);
  });

  it.each([
    "!generated.ts", "[ab].tsx", "src\\brand.tsx", "/src/brand.tsx",
    "../brand.tsx", "src/../brand.tsx", "src//brand.tsx", "./brand.tsx",
    ".git/config", ".hg/config", ".svn/config", ".env", "src/.env.local",
    "keys/private.pem", "keys/private.KEY", "C:/brand.tsx", "src/\u0000brand.tsx",
    "x".repeat(2049),
  ])("refuses a policy rejected by canonical regeneration: %s", (rule) => {
    expect(() => parseGeneratorPolicy(rule)).toThrow(/policy/);
  });

  it("retains the canonical policy size and rule-count limits", () => {
    expect(() => parseGeneratorPolicy("#" + "x".repeat(64 * 1024))).toThrow(/64 KiB/);
    const allowed = Array.from({ length: 2000 }, (_, index) => "owned/" + index + ".ts").join("\n");
    expect(parseGeneratorPolicy(allowed)("owned/1999.ts")).toBe(true);
    expect(() => parseGeneratorPolicy(allowed + "\nowned/2000.ts")).toThrow(/too many rules/);
  });
});
