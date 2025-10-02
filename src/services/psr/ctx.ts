// src/services/psr/ctx.ts
import type { PSREdit, PSRWorkingContext } from "./PrecisionSearchReplace";

type ContextualEdit = Extract<PSREdit, { kind: "contextual" }>;
type AnnotatedContextualEdit = { edit: ContextualEdit; index: number };

/**
 * Applies contextual (regex or literal) patches robustly.
 * - Tries regex first; if invalid or no match, attempts literal string fallback.
 * - Logs warnings and skips gracefully if neither works.
 */
export async function applyContextualPatches(
  ctx: PSRWorkingContext,
  edits: AnnotatedContextualEdit[],
): Promise<PSRWorkingContext> {
  if (!edits.length) return ctx;

  let text = ctx.text;

  for (const { edit, index } of edits) {
    let re: RegExp | undefined = undefined;
    let regexValid = true;
    let matches: RegExpMatchArray[] = [];

    // Try regex
    try {
      re = new RegExp(edit.find, normalizeFlags(edit.flags));
      matches = Array.from(text.matchAll(re));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.warnings.push(`contextual edit ${index}: invalid regex - ${message}`);
      regexValid = false;
    }

    let usedFallback = false;
    // If regex is invalid or finds no matches, try literal fallback
    if (!regexValid || !matches.length) {
      // Only fallback if the pattern is a valid literal (no regex metachars)
      if (/^[\w\s.,:;\-_'"()[\]{}<>!?@#$%^&*+=/\\|~`]+$/.test(edit.find)) {
        const fallbackResult = applyLiteralFallback(text, edit.find, edit.replace, edit.occurrence);
        if (fallbackResult.replaced) {
          text = fallbackResult.text;
          ctx.applied.add(index);
          ctx.warnings.push(
            `contextual edit ${index}: regex ${regexValid ? "no match" : "invalid"}, used literal fallback (${fallbackResult.count} replacement${fallbackResult.count !== 1 ? "s" : ""})`
          );
          usedFallback = true;
          continue;
        }
      }
      if (!usedFallback) {
        ctx.skipped.push({ index, reason: regexValid ? "no_match" : "invalid_regex" });
        continue;
      }
    }

    // If regex is valid and matches found, proceed as before
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

/**
 * Attempts a literal string replacement as a fallback.
 * Returns { text, replaced, count }
 */
function applyLiteralFallback(
  text: string,
  find: string,
  replace: string,
  occurrence: "first" | "all" | number | undefined
): { text: string; replaced: boolean; count: number } {
  let replaced = false;
  let count = 0;
  let out = text;

  if (occurrence === "first" || occurrence === undefined) {
    const idx = out.indexOf(find);
    if (idx !== -1) {
      out = out.slice(0, idx) + replace + out.slice(idx + find.length);
      replaced = true;
      count = 1;
    }
  } else if (occurrence === "all") {
    let n = 0;
    while (out.indexOf(find) !== -1) {
      out = out.replace(find, replace);
      n++;
    }
    replaced = n > 0;
    count = n;
  } else if (typeof occurrence === "number") {
    let n = 0;
    let pos = 0;
    while (n <= occurrence) {
      let found = out.indexOf(find, pos);
      if (found === -1) break;
      if (n === occurrence) {
        out = out.slice(0, found) + replace + out.slice(found + find.length);
        replaced = true;
        count = 1;
        break;
      }
      pos = found + find.length;
      n++;
    }
  }
  return { text: out, replaced, count };
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
