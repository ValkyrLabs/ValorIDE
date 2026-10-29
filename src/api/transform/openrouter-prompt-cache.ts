/**
 * OpenRouter accepts Anthropic's explicit cache breakpoints for Claude models.
 * Keep this capability-based so newly added Claude releases do not silently
 * lose prompt caching and reprocess the full agent system prompt every turn.
 */
export const supportsExplicitAnthropicPromptCaching = (model: {
  id: string;
}): boolean => model.id.startsWith("anthropic/claude-");
