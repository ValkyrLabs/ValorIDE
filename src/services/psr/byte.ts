// src/services/psr/byte.ts
import type { PSREdit } from "./PrecisionSearchReplace";

type ByteEdit = Extract<PSREdit, { kind: "byte" }>;

type AnnotatedByteEdit = { edit: ByteEdit; index: number };

type ByteResult = {
  buffer: Buffer;
  warnings: string[];
  skipped: Array<{ index: number; reason: string }>;
  applied: number[];
};

export async function applyBytePatches(
  buffer: Buffer,
  edits: AnnotatedByteEdit[],
): Promise<ByteResult> {
  if (!edits.length) {
    return { buffer: Buffer.from(buffer), warnings: [], skipped: [], applied: [] };
  }

  const warnings: string[] = [];
  const skipped: Array<{ index: number; reason: string }> = [];
  const applied = new Set<number>();
  let b: Buffer = Buffer.from(buffer); // copy

  edits.forEach(({ edit, index }, seq) => {
    let needle: Buffer;
    let repl: Buffer;

    try {
      needle = hexToBuf(edit.findHex);
      repl = hexToBuf(edit.replaceHex);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`byte edit ${seq}: ${message}`);
      skipped.push({ index, reason: "invalid_hex" });
      return;
    }

    if (!needle.length) {
      warnings.push(`byte edit ${seq}: empty findHex`);
      skipped.push({ index, reason: "invalid_hex" });
      return;
    }

    const positions: number[] = [];
    for (let pos = 0; pos <= b.length - needle.length;) {
      const found = b.indexOf(needle, pos);
      if (found === -1) break;
      positions.push(found);
      pos = found + Math.max(1, needle.length);
      if (edit.occurrence === "first") break;
    }

    const targetPositions = selectBytePositions(positions, edit.occurrence);
    if (!positions.length) {
      warnings.push(`byte edit ${seq}: no_match`);
      skipped.push({ index, reason: "byte_no_match" });
      return;
    }

    if (!targetPositions.length) {
      warnings.push(`byte edit ${seq}: occurrence_out_of_range`);
      skipped.push({ index, reason: "occurrence_out_of_range" });
      return;
    }

    if (needle.equals(repl)) {
      warnings.push(`byte edit ${seq}: replacement_identical`);
      skipped.push({ index, reason: "byte_already_applied" });
      return;
    }

    let mutated = false;
    for (const p of [...targetPositions].sort((a, b) => b - a)) {
      const before = b.subarray(0, p);
      const after = b.subarray(p + needle.length);
      mutated = true;
      b = Buffer.concat([before, repl, after]);
    }

    if (mutated) {
      applied.add(index);
    } else {
      skipped.push({ index, reason: "byte_no_change" });
    }
  });

  return { buffer: b, warnings, skipped, applied: Array.from(applied).sort((a, b) => a - b) };
}

function hexToBuf(hex: string) {
  const cleaned = hex.replace(/\s+/g, "");
  if (!cleaned.length) throw new Error("hex string is empty");
  if (cleaned.length % 2 !== 0) throw new Error("hex string must contain an even number of characters");
  return Buffer.from(cleaned, "hex");
}

function selectBytePositions(positions: number[], occurrence: ByteEdit["occurrence"]) {
  if (occurrence === "first") return positions.slice(0, 1);
  if (typeof occurrence === "number") {
    const pos = positions[occurrence];
    return pos !== undefined ? [pos] : [];
  }
  // default and "all"
  return positions;
}
