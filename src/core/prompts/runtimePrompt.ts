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
    selectedPrompt.prompt,
  );

export const formatBuiltInValorIDEPromptSection = (
  fallbackSystemPrompt: string,
) =>
  section(
    "BUILT-IN VALORIDE RUNTIME PROMPT — TOOL USE, CHAT UX, SWARM, AND COMPLETION CONTRACT",
    fallbackSystemPrompt,
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
    ].join("");
  }

  return [
    fallbackSystemPrompt,
    formatSelectedPromptSection(selectedPrompt),
  ].join("");
}
