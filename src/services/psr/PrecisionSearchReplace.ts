import * as fsp from "fs/promises";
import type { Stats } from "fs";
import * as path from "path";
import crypto from "crypto";
import { EOL } from "os";
import { PathAccess } from "@services/access/PathAccess";
import { applyAstEdits } from "./ast";
import { applyContextualPatches } from "./ctx";
import { applyBytePatches } from "./byte";
import { normalizeEol } from "@utils/string";

export type PSREdit =
  | {
    kind: "ts-ast";
    intent: "replacePropertyChain";
    from: string;
    to: string;
    fallback?: string;
  }
  | {
    kind: "ts-ast";
    intent: "insertOptionalChaining";
    target: string;
  }
  | {
    kind: "ts-ast";
    intent: "renameProperty";
    from: string;
    to: string;
  }
  | {
    kind: "contextual";
    find: string;
    replace: string;
    flags?: string;
    occurrence?: "first" | "all" | number;
    contextBefore?: number;
    contextAfter?: number;
    checksumPolicy?: "require" | "relax";
  }
  | {
    kind: "byte";
    findHex: string;
    replaceHex: string;
    occurrence?: "first" | "all" | number;
  };

export interface PSROptions {
  dryRun?: boolean;
  encoding?: BufferEncoding; // "utf8" default
  maxFileBytesForAst?: number; // default 5_000_000
  makeBackup?: boolean;
  backupDir?: string; // e.g. ".valoride/undo"
}

export interface PSRResult {
  baseHash: string;
  postHash: string;
  editsRequested: number;
  editsApplied: number;
  skipped: Array<{ index: number; reason: string }>;
  warnings: string[];
  bytesDelta: number;
  appliedIndices: number[];
}

export interface PSRWorkingContext {
  text: string;
  skipped: Array<{ index: number; reason: string }>;
  warnings: string[];
  applied: Set<number>;
}

type AnnotatedEdit<T extends PSREdit = PSREdit> = { edit: T; index: number };
type AstEdit = Extract<PSREdit, { kind: "ts-ast" }>;
type ContextualEdit = Extract<PSREdit, { kind: "contextual" }>;
type ByteEdit = Extract<PSREdit, { kind: "byte" }>;

export async function precisionSearchAndReplace(
  cwd: string,
  relPath: string,
  edits: PSREdit[],
  pathAccess: PathAccess,
  opts: PSROptions = {}
): Promise<PSRResult> {
  const encoding = opts.encoding ?? "utf8";
  if (!pathAccess.validateAccess(relPath)) {
    throw new Error(`Path access denied: ${relPath}`);
  }

  const abs = path.resolve(cwd, relPath);
  let raw: Buffer;
  let stat: Stats;
  try {
    raw = await fsp.readFile(abs);
    stat = await fsp.stat(abs);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      throw new Error(`File not found for precision_search_and_replace: ${relPath}`);
    }
    throw error;
  }
  const baseHash = sha256(raw);
  const text = raw.toString(encoding);

  // normalize EOL to keep matcher stable, preserve original at write
  const originalEol = detectEol(text);
  const norm = normalizeEol(text, "\n");

  let ctx: PSRWorkingContext = {
    text: norm,
    skipped: [],
    warnings: [],
    applied: new Set<number>(),
  };

  const annotated: AnnotatedEdit[] = edits.map((edit, index) => ({ edit, index }));
  const maxAst = opts.maxFileBytesForAst ?? 5_000_000;

  const astEdits = annotated.filter(
    (entry): entry is AnnotatedEdit<AstEdit> => entry.edit.kind === "ts-ast",
  );
  if (astEdits.length) {
    const canUseAst = raw.byteLength <= maxAst && looksLikeTS(relPath);
    if (canUseAst) {
      ctx = await applyAstEdits(ctx, astEdits);
    } else {
      const reason = !looksLikeTS(relPath)
        ? "ast_unsupported_file_type"
        : "ast_file_too_large";
      for (const entry of astEdits) {
        ctx.skipped.push({ index: entry.index, reason });
      }
    }
  }

  const contextualEdits = annotated.filter(
    (entry): entry is AnnotatedEdit<ContextualEdit> => entry.edit.kind === "contextual",
  );
  if (contextualEdits.length) {
    ctx = await applyContextualPatches(ctx, contextualEdits);
  }

  let outBuf = Buffer.from(ctx.text.replaceAll("\n", originalEol ?? EOL), encoding) as Buffer;

  const byteEdits = annotated.filter(
    (entry): entry is AnnotatedEdit<ByteEdit> => entry.edit.kind === "byte",
  );
  if (byteEdits.length) {
    const byteRes = await applyBytePatches(outBuf, byteEdits);
    outBuf = byteRes.buffer;
    ctx.warnings.push(...byteRes.warnings);
    ctx.skipped.push(...byteRes.skipped);
    for (const index of byteRes.applied) {
      ctx.applied.add(index);
    }
  }

  const postHash = sha256(outBuf);
  const changed = postHash !== baseHash;

  const skipped = coalesceSkips(ctx.skipped);
  const appliedIndices = Array.from(ctx.applied).sort((a, b) => a - b);
  const editsApplied = appliedIndices.length;
  const buildResult = (): PSRResult => ({
    baseHash,
    postHash,
    editsRequested: edits.length,
    editsApplied,
    skipped,
    warnings: Array.from(new Set(ctx.warnings)),
    bytesDelta: outBuf.byteLength - raw.byteLength,
    appliedIndices,
  });

  if (opts.dryRun) {
    return buildResult();
  }

  if (opts.makeBackup && changed) {
    await writeBackupFile(cwd, relPath, baseHash, raw, stat.mode, opts, ctx.warnings);
  }

  if (changed) {
    await writeFileAtomically(abs, outBuf, stat.mode, ctx.warnings);
  }

  return buildResult();
}

