export interface ChatSettings {
  mode: "plan" | "act";
  stubbornMode?: boolean; // When enabled, auto-asks for thoroughness after completion
  // Optional per-session safeguards and pacing
  budgetLimit?: number; // USD cap for current session
  apiThrottleMs?: number; // Delay between API calls in milliseconds
  apiFirstChunkTimeoutMs?: number; // Max wait before treating a request as stuck
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  mode: "act",
  apiFirstChunkTimeoutMs: 45_000,
};
