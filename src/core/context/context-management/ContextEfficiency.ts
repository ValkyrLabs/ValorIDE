import type { Anthropic } from "@anthropic-ai/sdk";
import type { ModelInfo } from "@shared/api";

export type ContextEfficiencyMode = "compact" | "standard";

export interface ContextEfficiencyModelSignal {
  id: string;
  info: ModelInfo;
}

export interface ContextEfficiencyPromptSignal {
  name?: string;
  tags?: string[];
}

export interface ContextEfficiencyProfile {
  contextWindow: number;
  grayMatterTokenBudget: number;
  inputTokenBudget: number;
  mcpToolNameBudget: number;
  mode: ContextEfficiencyMode;
  modelKey: string;
  reason: string;
  selectedPromptTokenBudget: number;
}

export interface PromptTokenBreakdown {
  conversationTokens: number;
  grayMatterTokens: number;
  systemPromptTokens: number;
  totalInputTokens: number;
}

const LOCAL_MODEL_PATTERN =
  /(?:qwen|qwq|llama|mistral|mixtral|deepseek|phi[-_. ]?\d|gemma|granite|command-r|yi[-_. ]|codestral|starcoder|local|lmstudio|ollama)/iu;
const FRONTIER_MODEL_PATTERN =
  /(?:gpt-5(?:\.|-)|claude-(?:opus|sonnet|fable)-[45]|gemini-(?:2\.5|3))/iu;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

/**
 * Resolve one deterministic budget for prompt instructions, GrayMatter,
 * connected tool names, and conversation history. Model identity comes from
 * the active handler plus the selected LlmDetails name/tags, so UUID-backed
 * ValkyrAI routes still inherit the correct local/open-weight policy.
 */
export function resolveContextEfficiencyProfile(
  model: ContextEfficiencyModelSignal,
  selectedPrompt?: ContextEfficiencyPromptSignal | null,
): ContextEfficiencyProfile {
  const contextWindow = Math.max(8_192, model.info.contextWindow || 128_000);
  const modelKey = [
    model.id,
    model.info.description,
    selectedPrompt?.name,
    ...(selectedPrompt?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const explicitlyCompact =
    LOCAL_MODEL_PATTERN.test(modelKey) ||
    selectedPrompt?.tags?.some((tag) =>
      /^(?:context:compact|compact-context|local-model|small-model)$/iu.test(
        tag,
      ),
    );
  const constrainedContext =
    contextWindow <= 65_536 && !FRONTIER_MODEL_PATTERN.test(modelKey);
  const mode: ContextEfficiencyMode =
    explicitlyCompact || constrainedContext ? "compact" : "standard";

  if (mode === "compact") {
    return {
      contextWindow,
      grayMatterTokenBudget: 640,
      inputTokenBudget: clamp(Math.floor(contextWindow * 0.42), 6_000, 24_000),
      mcpToolNameBudget: 18,
      mode,
      modelKey,
      reason: explicitlyCompact
        ? "local-or-open-weight-model"
        : "constrained-context-window",
      selectedPromptTokenBudget: 800,
    };
  }

  const outputReserve = Math.max(
    8_192,
    Math.min(model.info.maxTokens || 16_384, Math.floor(contextWindow * 0.2)),
  );
  return {
    contextWindow,
    grayMatterTokenBudget: 2_000,
    inputTokenBudget: Math.max(
      8_000,
      Math.min(
        Math.floor(contextWindow * 0.75),
        contextWindow - outputReserve - 2_048,
      ),
    ),
    mcpToolNameBudget: 96,
    mode,
    modelKey,
    reason: "frontier-or-large-context-model",
    selectedPromptTokenBudget: 3_000,
  };
}

export function estimateTextTokens(value: string): number {
  if (!value) return 0;
  let ascii = 0;
  let nonAscii = 0;
  for (const character of value) {
    if (character.codePointAt(0)! <= 0x7f) ascii += 1;
    else nonAscii += 1;
  }
  return Math.ceil(ascii / 4 + nonAscii / 1.7);
}

const estimateUnknownTokens = (value: unknown): number => {
  if (typeof value === "string") return estimateTextTokens(value);
  if (value === undefined || value === null) return 0;
  try {
    return estimateTextTokens(JSON.stringify(value));
  } catch {
    return 0;
  }
};

export function estimateConversationTokens(
  messages: Anthropic.Messages.MessageParam[],
): number {
  return messages.reduce((total, message) => {
    let messageTokens = 4;
    if (typeof message.content === "string") {
      messageTokens += estimateTextTokens(message.content);
    } else {
      for (const block of message.content) {
        if (block.type === "text") {
          messageTokens += estimateTextTokens(block.text);
        } else if (block.type === "image") {
          // A fixed conservative allowance avoids counting base64 bytes as text.
          messageTokens += 1_024;
        } else {
          messageTokens += estimateUnknownTokens(block);
        }
      }
    }
    return total + messageTokens;
  }, 0);
}

export function measurePromptTokens(
  systemPrompt: string,
  messages: Anthropic.Messages.MessageParam[],
  grayMatterSection?: string,
): PromptTokenBreakdown {
  const systemPromptTokens = estimateTextTokens(systemPrompt);
  const conversationTokens = estimateConversationTokens(messages);
  const grayMatterTokens = estimateTextTokens(grayMatterSection ?? "");
  return {
    conversationTokens,
    grayMatterTokens,
    systemPromptTokens,
    totalInputTokens: systemPromptTokens + conversationTokens,
  };
}

export function promptContextTokens(input: {
  cacheReads?: number;
  cacheWrites?: number;
  estimatedTokensIn?: number;
  tokensIn?: number;
}): number {
  const measured =
    (input.tokensIn || 0) + (input.cacheReads || 0) + (input.cacheWrites || 0);
  return measured > 0 ? measured : input.estimatedTokensIn || 0;
}
