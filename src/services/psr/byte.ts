// src/services/psr/byte.ts
export async function applyBytePatches(
    buffer: Buffer,
    edits: Array<{ findHex: string; replaceHex: string; occurrence?: "first" | "all" | number }>
): Promise<{ buffer: Buffer; warnings: string[] }> {
    const warnings: string[] = [];
    let b = Buffer.from(buffer); // copy

    function hexToBuf(hex: string) { return Buffer.from(hex.replace(/\s+/g, ""), "hex"); }

    edits.forEach((e, i) => {
        const needle = hexToBuf(e.findHex);
        const repl = hexToBuf(e.replaceHex);
        let applied = 0;

        const positions: number[] = [];
        // naive scan; O(n*m). For many patterns switch to Aho-Corasick later.
        for (let pos = 0; pos <= b.length - needle.length;) {
            const idx = b.indexOf(needle, pos);
            if (idx === -1) break;
            positions.push(idx);
            pos = idx + Math.max(1, needle.length);
            if (e.occurrence === "first") break;
        }

        const targetPositions =
            e.occurrence === "first" ? positions.slice(0, 1) :
                typeof e.occurrence === "number" ? (positions[e.occurrence] !== undefined ? [positions[e.occurrence]] : []) :
                    positions;

        if (!targetPositions.length) {
            warnings.push(`byte edit ${i}: no_match`);
            return;
        }

        // Apply back-to-front to preserve offsets
        for (const p of [...targetPositions].sort((a, b) => b - a)) {
            b = Buffer.concat([b.subarray(0, p), repl, b.subarray(p + needle.length)]);
            applied++;
        }
        if (applied === 0) warnings.push(`byte edit ${i}: skipped`);
    });

    return { buffer: b, warnings };
}