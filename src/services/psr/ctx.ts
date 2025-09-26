// src/services/psr/ctx.ts
import type { PSREdit, PSRWorkingContext } from "./PrecisionSearchReplace";

type ContextualEdit = Extract<PSREdit, { kind: "contextual" }>;

type AnnotatedContextualEdit = { edit: ContextualEdit; index: number };


export async function applyContextualPatches(
  ctx: PSRWorkingContext,
  edits: AnnotatedContextualEdit[],
): Promise<PSRWorkingContext> {
  if (!edits.length) return ctx;

  let text = ctx.text;

  for (const { edit, index } of edits) {
    let re: RegExp;
    try {
      re = new RegExp(edit.find, normalizeFlags(edit.flags));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.warnings.push(`contextual edit ${index}: invalid regex - ${message}`);
      ctx.skipped.push({ index, reason: "invalid_regex" });
      continue;
    }

    const matches = Array.from(text.matchAll(re));
    if (!matches.length) {
      ctx.skipped.push({ index, reason: "no_match" });
      continue;
    }

    const targetMatches = selectMatches(matches, edit.occurrence);
    if (!targetMatches.length) {
      ctx.skipped.push({ index, reason: "occurrence_out_of_range" });
      continue;
    }

    const replacements = targetMatches
      .map((match) => {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        return {
          start,
          end,
          replacement: buildReplacement(edit.replace, match, text),
        };
      })
      .sort((a, b) => b.start - a.start);

    if (!replacements.length) {
      ctx.skipped.push({ index, reason: "no_match" });
      continue;
    }

    let mutated = false;
    let identicalCount = 0;
    for (const { start, end, replacement } of replacements) {
      const current = text.slice(start, end);
      if (current === replacement) {
        identicalCount++;
        continue;
      }
      mutated = true;
      text = `${text.slice(0, start)}${replacement}${text.slice(end)}`;
    }

    if (!mutated) {
      ctx.skipped.push({ index, reason: identicalCount ? "already_applied" : "no_effect" });
      continue;
    }

    ctx.applied.add(index);
  }

  ctx.text = text;
  return ctx;
}

function normalizeFlags(flags?: string) {
  const base = flags && flags.length ? flags : "m";
  const needsGlobal = base.includes("g") ? base : `${base}g`;
  const deduped = Array.from(new Set(needsGlobal.split(""))).join("");
  return deduped;
}

type Occurrence = "first" | "all" | number | undefined;

function selectMatches(matches: RegExpMatchArray[], occurrence: Occurrence) {
  if (occurrence === "first") return matches.slice(0, 1);
  if (typeof occurrence === "number") {
    const match = matches[occurrence];
    return match ? [match] : [];
  }
  // default and "all"
  return matches;
}

function buildReplacement(template: string, match: RegExpMatchArray, input: string) {
  const fullMatch = match[0];
  const start = match.index ?? 0;
  const end = start + fullMatch.length;

  return template.replace(/\$([$&`']|\d{1,2}|<[^>]+>)/g, (token) => {
    const key = token.slice(1);
    switch (key) {
      case "$":
        return "$";
      case "&":
        return fullMatch;
      case "`":
        return input.slice(0, start);
      case "'":
        return input.slice(end);
      default:
        if (key.startsWith("<") && key.endsWith(">")) {
          const name = key.slice(1, -1);
          return match.groups?.[name] ?? "";
        }
        if (/^\d{1,2}$/.test(key)) {
          const idx = Number(key);
          return match[idx] ?? "";
        }
        return token;
    }
  });
}
