export async function applyBytePatches(buffer, edits) {
    if (!edits.length) {
        return { buffer: Buffer.from(buffer), warnings: [], skipped: [], applied: [] };
    }
    const warnings = [];
    const skipped = [];
    const applied = new Set();
    let b = Buffer.from(buffer); // copy
    edits.forEach(({ edit, index }, seq) => {
        let needle;
        let repl;
        try {
            needle = hexToBuf(edit.findHex);
            repl = hexToBuf(edit.replaceHex);
        }
        catch (error) {
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
        const positions = [];
        for (let pos = 0; pos <= b.length - needle.length;) {
            const found = b.indexOf(needle, pos);
            if (found === -1)
                break;
            positions.push(found);
            pos = found + Math.max(1, needle.length);
            if (edit.occurrence === "first")
                break;
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
        }
        else {
            skipped.push({ index, reason: "byte_no_change" });
        }
    });
    return { buffer: b, warnings, skipped, applied: Array.from(applied).sort((a, b) => a - b) };
}
function hexToBuf(hex) {
    const cleaned = hex.replace(/\s+/g, "");
    if (!cleaned.length)
        throw new Error("hex string is empty");
    if (cleaned.length % 2 !== 0)
        throw new Error("hex string must contain an even number of characters");
    return Buffer.from(cleaned, "hex");
}
function selectBytePositions(positions, occurrence) {
    if (occurrence === "first")
        return positions.slice(0, 1);
    if (typeof occurrence === "number") {
        const pos = positions[occurrence];
        return pos !== undefined ? [pos] : [];
    }
    // default and "all"
    return positions;
}
//# sourceMappingURL=byte.js.map