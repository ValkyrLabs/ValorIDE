import fs from "fs/promises";
import { constants } from "fs";
import path from "path";
import { assertNoProjectLinks, readGenerationManifest } from "./generatedProjectInstall";
import { PROJECT_UUID } from "./projectBlueprintSync";

export const GIT_PROJECT_LINEAGE = "generation-lineage.json";

/** Clones don't contain the editor's private install baseline. Lineage can route a Git
 * command to an app; it cannot authorize publication, regeneration, billing or deployment. */
export async function readGitProjectIdentity(root: string) {
  const installed = await readGenerationManifest(root);
  if (installed) return { applicationId: installed.applicationId, applicationName: installed.applicationName,
    applicationVersion: installed.applicationVersion, fromLineage: false };
  await assertNoProjectLinks(root, GIT_PROJECT_LINEAGE);
  const handle = await fs.open(path.join(root, GIT_PROJECT_LINEAGE), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0))
    .catch((e: NodeJS.ErrnoException) => { if (e.code !== "ENOENT") throw e; return undefined; });
  if (!handle) return undefined;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || !stat.size || stat.size > 16 * 1024 * 1024) return undefined;
    const doc = JSON.parse(await handle.readFile("utf8"));
    const checksum = doc?.originalGeneratorChecksumSha256 ?? doc?.packageSha256;
    if (doc?.schemaVersion !== 1 || typeof doc.applicationId !== "string" || !PROJECT_UUID.test(doc.applicationId) ||
        typeof checksum !== "string" || !/^[0-9a-f]{64}$/i.test(checksum)) return undefined;
    const pom = path.join("spring-server", "pom.xml");
    await assertNoProjectLinks(root, pom);
    const hasPom = await fs.lstat(path.join(root, pom)).then(s => s.isFile(), (e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
      return false;
    });
    if (!hasPom) return undefined;
    const folder = path.basename(root);
    const parts = /^(.+)-v([0-9][a-z0-9._+-]{0,63})$/i.exec(folder);
    return { applicationId: doc.applicationId, applicationName: parts?.[1] || folder,
      applicationVersion: parts?.[2] || "", fromLineage: true };
  } finally { await handle.close(); }
}