function coalesceSkips(entries: Array<{ index: number; reason: string }>) {
  const map = new Map<number, Set<string>>();
  for (const entry of entries) {
    const set = map.get(entry.index) ?? new Set<string>();
    set.add(entry.reason);
    map.set(entry.index, set);
  }

  return Array.from(map.entries())
    .map(([index, reasons]) => ({ index, reason: Array.from(reasons).join(", ") }))
    .sort((a, b) => a.index - b.index);
}

function sha256(b: Buffer) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
function detectEol(t: string) {
  return t.includes("\r\n") ? "\r\n" : t.includes("\r") ? "\r" : "\n";
}
function looksLikeTS(p: string) {
  return /\.(ts|tsx|cts|mts)$/.test(p);
}
async function fsyncDir(dir: string) {
  const fd = await fsp.open(dir, "r");
  try {
    await fd.sync();
  } finally {
    await fd.close();
  }
}

function resolveBackupRoot(cwd: string, backupDir?: string) {
  if (!backupDir) {
    return path.resolve(cwd, ".valoride/undo");
  }
  return path.isAbsolute(backupDir) ? backupDir : path.resolve(cwd, backupDir);
}

async function writeBackupFile(
  cwd: string,
  relPath: string,
  baseHash: string,
  data: Buffer,
  mode: number,
  opts: PSROptions,
  warnings: string[],
) {
  const backupRoot = resolveBackupRoot(cwd, opts.backupDir);
  const absTarget = path.resolve(cwd, relPath);
  const relTarget = path.relative(cwd, absTarget);
  const backupDir = path.join(backupRoot, path.dirname(relTarget));
  const backupName = `${path.basename(relPath)}.${baseHash.slice(0, 8)}.bak`;
  const backupPath = path.join(backupDir, backupName);

  try {
    await fsp.mkdir(backupDir, { recursive: true });
    await fsp.writeFile(backupPath, data);
    await fsp.chmod(backupPath, mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`backup_failed: ${message}`);
  }
}

async function writeFileAtomically(
  targetPath: string,
  payload: Buffer,
  mode: number,
  warnings: string[],
) {
  const dir = path.dirname(targetPath);
  const unique = `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2, 10)}`;
  const tempPath = path.join(dir, `.${path.basename(targetPath)}.${unique}.tmp`);

  let handle: fsp.FileHandle | undefined;
  try {
    handle = await fsp.open(tempPath, "w", mode);
    await handle.writeFile(payload);
    await handle.sync();
  } catch (error) {
    await safeUnlink(tempPath);
    throw error;
  } finally {
    if (handle) {
      await handle.close();
    }
  }

  try {
    await fsp.rename(tempPath, targetPath);
  } catch (error) {
    await safeUnlink(tempPath);
    throw error;
  }

  try {
    await fsyncDir(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`fsync_failed: ${message}`);
  }
}

async function safeUnlink(filePath: string) {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code && err.code !== "ENOENT") {
      // best effort cleanup; surface original failure elsewhere
      return;
    }
  }
}
