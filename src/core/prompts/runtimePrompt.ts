import type { SelectedPrompt } from "@services/llmPromptService";

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
): string {
  if (!selectedPrompt?.prompt?.trim()) {
    return fallbackSystemPrompt;
  }

  if (selectedPrompt.mode === "SYSTEM") {
    return [
      formatSelectedPromptSection(selectedPrompt),
      formatBuiltInValorIDEPromptSection(fallbackSystemPrompt),
      formatRuntimePrecedenceSection(),
    ].join("");
  }

  return [
    fallbackSystemPrompt,
    formatSelectedPromptSection(selectedPrompt),
    formatRuntimePrecedenceSection(),
  ].join("");
}
