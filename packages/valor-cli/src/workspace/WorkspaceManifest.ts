/**
 * WorkspaceManifest - Multi-repo workspace definition and parser
 */

import { promises as fs } from 'fs';
import { parse as parseYaml } from 'yaml';
import { WorkspaceManifest } from '../types';
import { join } from 'path';

export class WorkspaceManifestParser {
  /**
   * Parse workspace manifest from YAML or .code-workspace JSON
   */
  static async load(workspaceRoot: string): Promise<WorkspaceManifest | null> {
    // Try .valoride/workspace.yml first
    try {
      const ymlPath = join(workspaceRoot, '.valoride', 'workspace.yml');
      const content = await fs.readFile(ymlPath, 'utf-8');
      return parseYaml(content) as WorkspaceManifest;
    } catch {
      // Fall through
    }

    // Try .code-workspace
    try {
      const cwsFiles = await this.findCodeWorkspaceFiles(workspaceRoot);
      if (cwsFiles.length > 0) {
        const content = await fs.readFile(cwsFiles[0], 'utf-8');
        const cws = JSON.parse(content) as any;
        if (cws.folders) {
          return {
            version: '1.0',
            repos: cws.folders.map((f: any) => ({
              name: f.name,
              path: f.path,
            })),
          };
        }
      }
    } catch {
      // Fall through
    }

    return null;
  }

  /**
   * Find .code-workspace files
   */
  private static async findCodeWorkspaceFiles(dir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dir);
      return files
        .filter((f) => f.endsWith('.code-workspace'))
        .map((f) => join(dir, f));
    } catch {
      return [];
    }
  }

  /**
   * Create a new manifest
   */
  static create(repos: Array<{ name: string; path: string; remote?: string; branch?: string }>): WorkspaceManifest {
    return {
      version: '1.0',
      repos,
    };
  }

  /**
   * Validate manifest
   */
  static validate(manifest: WorkspaceManifest): boolean {
    return manifest.version === '1.0' && Array.isArray(manifest.repos) && manifest.repos.length > 0;
  }
}