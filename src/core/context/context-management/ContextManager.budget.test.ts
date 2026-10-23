import type { Anthropic } from "@anthropic-ai/sdk";
import fs from "fs/promises";
import os from "os";
import path from "path";

jest.mock("@core/storage/disk", () => ({
  GlobalFileNames: { contextHistory: "context_history.json" },
}));

// Load after mocking the VS Code runtime-only disk module.
const { ContextManager } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./ContextManager") as typeof import("./ContextManager");

describe("ContextManager Bifrost proactive budgeting", () => {
  it("truncates history from estimates when a local provider reports no usage", async () => {
    const contextManager = new ContextManager();
    const messages = Array.from({ length: 20 }, (_, index) => ({
      content: `Message ${index} ${String(index).repeat(1_000)}`,
      role: index % 2 === 0 ? "user" : "assistant",
    })) as Anthropic.Messages.MessageParam[];
    const taskDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-context-budget-"),
    );

    try {
      const result = await contextManager.getNewContextMessagesAndMetadata(
        messages,
        [
          {
            say: "api_req_started",
            text: JSON.stringify({ isComplete: true }),
            ts: 1,
            type: "say",
          },
        ] as any,
        {
          getModel: () => ({
            id: "qwen-local",
            info: { contextWindow: 32_768, supportsPromptCache: false },
          }),
        } as any,
        undefined,
        0,
        taskDirectory,
        { inputTokenBudget: 2_000, systemPromptTokens: 500 },
      );

      expect(result.updatedConversationHistoryDeletedRange).toBe(true);
      expect(result.conversationHistoryDeletedRange?.[1]).toBeGreaterThan(2);
      expect(result.estimatedInputTokens).toBeLessThan(2_100);
      expect(result.truncatedConversationHistory.length).toBeLessThan(
        messages.length,
      );
    } finally {
      await fs.rm(taskDirectory, { force: true, recursive: true });
    }
  });
});
