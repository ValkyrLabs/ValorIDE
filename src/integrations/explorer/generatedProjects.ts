import fs from "fs/promises";
import path from "path";
import { readGenerationManifest } from "../../services/generatedProjectInstall";
import { readLegacyProjectIdentity } from "../../services/legacyProjectMigration";

export interface LocalGeneratedProject { name: string; version: string; directory: string; mtime?: number }

export async function describeGeneratedProject(directory: string): Promise<LocalGeneratedProject | undefined> {
  try {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return undefined;
    const legacyIdentity = await readLegacyProjectIdentity(directory);
    if (legacyIdentity) return { name: `${legacyIdentity.applicationName} v${legacyIdentity.applicationVersion} (legacy)`, version: legacyIdentity.applicationVersion, directory, mtime: stat.mtimeMs };
    const manifest = await readGenerationManifest(directory);
    if (manifest) return { name: `${manifest.applicationName} v${manifest.applicationVersion}`, version: manifest.applicationVersion, directory, mtime: stat.mtimeMs };
    const legacy = path.basename(directory).match(/^v(\d+(?:\.\d+)*?)\.(.+)$/i);
    return legacy ? { name: path.basename(directory), version: legacy[1], directory, mtime: stat.mtimeMs } : undefined;
  } catch { return undefined; }
}

export async function listGeneratedProjects(parent: string): Promise<LocalGeneratedProject[]> {
  try {
    const entries = await fs.readdir(parent, { withFileTypes: true });
    const projects = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
      const directory = path.join(parent, entry.name);
      const project = await describeGeneratedProject(directory);
      if (project) return [project];
      // The old downloader placed a single project below its application UUID. Inspect only that known layout.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.name)) return [];
      const children = await fs.readdir(directory, { withFileTypes: true });
      const nested = await Promise.all(children.filter((child) => child.isDirectory()).map((child) => describeGeneratedProject(path.join(directory, child.name))));
      return nested.filter((child): child is LocalGeneratedProject => Boolean(child));
    }));
    return projects.flat();
  } catch { return []; }
}
