export type LlmPromptMode = "SYSTEM" | "APPEND";

export interface LlmDetailsSummary {
  id: string;
  name: string;
  description?: string;
  promptType?: LlmPromptMode;
  initialPrompt?: string;
  tags?: string[];
  ratingScore?: number;
  provider?: string;
  version?: string;
  lastModifiedDate?: string;
}

export interface SelectedLlmDetails extends LlmDetailsSummary {
  prompt: string;
  mode: LlmPromptMode;
  source: "thorapi" | "fallback" | "manual";
  updatedAt: number;
}
