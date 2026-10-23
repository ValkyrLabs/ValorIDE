import { composeRuntimeSystemPrompt } from "./runtimePrompt";
import type { SelectedPrompt } from "@services/llmPromptService";
import { estimateTextTokens } from "@core/context/context-management/ContextEfficiency";

const selectedPrompt = (mode: SelectedPrompt["mode"]): SelectedPrompt => ({
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
    expect(prompt).toContain("RUNTIME PROMPT PRECEDENCE");
    expect(prompt).toContain("built-in ValorIDE runtime contract wins");
    expect(prompt.indexOf("SERVER PROMPT")).toBeLessThan(
      prompt.indexOf("BUILT-IN PROMPT"),
    );
    expect(prompt.indexOf("BUILT-IN PROMPT")).toBeLessThan(
      prompt.indexOf("RUNTIME PROMPT PRECEDENCE"),
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
    expect(prompt.indexOf("SERVER PROMPT")).toBeLessThan(
      prompt.indexOf("RUNTIME PROMPT PRECEDENCE"),
    );
    expect(prompt).toContain("required completion-report contract");
  });

  it("uses the built-in prompt unchanged when no server prompt is active", () => {
    expect(composeRuntimeSystemPrompt("BUILT-IN ONLY", null)).toBe(
      "BUILT-IN ONLY",
    );
  });

  it("extractively compacts duplicate LlmDetails guidance for small models", () => {
    const prompt = composeRuntimeSystemPrompt(
      "BUILT-IN PROMPT: use tools first and preserve tenant ACL security.",
      {
        ...selectedPrompt("SYSTEM"),
        prompt: [
          "# Persona",
          "You are an excellent coding agent.",
          "# Security",
          "Preserve tenant RBAC and generated ACL checks.",
          "# Irrelevant verbosity",
          "word ".repeat(4_000),
        ].join("\n"),
      },
      { compact: true, maxSelectedPromptTokens: 80, task: "tenant ACL fix" },
    );

    expect(prompt).toContain("Selected LlmDetails guidance");
    expect(prompt).toContain("Preserve tenant RBAC");
    expect(prompt).toContain("BUILT-IN PROMPT");
    expect(prompt.length).toBeLessThan(2_000);
    const selectedSection = prompt.split("BUILT-IN PROMPT")[0];
    expect(estimateTextTokens(selectedSection)).toBeLessThan(120);
  });
});
