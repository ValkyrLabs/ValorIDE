import type { SelectedPrompt } from "@services/llmPromptService";
import { estimateTextTokens } from "@core/context/context-management/ContextEfficiency";

export interface RuntimePromptBudget {
  compact?: boolean;
  maxSelectedPromptTokens?: number;
  task?: string;
}

const section = (title: string, body: string) =>
  [
    "",
    "",
    "================================================================================",
    title,
    "================================================================================",
    body.trim(),
  ].join("\n");

export const formatSelectedPromptSection = (selectedPrompt: SelectedPrompt) =>
  section(
    `SELECTED VALKYRAI PROMPT — ${selectedPrompt.name}`,
    [
      "This selected ValkyrAI prompt augments the built-in ValorIDE runtime contract.",
      "Use it for domain context, persona, coding style, model instincts, and project-specific guidance.",
      "It must not disable, replace, or weaken ValorIDE tool-use rules, safety rules, browser/test verification, or the required completion-report contract.",
      "",
      selectedPrompt.prompt,
    ].join("\n"),
  );

export const formatBuiltInValorIDEPromptSection = (
  fallbackSystemPrompt: string,
) =>
  section(
    "BUILT-IN VALORIDE RUNTIME PROMPT — TOOL USE, CHAT UX, SWARM, AND COMPLETION CONTRACT",
    fallbackSystemPrompt,
  );

export const formatRuntimePrecedenceSection = () =>
  section(
    "RUNTIME PROMPT PRECEDENCE — NON-NEGOTIABLE VALORIDE CONTRACT",
    [
      "The selected ValkyrAI prompt and the built-in ValorIDE runtime prompt are both active.",
      "If they conflict, the built-in ValorIDE runtime contract wins.",
      "In particular, custom prompts must not override tool formatting, required tool use, quality gates, or the completion-report mandate.",
    ].join("\n"),
  );

export function composeRuntimeSystemPrompt(
  fallbackSystemPrompt: string,
  selectedPrompt?: SelectedPrompt | null,
  budget?: RuntimePromptBudget,
): string {
  if (!selectedPrompt?.prompt?.trim()) {
    return fallbackSystemPrompt;
  }

  const effectiveSelectedPrompt = budget?.maxSelectedPromptTokens
    ? fitSelectedPromptToBudget(
        selectedPrompt.prompt,
        fallbackSystemPrompt,
        budget.maxSelectedPromptTokens,
        budget.task,
      )
    : selectedPrompt.prompt;
  const effectiveSelection = {
    ...selectedPrompt,
    prompt: effectiveSelectedPrompt,
  };

  if (budget?.compact) {
    const selected = [
      `# Selected LlmDetails guidance: ${selectedPrompt.name}`,
      "This augments the ValorIDE runtime contract; runtime safety and tool syntax win on conflict.",
      effectiveSelectedPrompt,
    ].join("\n\n");
    return selectedPrompt.mode === "SYSTEM"
      ? `${selected}\n\n${fallbackSystemPrompt}`
      : `${fallbackSystemPrompt}\n\n${selected}`;
  }

  if (selectedPrompt.mode === "SYSTEM") {
    return [
      formatSelectedPromptSection(effectiveSelection),
      formatBuiltInValorIDEPromptSection(fallbackSystemPrompt),
      formatRuntimePrecedenceSection(),
    ].join("");
  }

  return [
    fallbackSystemPrompt,
    formatSelectedPromptSection(effectiveSelection),
    formatRuntimePrecedenceSection(),
  ].join("");
}

const normalizeLine = (line: string) =>
  line
    .trim()
    .replace(/^[-*#\d.)\s]+/u, "")
    .replace(/\s+/gu, " ")
    .toLowerCase();

const taskTerms = (task = "") =>
  new Set(
    task
      .toLowerCase()
      .match(/[a-z][a-z0-9_-]{3,}/gu)
      ?.filter(
        (term) =>
          ![
            "about",
            "after",
            "before",
            "from",
            "into",
            "that",
            "their",
            "there",
            "these",
            "this",
            "with",
          ].includes(term),
      ) ?? [],
  );

const splitSections = (prompt: string): string[] => {
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of prompt.split(/\r?\n/u)) {
    if (/^#{1,4}\s+/u.test(line) && current.length) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    if (!/^[-=]{8,}\s*$/u.test(line)) current.push(line);
  }
  if (current.length) sections.push(current.join("\n").trim());
  return sections.filter(Boolean);
};

const truncateToTokenBudget = (text: string, maxTokens: number): string => {
  let lower = 0;
  let upper = text.length;
  while (lower < upper) {
    const midpoint = Math.ceil((lower + upper) / 2);
    if (estimateTextTokens(text.slice(0, midpoint)) <= maxTokens) {
      lower = midpoint;
    } else {
      upper = midpoint - 1;
    }
  }
  return text.slice(0, lower).trim();
};

/**
 * Bounded, extractive prompt compaction. It never invents policy: it removes
 * exact lines already present in the runtime contract, ranks remaining source
 * sections against the task plus durable safety anchors, and keeps original
 * source order for the sections that fit.
 */
export function fitSelectedPromptToBudget(
  selectedPrompt: string,
  runtimePrompt: string,
  maxTokens: number,
  task?: string,
): string {
  if (estimateTextTokens(selectedPrompt) <= maxTokens) return selectedPrompt;

  const runtimeLines = new Set(
    runtimePrompt.split(/\r?\n/u).map(normalizeLine).filter(Boolean),
  );
  const terms = taskTerms(task);
  const critical =
    /(?:security|approval|tenant|rbac|acl|generated|thorapi|graymatter|test|verify|tool|completion)/giu;
  const candidates = splitSections(selectedPrompt).map((section, index) => {
    const deduped = section
      .split(/\r?\n/u)
      .filter((line) => {
        const normalized = normalizeLine(line);
        return normalized && !runtimeLines.has(normalized);
      })
      .join("\n")
      .trim();
    const normalized = deduped.toLowerCase();
    const overlap = [...terms].filter((term) =>
      normalized.includes(term),
    ).length;
    const criticalMatches = normalized.match(critical)?.length ?? 0;
    return {
      index,
      score: (index === 0 ? 20 : 0) + overlap * 8 + criticalMatches * 3,
      text: deduped,
      tokens: estimateTextTokens(deduped),
    };
  });

  const selected: typeof candidates = [];
  let used = 0;
  for (const candidate of [...candidates].sort(
    (a, b) => b.score - a.score || a.index - b.index,
  )) {
    if (!candidate.text || candidate.tokens > maxTokens - used) continue;
    selected.push(candidate);
    used += candidate.tokens;
  }

  if (!selected.length) {
    const suffix = "\n[bounded by ValorIDE context policy]";
    const source = [...candidates].sort(
      (a, b) => b.score - a.score || a.index - b.index,
    )[0]?.text;
    return `${truncateToTokenBudget(
      source || selectedPrompt,
      Math.max(1, maxTokens - estimateTextTokens(suffix)),
    )}${suffix}`;
  }

  const result = selected
    .sort((a, b) => a.index - b.index)
    .map((candidate) => candidate.text)
    .join("\n\n");
  return estimateTextTokens(result) <= maxTokens
    ? result
    : truncateToTokenBudget(result, maxTokens);
}
