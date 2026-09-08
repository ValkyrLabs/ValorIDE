import { ContextManager } from "../ContextManager";
import { Anthropic } from "@anthropic-ai/sdk";
import { expect } from "chai";

// Truncation tests do not launch subprocesses; keep the storage module real.
jest.mock("execa", () => ({ execa: jest.fn() }));

describe("ContextManager", () => {
  function createMessages(count: number): Anthropic.Messages.MessageParam[] {
    const messages: Anthropic.Messages.MessageParam[] = [];

    messages.push({
      role: "user",
      content: "Initial task message",
    });

    let role: "user" | "assistant" = "assistant";
    for (let i = 1; i < count; i++) {
      messages.push({
        role,
        content: `Message ${i}`,
      });
      role = role === "user" ? "assistant" : "user";
    }

    return messages;
  }

  describe("getNextTruncationRange", () => {
    let contextManager: ContextManager;

    beforeEach(() => {
      contextManager = new ContextManager();
    });

    it("first truncation with half keep", () => {
      const messages = createMessages(11);
      const result = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "half",
      );

      expect(result).to.deep.equal([2, 5]);
    });

    it("first truncation with quarter keep", () => {
      const messages = createMessages(11);
      const result = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "quarter",
      );

      expect(result).to.deep.equal([2, 7]);
    });

    it("sequential truncation with half keep", () => {
      const messages = createMessages(21);
      const firstRange = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "half",
      );
      expect(firstRange).to.deep.equal([2, 9]);

      // Pass the previous range for sequential truncation
      const secondRange = contextManager.getNextTruncationRange(
        messages,
        firstRange,
        "half",
      );
      expect(secondRange).to.deep.equal([2, 13]);
    });

    it("sequential truncation with quarter keep", () => {
      const messages = createMessages(41);
      const firstRange = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "quarter",
      );

      const secondRange = contextManager.getNextTruncationRange(
        messages,
        firstRange,
        "quarter",
      );

      expect(secondRange[0]).to.equal(2);
      expect(secondRange[1]).to.be.greaterThan(firstRange[1]);
    });

    it("ensures the last removed message is an assistant after keeping the initial pair", () => {
      const messages = createMessages(14);
      const result = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "half",
      );

      // Check if the message at the end of range is a user message
      const lastRemovedMessage = messages[result[1]];
      expect(lastRemovedMessage.role).to.equal("assistant");

      // Check if the next message after the range is a user message
      const nextMessage = messages[result[1] + 1];
      expect(nextMessage.role).to.equal("user");
    });

    it("handles small message arrays", () => {
      const messages = createMessages(3);
      const result = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "half",
      );

      expect(result).to.deep.equal([2, 1]);
    });

    it("leaves empty histories and the initial pair intact", () => {
      for (const messages of [[], createMessages(1), createMessages(2)]) {
        for (const keep of ["none", "lastTwo", "half", "quarter"] as const) {
          const range = contextManager.getNextTruncationRange(
            messages,
            undefined,
            keep,
          );
          expect(
            contextManager.getTruncatedMessages(messages, range),
          ).to.deep.equal(messages);
        }
      }
    });

    it("preserves the message structure when truncating", () => {
      const messages = createMessages(20);
      const result = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "half",
      );

      // Get messages after removing the range
      const effectiveMessages = [
        ...messages.slice(0, result[0]),
        ...messages.slice(result[1] + 1),
      ];

      // Check first message and alternating pattern
      expect(effectiveMessages[0].role).to.equal("user");
      for (let i = 1; i < effectiveMessages.length; i++) {
        const expectedRole = i % 2 === 1 ? "assistant" : "user";
        expect(effectiveMessages[i].role).to.equal(expectedRole);
      }
    });
  });

  describe("getTruncatedMessages", () => {
    let contextManager: ContextManager;

    beforeEach(() => {
      contextManager = new ContextManager();
    });

    it("returns original messages when no range is provided", () => {
      const messages = createMessages(3);

      const result = contextManager.getTruncatedMessages(messages, undefined);
      expect(result).to.deep.equal(messages);
    });

    it("preserves the initial pair and removes an inclusive middle range", () => {
      const messages = createMessages(5);
      const result = contextManager.getTruncatedMessages(messages, [2, 3]);
      expect(result).to.deep.equal([messages[0], messages[1], messages[4]]);
    });

    it("keeps only the initial pair when all later complete pairs are removed", () => {
      const messages = createMessages(4);
      expect(
        contextManager.getTruncatedMessages(messages, [2, 3]),
      ).to.deep.equal(messages.slice(0, 2));
    });

    it("keeps the initial and latest pairs in order without mutating messages", () => {
      const messages = createMessages(6);
      const original = structuredClone(messages);
      const range = contextManager.getNextTruncationRange(
        messages,
        undefined,
        "lastTwo",
      );
      const result = contextManager.getTruncatedMessages(messages, range);
      expect(result).to.deep.equal([
        messages[0],
        messages[1],
        messages[4],
        messages[5],
      ]);
      expect(result.map((message) => message.role)).to.deep.equal([
        "user",
        "assistant",
        "user",
        "assistant",
      ]);
      expect(messages).to.deep.equal(original);
    });
  });
});
