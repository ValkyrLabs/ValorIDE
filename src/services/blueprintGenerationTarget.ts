import path from "path";
import fs from "fs/promises";
import { assertNoProjectLinks, canonicalProjectFolder, readGenerationManifest } from "./generatedProjectInstall";
import { normalizeBlueprintBackend, readProjectBlueprintState } from "./projectBlueprintSync";
import { GIT_PROJECT_LINEAGE } from "./projectGitIdentity";

/** Native folder choice only. A Git lineage routes editing but is not an install baseline. */
export async function blueprintGenerationTarget(workspace: string, explicitProject: string | undefined,
  appId: string, specTitle: string, specVersion: string, backend: string, artifactParent?:string): Promise<string | undefined> {
  const root = path.resolve(explicitProject ?? workspace);
  const offset = path.relative(workspace, root);
  if (offset === ".." || offset.startsWith(".."+path.sep) || path.isAbsolute(offset))
    throw new Error("Open the selected generated project inside its original workspace before regenerating.");
  await assertNoProjectLinks(root);
  const manifest = await readGenerationManifest(root);
  if (!manifest) {
    const lineage = await fs.lstat(path.join(root,GIT_PROJECT_LINEAGE)).then(() => true, (e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e; return false;
    });
    if (!explicitProject && !lineage && artifactParent) {
      const planned = path.resolve(artifactParent, canonicalProjectFolder(specTitle,specVersion));
      const relative=path.relative(workspace,planned);
      if (!relative || relative===".." || relative.startsWith(".."+path.sep) || path.isAbsolute(relative))
        throw new Error("Configure a ThorAPI output folder inside the selected workspace before requesting a Blueprint generation.");
      await assertNoProjectLinks(planned);
      const exists=await fs.lstat(planned).then(()=>true,(e:NodeJS.ErrnoException)=>{if(e.code!=="ENOENT")throw e;return false;});
      if (exists) return blueprintGenerationTarget(workspace,planned,appId,specTitle,specVersion,backend);
      return undefined; // a fresh, checked destination in the selected general workspace
    }
    throw new Error("This checkout has no verified ValorIDE install baseline. Import the complete generated project package, then open that project's Blueprint to regenerate in place. No generation was requested.");
  }
  if (manifest.applicationId.toLowerCase() !== appId.toLowerCase())
    throw new Error("This project is installed for another Application. Select its original project or a general workspace before regenerating.");
  const expected = canonicalProjectFolder(manifest.applicationName, manifest.applicationVersion);
  if (path.basename(root) !== expected)
    throw new Error(`This project was renamed. Restore its folder name to "${expected}" before regenerating in place. No generation was requested.`);
  if (manifest.applicationName !== specTitle || manifest.applicationVersion !== specVersion)
    throw new Error(`In-place regeneration must keep this project's Blueprint title and version (${manifest.applicationName}, ${manifest.applicationVersion}). Save a new title/version separately and generate it from Apps in a general workspace.`);
  const binding = await readProjectBlueprintState(root);
  if (binding && (binding.applicationId.toLowerCase() !== appId.toLowerCase() || binding.backend && normalizeBlueprintBackend(binding.backend) !== normalizeBlueprintBackend(backend)))
    throw new Error("The selected project is bound to another Application or backend. Reopen its original workspace and backend.");
  if (binding?.pending) throw new Error("Finish the pending local Blueprint synchronization before regenerating this project.");
  return root;
}
