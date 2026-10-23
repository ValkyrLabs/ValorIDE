export type LlmPromptMode = "SYSTEM" | "APPEND";

export interface LlmDetailsSummary {
  contextWindow?: number;
  id: string;
  name: string;
  description?: string;
  promptType?: LlmPromptMode;
  initialPrompt?: string;
  maxTokens?: number;
  tags?: string[];
  ratingScore?: number;
  provider?: string;
  supportsImages?: boolean;
  supportsPromptCache?: boolean;
  version?: string;
  lastModifiedDate?: string;
}

export interface SelectedLlmDetails extends LlmDetailsSummary {
  prompt: string;
  mode: LlmPromptMode;
  source: "thorapi" | "fallback" | "manual";
  updatedAt: number;
}
