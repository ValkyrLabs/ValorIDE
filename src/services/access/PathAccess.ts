
// src/services/access/PathAccess.ts
import * as path from "path";
import * as fs from "fs";

export interface PathAccessOptions {
  workspaceRoot: string;
  denyGlobs?: string[]; // naive glob subset ("**/node_modules/**", "**/.git/**", etc.)
  allowOutsideWorkspace?: boolean; // default false
  additionalDenyPaths?: string[];  // absolute or relative to workspace
}

const DEFAULT_DENY_PATTERNS = [
  "**/.git/**",
  "**/node_modules/**",
  "**/.valoride/undo/**",
  "**/.DS_Store",
];

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

    const hasLocalValorideRules = fs.existsSync(
      path.join(this.root, ".valoriderules"),
    );

    const denyPatterns: string[] = [];

    if (hasLocalValorideRules) {
      denyPatterns.push(...DEFAULT_DENY_PATTERNS);
    }

    if (opts.denyGlobs?.length) {
      denyPatterns.push(...opts.denyGlobs);
    }

    if (opts.additionalDenyPaths?.length) {
      denyPatterns.push(...opts.additionalDenyPaths);
    }

    denyPatterns.push(
      ...loadIgnorePatterns(path.join(this.root, ".valorignore"), this.root),
    );
    denyPatterns.push(
      ...loadIgnorePatterns(path.join(this.root, ".valorideignore"), this.root),
    );

    this.denies = Array.from(new Set(denyPatterns));
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

// Minimal glob support for **, *, and /** sequences used in deny lists
function matchGlob(relPath: string, pattern: string): boolean {
  const escapeRegexChar = (ch: string) => (/[\\^$+?.()|[\]{}]/.test(ch) ? `\\${ch}` : ch);
  const toRegexSource = (glob: string) => {
    let src = "";
    for (let i = 0; i < glob.length; i++) {
      const ch = glob[i];
      if (ch === "*") {
        const next = glob[i + 1];
        if (next === "*") {
          const after = glob[i + 2];
          if (after === "/") {
            src += "(?:.*/)?";
            i += 2; // Skip the second *; loop increments past '/'
            continue;
          }
          src += ".*";
          i += 1; // Skip the second *
          continue;
        }
        src += "[^/]*";
        continue;
      }
      src += escapeRegexChar(ch);
    }
    return src;
  };

  const normalizedPattern = pattern.replace(/\\/g, "/");
  const normalizedPath = relPath.replace(/\\/g, "/");
  const regex = new RegExp(`^${toRegexSource(normalizedPattern)}$`);
  return regex.test(normalizedPath);
}

function loadIgnorePatterns(
  ignoreFilePath: string,
  workspaceRoot: string,
  visited: Set<string> = new Set<string>(),
): string[] {
  if (!ignoreFilePath) return [];

  try {
    if (!fs.existsSync(ignoreFilePath)) {
      return [];
    }

    const stat = fs.statSync(ignoreFilePath);
    if (!stat.isFile()) {
      return [];
    }
  } catch {
    return [];
  }

  if (visited.has(ignoreFilePath)) {
    return [];
  }
  visited.add(ignoreFilePath);

  let content: string;
  try {
    content = fs.readFileSync(ignoreFilePath, "utf8");
  } catch {
    return [];
  }

  const patterns: string[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("!include ")) {
      const includeTarget = line.substring("!include ".length).trim();
      if (!includeTarget) {
        continue;
      }
      const includePath = path.isAbsolute(includeTarget)
        ? includeTarget
        : path.resolve(workspaceRoot, includeTarget);
      patterns.push(
        ...loadIgnorePatterns(includePath, workspaceRoot, visited),
      );
      continue;
    }

    if (line.startsWith("!")) {
      // Respect negation directives by not adding them to the deny list
      continue;
    }

    const normalizedPatterns = normalizeIgnorePattern(line);
    patterns.push(...normalizedPatterns);
  }

  return patterns;
}

function normalizeIgnorePattern(rawPattern: string): string[] {
  let pattern = rawPattern.replace(/\\/g, "/");
  const results: string[] = [];

  const isDirPattern = pattern.endsWith("/");
  if (isDirPattern) {
    pattern = pattern.replace(/\/+$/, "");
  }

  const anchoredToRoot = pattern.startsWith("/");
  if (anchoredToRoot) {
    pattern = pattern.replace(/^\/+/, "");
  }

  if (!pattern) {
    return results;
  }

  const hasSlash = pattern.includes("/");
  const base =
    anchoredToRoot || hasSlash ? pattern : `**/${pattern}`;

  results.push(base);

  if (isDirPattern) {
    results.push(`${base}/**`);
  }

  return results;
}
