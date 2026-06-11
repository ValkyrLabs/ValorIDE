//! @ts-check
/**
 * ChatSettings defines the operational parameters for the ValorIDE agentic chat experience.
 */

export interface ChatSettings {
  mode: "plan" | "act";
  stubbornMode?: boolean; // When enabled, auto-asks for thoroughness after completion
  // Optional per-session safeguards and pacing
  llmSource?: 'cloud' | 'local'; // Source of the LLM (Cloud or Local)
  // Optional per-session safeguards and pacing
  budgetLimit?: number; // USD cap for current session
  apiThrottleMs?: number; // Delay between API calls in milliseconds
  llmBaseUrl?: string; // Base URL for local LLM service (e.g., http://localhost:11434)
  llmLongTimeoutMs?: number; // Extended timeout for complex local LLM reasoning (milliseconds)
  apiFirstChunkTimeoutMs?: number;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  mode: "act",
  // Default cloud LLM settings: Cloud source, default timeouts.
  llmSource: 'cloud',
  llmBaseUrl: undefined,
  llmLongTimeoutMs: 1_900_000, // Default local timeout (15 minutes), 
  apiFirstChunkTimeoutMs: 1_360_000, // Cloud default first chunk timeout
};
