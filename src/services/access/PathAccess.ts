
// src/services/access/PathAccess.ts
import * as path from "path";
import * as fs from "fs";

export interface PathAccessOptions {
  workspaceRoot: string;
  denyGlobs?: string[]; // naive glob subset ("**/node_modules/**", "**/.git/**", etc.)
  allowOutsideWorkspace?: boolean; // default false
  additionalDenyPaths?: string[];  // absolute or relative to workspace
}

/** Very small, dependency‑free path guard.
 *  - Confines edits to workspace by default
 *  - Blocks common deny patterns
 *  - Optionally honors a project ".valorignore" line‑by‑line (prefix '#' for comments)
 */
export class PathAccess {
  private root: string;
  private denies: string[];
  private allowOutside: boolean;

  constructor(opts: PathAccessOptions) {
    this.root = path.resolve(opts.workspaceRoot);
    this.allowOutside = !!opts.allowOutsideWorkspace;
    this.denies = [
      "**/.git/**",
      "**/node_modules/**",
      "**/.valor/undo/**",
      "**/.DS_Store",
      ...(opts.denyGlobs ?? [])
    ];

    // Optionally load .valorignore (simple contains/startsWith match per line)
    const ignorePath = path.join(this.root, ".valorignore");
    if (fs.existsSync(ignorePath)) {
      const extra = fs
        .readFileSync(ignorePath, "utf8")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => !!l && !l.startsWith("#"));
      this.denies.push(...extra);
    }

    if (opts.additionalDenyPaths?.length) this.denies.push(...opts.additionalDenyPaths);
  }

  /** Return absolute, normalized path inside workspace. */
  resolve(relOrAbs: string): string {
    const abs = path.isAbsolute(relOrAbs)
      ? path.normalize(relOrAbs)
      : path.resolve(this.root, relOrAbs);
    return abs;
  }

  /** Main check: in‑workspace (unless allowed), no traversal outside, not denied by patterns. */
  validateAccess(relOrAbs: string): boolean {
    const abs = this.resolve(relOrAbs);

    // Workspace confinement
    if (!this.allowOutside) {
      const inWorkspace = abs.startsWith(this.root + path.sep) || abs === this.root;
      if (!inWorkspace) return false;
    }

    // Deny common temp/backup/system areas and custom patterns
    const relFromRoot = path.relative(this.root, abs).split(path.sep).join("/");
    for (const pat of this.denies) {
      if (matchGlob(relFromRoot, pat)) return false;
    }

    return true;
  }
}

// Minimal glob support for **, *, and trailing /**
function matchGlob(relPath: string, pattern: string): boolean {
  const esc = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(
    "^" +
    esc(pattern)
      .replace(/\\\\\\*\\\\\\*\//g, "(?:.+/)?") // **/
      .replace(/\\\\\\*\\\\\\*/g, ".*")        // **
      .replace(/\\\\\\*/g, "[^/]*") +                // *
    "$"
  );
  return rx.test(relPath);
}