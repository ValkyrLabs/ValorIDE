/**
 * Focused unit tests for command stall prevention.
 * These target the helper that guards command_output asks from hanging.
 */
import { jest } from "@jest/globals";
import {
  awaitAskWithTimeout,
  COMMAND_OUTPUT_TIMEOUT_MS,
} from "../utils/askWithTimeout";

describe("Command Stall Prevention", () => {
  describe("awaitAskWithTimeout", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("auto-approves when the ask never resolves", async () => {
      const pendingAsk = new Promise<any>(() => {});
      const resultPromise = awaitAskWithTimeout(
        pendingAsk as any,
        50, // short timeout for test
      );
      jest.advanceTimersByTime(60);
      await expect(resultPromise).resolves.toEqual({
        response: "yesButtonClicked",
        text: "",
        images: [],
      });
    });

    it("returns the ask result when it arrives before the timeout", async () => {
      const askResponse = Promise.resolve({
        response: "messageResponse",
        text: "stop",
        images: undefined,
      } as any);
      const result = await awaitAskWithTimeout(
        askResponse,
        COMMAND_OUTPUT_TIMEOUT_MS,
      );
      expect(result).toEqual({
        response: "messageResponse",
        text: "stop",
        images: undefined,
      });
    });
  });
});
