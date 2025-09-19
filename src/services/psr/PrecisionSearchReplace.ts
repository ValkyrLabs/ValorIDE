// import * as fs from "fs";
import * as fsp from "fs/promises";
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
        kind: "ts-ast"; intent: "renameProperty" | "insertOptionalChaining" | "replacePropertyChain";
        target: string; from?: string; to?: string; fallback?: string;
    }
    | {
        kind: "contextual"; find: string; replace: string; flags?: string; occurrence?: "first" | "all" | number;
        contextBefore?: number; contextAfter?: number; checksumPolicy?: "require" | "relax";
    }
    | { kind: "byte"; findHex: string; replaceHex: string; occurrence?: "first" | "all" | number };

export interface PSROptions {
    dryRun?: boolean;
    encoding?: BufferEncoding; // "utf8" default
    maxFileBytesForAst?: number; // default 5_000_000
    makeBackup?: boolean;
    backupDir?: string; // e.g. ".valor/undo"
}

export interface PSRResult {
    baseHash: string;
    postHash: string;
    editsRequested: number;
    editsApplied: number;
    skipped: Array<{ index: number; reason: string }>;
    warnings: string[];
    bytesDelta: number;
}

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
    let raw = await fsp.readFile(abs);
    const baseHash = sha256(raw);
    let text = raw.toString(encoding);

    // normalize EOL to keep matcher stable, preserve original at write
    const originalEol = detectEol(text);
    const norm = normalizeEol(text, "\n");

    let ctx = { text: norm, skipped: [] as PSRResult["skipped"], warnings: [] as string[] };
    const maxAst = opts.maxFileBytesForAst ?? 5_000_000;

    // Layer 1 – AST
    const astEdits = edits.filter(e => e.kind === "ts-ast");
    if (astEdits.length && raw.byteLength <= maxAst && looksLikeTS(relPath)) {
        ctx = await applyAstEdits(ctx, astEdits as any);
    }

    // Layer 2 – contextual patches
    const ctxEdits = edits.filter(e => e.kind === "contextual");
    if (ctxEdits.length) {
        ctx = await applyContextualPatches(ctx, ctxEdits as any);
    }

    // Layer 3 – byte patches (operate on Buffer)
    const byteEdits = edits.filter(e => e.kind === "byte");
    let outBuf: Buffer;
    if (byteEdits.length) {
        outBuf = Buffer.from(ctx.text.replaceAll("\n", originalEol ?? EOL), encoding);
        const byteRes = await applyBytePatches(outBuf, byteEdits as any);
        outBuf = byteRes.buffer;
        ctx.warnings.push(...byteRes.warnings);
    } else {
        outBuf = Buffer.from(ctx.text.replaceAll("\n", originalEol ?? EOL), encoding);
    }

    const postHash = sha256(outBuf);
    const changed = postHash !== baseHash;

    if (opts.dryRun) {
        return {
            baseHash, postHash,
            editsRequested: edits.length,
            editsApplied: edits.length - ctx.skipped.length,
            skipped: ctx.skipped,
            warnings: ctx.warnings,
            bytesDelta: outBuf.byteLength - raw.byteLength,
        };
    }

    // backup
    if (opts.makeBackup) {
        const bdir = path.resolve(path.dirname(abs), opts.backupDir ?? ".valor/undo");
        await fsp.mkdir(bdir, { recursive: true });
        await fsp.writeFile(path.join(bdir, path.basename(relPath) + "." + baseHash.slice(0, 8) + ".bak"), raw);
    }

    // atomic write
    if (changed) {
        const tmp = abs + ".tmp-" + Date.now();
        const fh = await fsp.open(tmp, "w");
        try {
            await fh.write(outBuf, 0, outBuf.byteLength, 0);
            await fh.sync();
        } finally {
            await fh.close();
        }
        await fsp.rename(tmp, abs);
        await fsyncDir(path.dirname(abs));
    }

    return {
        baseHash, postHash,
        editsRequested: edits.length,
        editsApplied: edits.length - ctx.skipped.length,
        skipped: ctx.skipped,
        warnings: ctx.warnings,
        bytesDelta: outBuf.byteLength - raw.byteLength,
    };
}

function sha256(b: Buffer) { return crypto.createHash("sha256").update(b).digest("hex"); }
function detectEol(t: string) { return t.includes("\r\n") ? "\r\n" : t.includes("\r") ? "\r" : "\n"; }
function looksLikeTS(p: string) { return /\.(ts|tsx|cts|mts)$/.test(p); }
async function fsyncDir(dir: string) {
    // ensure directory entry is flushed on some filesystems
    const fd = await fsp.open(dir, "r"); try { await fd.sync(); } finally { await fd.close(); }
}
