import fs from "fs/promises";
import os from "os";
import path from "path";
import { readGitProjectIdentity } from "./projectGitIdentity";
import { describeGeneratedProject } from "../integrations/explorer/generatedProjects";

const applicationId = "11111111-1111-4111-8111-111111111111";
describe("generated app identity in a fresh clone", () => {
  let dir: string, root: string;
  beforeEach(async () => {
    dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-lineage-")));
    root = path.join(dir, "My-App-v1.2.3");
    await fs.mkdir(path.join(root, "spring-server"), {recursive:true});
    await fs.writeFile(path.join(root, "spring-server/pom.xml"), "<project/>");
  });
  afterEach(async () => { await fs.rm(dir, {recursive:true, force:true}); });
  const lineage = (id = applicationId, checksum = "a".repeat(64)) => fs.writeFile(path.join(root, "generation-lineage.json"),
    JSON.stringify({schemaVersion:1, applicationId:id, originalGeneratorChecksumSha256:checksum}));
  it("exposes routable application identity and a visible checkout label without creating an install baseline", async () => {
    await lineage();
    expect(await readGitProjectIdentity(root)).toEqual({applicationId, applicationName:"My-App", applicationVersion:"1.2.3", fromLineage:true});
    expect(await describeGeneratedProject(root)).toMatchObject({name:"My-App v1.2.3 (Git checkout)",applicationId});
    await expect(fs.lstat(path.join(root,".valoride-generation.json"))).rejects.toMatchObject({code:"ENOENT"});
  });
  it("does not route from just the folder name, UUID, or a loose lineage with no backend", async () => {
    expect(await readGitProjectIdentity(root)).toBeUndefined();
    await lineage(applicationId,"invalid"); expect(await readGitProjectIdentity(root)).toBeUndefined();
    await lineage("wrong"); expect(await readGitProjectIdentity(root)).toBeUndefined();
    await lineage(); await fs.unlink(path.join(root,"spring-server/pom.xml")); expect(await readGitProjectIdentity(root)).toBeUndefined();
  });
  it("never falls through from an invalid private baseline and rejects a linked backend", async () => {
    await lineage(); const marker = path.join(root, ".valoride-generation.json");
    await fs.writeFile(marker, "{}"); await expect(readGitProjectIdentity(root)).rejects.toThrow();
    await fs.unlink(marker); await fs.unlink(path.join(root,"spring-server/pom.xml"));
    await fs.symlink("../generation-lineage.json",path.join(root,"spring-server/pom.xml"));
    await expect(readGitProjectIdentity(root)).rejects.toThrow();
  });
});
