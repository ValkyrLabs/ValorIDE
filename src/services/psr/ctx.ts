// src/services/psr/ctx.ts
export async function applyContextualPatches(
    ctx: { text: string; skipped: Array<{ index: number; reason: string }>; warnings: string[] },
    edits: Array<{
        find: string; replace: string; flags?: string;
        occurrence?: "first" | "all" | number;
        contextBefore?: number; contextAfter?: number;
        checksumPolicy?: "require" | "relax";
    }>
) {
    let { text } = ctx;
    for (let i = 0; i < edits.length; i++) {
        const e = edits[i];
        const re = new RegExp(e.find, e.flags ?? "m");
        let idx = 0;
        let applied = 0;
        text = text.replace(re, (m: string, ...rest: any[]) => {
            const rep = e.replace;
            const shouldApply =
                e.occurrence === "all" ||
                e.occurrence === undefined ||
                (typeof e.occurrence === "number" ? idx === (e.occurrence as number) : e.occurrence === "first" ? idx === 0 : true);

            const out = shouldApply ? rep : m;
            idx++;
            if (shouldApply) applied++;
            return out;
        });
        if (applied === 0) ctx.skipped.push({ index: i, reason: "no_match" });
    }
    return { ...ctx, text };
}