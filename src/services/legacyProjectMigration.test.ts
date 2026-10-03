import fs from "fs/promises";
import os from "os";
import path from "path";
import { applyLegacyProjectMigration, planLegacyProjectMigration, readLegacyProjectIdentity, undoLegacyProjectMigration } from "./legacyProjectMigration";
import { GENERATION_MARKER, installGeneratedProject, readGenerationManifest } from "./generatedProjectInstall";

describe("reviewed legacy project copies", () => {
  let root: string;
  let source: string;
  const applicationId = "11111111-1111-4111-8111-111111111111";
  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-migration-")));
    source = path.join(root, ".thorapi", applicationId, "Useful App");
    await fs.mkdir(path.join(source, "src"), { recursive: true });
    await fs.writeFile(path.join(source, GENERATION_MARKER), JSON.stringify({ source: "valkyrai", applicationId, applicationName: "Useful App" }));
    await fs.writeFile(path.join(source, "generation-plan.json"), '{"api":{"version":"1.2.0"}}');
    await fs.writeFile(path.join(source, "src/Thing.ts"), "hand edited legacy model");
    await fs.writeFile(path.join(source, ".env"), "fixture-only-private-value");
    await fs.mkdir(path.join(source, "node_modules"));
    await fs.symlink(root, path.join(source, "node_modules", "ignored-cache-link"));
  });
  afterEach(async () => fs.rm(root, { recursive: true, force: true }));

  it("previews without writes, copies outside UUID, keeps the original byte for byte, and parks undo for recovery", async () => {
    const originalMarker = await fs.readFile(path.join(source, GENERATION_MARKER), "utf8");
    const plan = await planLegacyProjectMigration(source);
    expect(plan.destination).toBe(path.join(root, ".thorapi", "Useful-App-v1.2.0"));
    expect(plan.excludedPaths).toEqual([".env", "node_modules"]);
    await expect(fs.access(plan.destination)).rejects.toThrow();
    const receipt = await applyLegacyProjectMigration(plan);
    expect(await fs.readFile(path.join(source, GENERATION_MARKER), "utf8")).toBe(originalMarker);
    expect(await fs.readFile(path.join(source, "src/Thing.ts"), "utf8")).toBe("hand edited legacy model");
    expect(await fs.readFile(path.join(plan.destination, "src/Thing.ts"), "utf8")).toBe("hand edited legacy model");
    await expect(fs.access(path.join(plan.destination, ".env"))).rejects.toThrow();
    await expect(fs.access(path.join(plan.destination, "node_modules"))).rejects.toThrow();
    expect((await readGenerationManifest(plan.destination))?.files).toEqual({});
    await expect(applyLegacyProjectMigration(plan)).rejects.toThrow(/already exists/);
    const recovery = await undoLegacyProjectMigration(receipt);
    await expect(fs.access(plan.destination)).rejects.toThrow();
    expect(await fs.readFile(path.join(recovery, "Useful-App-v1.2.0/src/Thing.ts"), "utf8")).toBe("hand edited legacy model");
    expect(await fs.readFile(path.join(source, "src/Thing.ts"), "utf8")).toBe("hand edited legacy model");
  });

  it("keeps unknown legacy files protected on regeneration", async () => {
    const plan = await planLegacyProjectMigration(source);
    await applyLegacyProjectMigration(plan);
    const incoming = path.join(root, "incoming"); await fs.mkdir(path.join(incoming, "src"), { recursive: true });
    await fs.writeFile(path.join(incoming, "src/Thing.ts"), "regenerated model");
    await fs.writeFile(path.join(incoming, "src/New.ts"), "new model");
    const installed = await installGeneratedProject(incoming, path.dirname(plan.destination), plan.identity);
    expect(installed.preservedFiles).toEqual(["src/Thing.ts"]);
    expect(await fs.readFile(path.join(plan.destination, "src/Thing.ts"), "utf8")).toBe("hand edited legacy model");
    expect(await fs.readFile(path.join(plan.destination, "src/New.ts"), "utf8")).toBe("new model");
  });

  it("rejects stale or altered plans before publishing", async () => {
    const plan = await planLegacyProjectMigration(source);
    await expect(applyLegacyProjectMigration({ ...plan, destination: path.join(root, "elsewhere") })).rejects.toThrow(/plan.*changed/);
    await fs.writeFile(path.join(source, "src/Thing.ts"), "changed after preview");
    await expect(applyLegacyProjectMigration(plan)).rejects.toThrow(/original files changed/);
    await expect(fs.access(plan.destination)).rejects.toThrow();
  });

  it("interrupted copy leaves source untouched, cleans staging and can be retried", async () => {
    const plan = await planLegacyProjectMigration(source); let checks = 0;
    await expect(applyLegacyProjectMigration(plan, () => { if (++checks === 3) throw new Error("interrupted"); })).rejects.toThrow("interrupted");
    expect((await fs.readdir(path.dirname(plan.destination))).some((file) => file.startsWith(".valoride-migrate-"))).toBe(false);
    await expect(fs.access(plan.destination)).rejects.toThrow();
    await applyLegacyProjectMigration(plan);
    expect(await fs.readFile(path.join(source, "src/Thing.ts"), "utf8")).toBe("hand edited legacy model");
  });

  it("refuses to undo an edited or augmented copy", async () => {
    const receipt = await applyLegacyProjectMigration(await planLegacyProjectMigration(source));
    await fs.writeFile(path.join(receipt.plan.destination, "new-file.txt"), "keep this");
    await expect(undoLegacyProjectMigration(receipt)).rejects.toThrow(/changes or new files/);
    expect(await fs.readFile(path.join(receipt.plan.destination, "new-file.txt"), "utf8")).toBe("keep this");
  });

  it("rejects source/output links and unverified versions before writing", async () => {
    await fs.symlink(root, path.join(source, "src/link"));
    await expect(planLegacyProjectMigration(source)).rejects.toThrow(/symbolic link/);
    await fs.unlink(path.join(source, "src/link"));
    const parent = path.join(root, "linked-parent"); await fs.symlink(path.join(root, ".thorapi"), parent);
    await expect(planLegacyProjectMigration(source, parent)).rejects.toThrow(/symbolic link/);
    await fs.unlink(path.join(source, "generation-plan.json"));
    await expect(readLegacyProjectIdentity(source)).rejects.toThrow(/no verified API version/);
  });
});
