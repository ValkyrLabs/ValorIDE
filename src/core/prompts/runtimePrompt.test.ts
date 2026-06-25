import { composeRuntimeSystemPrompt } from "./runtimePrompt";
import type { SelectedPrompt } from "@services/llmPromptService";

const selectedPrompt = (
  mode: SelectedPrompt["mode"],
): SelectedPrompt => ({
  source: "thorapi",
  llmDetailsId: "llm-details-1",
  name: "GrayMatter Vibe Coding",
  prompt: "SERVER PROMPT: use GrayMatter memory and business invariants.",
  mode,
  tags: ["valoride", "graymatter"],
  stackSpecific: true,
});

describe("composeRuntimeSystemPrompt", () => {
  it("keeps the built-in ValorIDE runtime contract when a SYSTEM prompt is selected", () => {
    const prompt = composeRuntimeSystemPrompt(
      "BUILT-IN PROMPT: use tools, SWARM, reasoning, and completion reports.",
      selectedPrompt("SYSTEM"),
    );

    expect(prompt).toContain("SELECTED VALKYRAI PROMPT");
    expect(prompt).toContain("SERVER PROMPT");
    expect(prompt).toContain("BUILT-IN VALORIDE RUNTIME PROMPT");
    expect(prompt).toContain("BUILT-IN PROMPT");
    expect(prompt.indexOf("SERVER PROMPT")).toBeLessThan(
      prompt.indexOf("BUILT-IN PROMPT"),
    );
  });

  it("appends APPEND prompts after the built-in ValorIDE runtime contract", () => {
    const prompt = composeRuntimeSystemPrompt(
      "BUILT-IN PROMPT: use tools first.",
      selectedPrompt("APPEND"),
    );

    expect(prompt.indexOf("BUILT-IN PROMPT")).toBeLessThan(
      prompt.indexOf("SERVER PROMPT"),
    );
  });

  it("uses the built-in prompt unchanged when no server prompt is active", () => {
    expect(composeRuntimeSystemPrompt("BUILT-IN ONLY", null)).toBe(
      "BUILT-IN ONLY",
    );
  });
});
