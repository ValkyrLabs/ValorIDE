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
    const tagMutations: TagMutation[] = [];
    for (const { start, end, replacement } of replacements) {
      const current = text.slice(start, end);
      if (current === replacement) {
        identicalCount++;
        continue;
      }
      mutated = true;
      text = `${text.slice(0, start)}${replacement}${text.slice(end)}`;

      const mutation = detectTagMutation(current, replacement, start);
      if (mutation) {
        tagMutations.push(mutation);
      }
    }

    if (!mutated) {
      ctx.skipped.push({ index, reason: identicalCount ? "already_applied" : "no_effect" });
      continue;
    }

    if (tagMutations.length) {
      const { text: adjustedText, warnings: tagWarnings } = applyTagMutations(text, tagMutations);
      text = adjustedText;
      for (const warning of tagWarnings) {
        ctx.warnings.push(`contextual edit ${index}: ${warning}`);
      }
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

type TagMutation =
  | {
      kind: "html";
      orientation: "open" | "close";
      start: number;
      oldName: string;
      newName: string;
      selfClosing: boolean;
    }
  | {
      kind: "mustache";
      orientation: "open" | "close";
      start: number;
      oldName: string;
      newName: string;
      openSigil?: "#" | "^";
    };

type TextAdjustment = { position: number; delta: number };

type TagMutationOutcome = {
  text: string;
  warnings: string[];
  adjustments: TextAdjustment[];
};

function detectTagMutation(original: string, replacement: string, start: number): TagMutation | undefined {
  const htmlOld = original.match(/^<\s*(\/?)\s*([A-Za-z0-9_.$:-]+)/);
  const htmlNew = replacement.match(/^<\s*(\/?)\s*([A-Za-z0-9_.$:-]+)/);

  if (htmlOld && htmlNew) {
    const orientationOld = htmlOld[1] ? "close" : "open";
    const orientationNew = htmlNew[1] ? "close" : "open";
    if (orientationOld === orientationNew && htmlOld[2] !== htmlNew[2]) {
      return {
        kind: "html",
        orientation: orientationOld,
        start,
        oldName: htmlOld[2],
        newName: htmlNew[2],
        selfClosing: orientationOld === "open" ? isSelfClosingSnippet(original) : false,
      };
    }
  }

  const mustacheOld = original.match(/^{{\s*([#/^])\s*([^\s{}]+)[\s\S]*}}$/);
  const mustacheNew = replacement.match(/^{{\s*([#/^])\s*([^\s{}]+)[\s\S]*}}$/);

  if (mustacheOld && mustacheNew) {
    const orientationOld = mustacheOld[1] === "/" ? "close" : "open";
    const orientationNew = mustacheNew[1] === "/" ? "close" : "open";
    if (orientationOld === orientationNew && mustacheOld[2] !== mustacheNew[2]) {
      return {
        kind: "mustache",
        orientation: orientationOld,
        start,
        oldName: mustacheOld[2],
        newName: mustacheNew[2],
        openSigil: orientationOld === "open" ? (mustacheOld[1] === "#" ? "#" : "^") : undefined,
      };
    }
  }

  return undefined;
}

function applyTagMutations(text: string, mutations: TagMutation[]): { text: string; warnings: string[] } {
  if (!mutations.length) {
    return { text, warnings: [] };
  }

  const ordered = mutations.map((mutation) => ({ ...mutation })).sort((a, b) => a.start - b.start);
  const warnings: string[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const mutation = ordered[i];
    const result = applySingleTagMutation(text, mutation);
    text = result.text;
    warnings.push(...result.warnings);

    if (!result.adjustments.length) {
      continue;
    }

    for (let j = i + 1; j < ordered.length; j++) {
      const pending = ordered[j];
      let updatedStart = pending.start;

      for (const adjustment of result.adjustments) {
        if (pending.start >= adjustment.position) {
          updatedStart += adjustment.delta;
        }
      }

      if (updatedStart !== pending.start) {
        ordered[j] = { ...pending, start: updatedStart };
      }
    }
  }

  return { text, warnings };
}

function applySingleTagMutation(text: string, mutation: TagMutation): TagMutationOutcome {
  if (mutation.kind === "html") {
    return applyHtmlTagMutation(text, mutation);
  }
  return applyMustacheTagMutation(text, mutation);
}

function applyHtmlTagMutation(text: string, mutation: Extract<TagMutation, { kind: "html" }>): TagMutationOutcome {
  const warnings: string[] = [];
  const adjustments: TextAdjustment[] = [];
  let out = text;

  if (mutation.orientation === "open") {
    if (mutation.selfClosing) {
      return { text: out, warnings, adjustments };
    }

    const tagEnd = findHtmlTagEnd(out, mutation.start);
    if (tagEnd === -1) {
      warnings.push(
        `tag_balance_failed: unable to locate end of <${mutation.newName}> while enforcing closing tag rename`,
      );
      return { text: out, warnings, adjustments };
    }

    const closing = findMatchingHtmlClosing(out, tagEnd + 1, new Set([mutation.oldName, mutation.newName]));
    if (!closing) {
      warnings.push(
        `tag_balance_failed: no closing tag found for <${mutation.oldName}> when renaming to <${mutation.newName}>`,
      );
      return { text: out, warnings, adjustments };
    }

    if (closing.currentName === mutation.newName) {
      return { text: out, warnings, adjustments };
    }

    out = replaceRange(out, closing.nameStart, closing.nameEnd, mutation.newName);
    adjustments.push({
      position: closing.nameStart,
      delta: mutation.newName.length - (closing.nameEnd - closing.nameStart),
    });
    return { text: out, warnings, adjustments };
  }

  const open = findMatchingHtmlOpen(out, mutation.start, new Set([mutation.oldName, mutation.newName]));
  if (!open) {
    warnings.push(
      `tag_balance_failed: no opening tag found for </${mutation.newName}> while renaming from </${mutation.oldName}>`,
    );
    return { text: out, warnings, adjustments };
  }

  if (open.currentName === mutation.newName) {
    return { text: out, warnings, adjustments };
  }

  out = replaceRange(out, open.nameStart, open.nameEnd, mutation.newName);
  adjustments.push({
    position: open.nameStart,
    delta: mutation.newName.length - (open.nameEnd - open.nameStart),
  });

  return { text: out, warnings, adjustments };
}

function applyMustacheTagMutation(
  text: string,
  mutation: Extract<TagMutation, { kind: "mustache" }>,
): TagMutationOutcome {
  const warnings: string[] = [];
  const adjustments: TextAdjustment[] = [];
  let out = text;

  if (mutation.orientation === "open") {
    const tagEnd = findMustacheEnd(out, mutation.start);
    if (tagEnd === -1) {
      warnings.push(
        `tag_balance_failed: unterminated mustache tag for ${mutation.oldName} when renaming to ${mutation.newName}`,
      );
      return { text: out, warnings, adjustments };
    }

    const closing = findMatchingMustacheClosing(out, tagEnd, new Set([mutation.oldName, mutation.newName]));
    if (!closing) {
      warnings.push(
        `tag_balance_failed: no closing mustache tag found for ${mutation.oldName} when renaming to ${mutation.newName}`,
      );
      return { text: out, warnings, adjustments };
    }

    if (closing.currentName === mutation.newName) {
      return { text: out, warnings, adjustments };
    }

    out = replaceRange(out, closing.nameStart, closing.nameEnd, mutation.newName);
    adjustments.push({
      position: closing.nameStart,
      delta: mutation.newName.length - (closing.nameEnd - closing.nameStart),
    });
    return { text: out, warnings, adjustments };
  }

  const opening = findMatchingMustacheOpen(out, mutation.start, new Set([mutation.oldName, mutation.newName]));
  if (!opening) {
    warnings.push(
      `tag_balance_failed: no opening mustache tag found for ${mutation.oldName} when renaming to ${mutation.newName}`,
    );
    return { text: out, warnings, adjustments };
  }

  if (opening.currentName === mutation.newName) {
    return { text: out, warnings, adjustments };
  }

  out = replaceRange(out, opening.nameStart, opening.nameEnd, mutation.newName);
  adjustments.push({
    position: opening.nameStart,
    delta: mutation.newName.length - (opening.nameEnd - opening.nameStart),
  });

  return { text: out, warnings, adjustments };
}

function replaceRange(text: string, start: number, end: number, replacement: string) {
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function isSelfClosingSnippet(snippet: string) {
  const normalized = snippet.trimEnd();
  if (!normalized.includes(">")) {
    return false;
  }

  let i = normalized.length - 1;
  while (i > 0 && /\s/.test(normalized[i])) {
    i--;
  }
  return normalized[i] === "/" || normalized.endsWith("/>");
}

function findHtmlTagEnd(text: string, start: number) {
  let inSingle = false;
  let inDouble = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === ">" && !inSingle && !inDouble) {
      return i;
    } else if (char === "\\" && (inSingle || inDouble)) {
      i++;
    }
  }
  return -1;
}

function isHtmlClosingAt(text: string, index: number) {
  let i = index + 1;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  return text[i] === "/";
}

function isHtmlSelfClosingAt(text: string, index: number) {
  const tagEnd = findHtmlTagEnd(text, index);
  if (tagEnd === -1) {
    return false;
  }
  let i = tagEnd - 1;
  while (i > index && /\s/.test(text[i])) {
    i--;
  }
  return text[i] === "/";
}

function findHtmlNameStart(text: string, index: number) {
  let i = index + 1;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  if (text[i] === "/") {
    i++;
    while (i < text.length && /\s/.test(text[i])) {
      i++;
    }
  }
  return i;
}

function findMatchingHtmlClosing(text: string, start: number, names: Set<string>) {
  const tagRegex = /<\s*\/?\s*([A-Za-z0-9_.$:-]+)/g;
  tagRegex.lastIndex = start;
  let depth = 0;

  while (true) {
    const match = tagRegex.exec(text);
    if (!match) {
      return undefined;
    }

    const index = match.index;
    const name = match[1];
    if (!names.has(name)) {
      continue;
    }

    if (!isHtmlClosingAt(text, index)) {
      if (!isHtmlSelfClosingAt(text, index)) {
        depth++;
      }
      continue;
    }

    if (depth === 0) {
      const nameStart = findHtmlNameStart(text, index);
      const nameEnd = nameStart + name.length;
      return { nameStart, nameEnd, currentName: name };
    }

    depth--;
  }
}

function findMatchingHtmlOpen(text: string, closingIndex: number, names: Set<string>) {
  const tagRegex = /<\s*\/?\s*([A-Za-z0-9_.$:-]+)/g;
  const tokens: Array<{ index: number; name: string; isClose: boolean; selfClosing: boolean }> = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) && match.index < closingIndex) {
    const name = match[1];
    if (!names.has(name)) {
      continue;
    }
    const index = match.index;
    const isClose = isHtmlClosingAt(text, index);
    const selfClosing = !isClose && isHtmlSelfClosingAt(text, index);
    tokens.push({ index, name, isClose, selfClosing });
  }

  let depth = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.isClose) {
      depth++;
      continue;
    }
    if (token.selfClosing) {
      continue;
    }
    if (depth === 0) {
      const nameStart = findHtmlNameStart(text, token.index);
      const nameEnd = nameStart + token.name.length;
      return { nameStart, nameEnd, currentName: token.name };
    }
    depth--;
  }
  return undefined;
}

function findMustacheEnd(text: string, start: number) {
  const marker = text.indexOf("}}", start);
  return marker === -1 ? -1 : marker + 2;
}

function findMatchingMustacheClosing(text: string, start: number, names: Set<string>) {
  const tokenRegex = /{{\s*([#/^])\s*([^\s{}]+)[^}]*}}/g;
  tokenRegex.lastIndex = start;
  let depth = 0;

  while (true) {
    const match = tokenRegex.exec(text);
    if (!match) {
      return undefined;
    }

    const sigil = match[1] as "#" | "/" | "^";
    const name = match[2];
    if (!names.has(name)) {
      continue;
    }
    if (sigil === "#" || sigil === "^") {
      depth++;
      continue;
    }

    if (sigil === "/" && depth === 0) {
      const bounds = mustacheNameBounds(match, name);
      if (!bounds) {
        return undefined;
      }
      return {
        nameStart: match.index + bounds.start,
        nameEnd: match.index + bounds.end,
        currentName: name,
      };
    }
    if (sigil === "/") {
      depth--;
    }
  }
}

function findMatchingMustacheOpen(text: string, closingIndex: number, names: Set<string>) {
  const tokenRegex = /{{\s*([#/^])\s*([^\s{}]+)[^}]*}}/g;
  const tokens: Array<{
    index: number;
    name: string;
    sigil: "#" | "/" | "^";
    nameStart: number;
    nameEnd: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(text)) && match.index < closingIndex) {
    const sigil = match[1] as "#" | "/" | "^";
    const name = match[2];
    if (!names.has(name)) {
      continue;
    }
    const bounds = mustacheNameBounds(match, name);
    if (!bounds) {
      continue;
    }
    tokens.push({
      index: match.index,
      name,
      sigil,
      nameStart: match.index + bounds.start,
      nameEnd: match.index + bounds.end,
    });
  }

  let depth = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.sigil === "/") {
      depth++;
      continue;
    }
    if (token.sigil === "#" || token.sigil === "^") {
      if (depth === 0) {
        return {
          nameStart: token.nameStart,
          nameEnd: token.nameEnd,
          currentName: token.name,
        };
      }
      depth--;
    }
  }

  return undefined;
}

function mustacheNameBounds(match: RegExpMatchArray, name: string) {
  const full = match[0];
  const start = full.indexOf(name);
  if (start === -1) {
    return undefined;
  }
  return { start, end: start + name.length };
}
