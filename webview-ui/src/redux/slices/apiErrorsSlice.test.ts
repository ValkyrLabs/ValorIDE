import { describe, expect, it } from "vitest";
import reducer, {
  apiErrorReceived,
  clearAccountBalancePrompt,
  clearCreditIntent,
  insufficientCreditsDetected,
} from "./apiErrorsSlice";

const baseError = {
  id: "req-1",
  status: 402,
  endpointName: "generateApplication",
  message: "insufficient credit balance",
  data: { error: "INSUFFICIENT_CREDITS" },
};

describe("apiErrorsSlice", () => {
  it("stores last error without triggering account balance prompt", () => {
    const state = reducer(undefined, apiErrorReceived(baseError));
    expect(state.lastError).toEqual(baseError);
    expect(state.showAccountBalance).toBe(false);
  });

  it("flags account balance prompt for insufficient credits", () => {
    const state = reducer(
      undefined,
      insufficientCreditsDetected({
        error: baseError,
        creditIntent: {
          actionName: "Generate application",
          requiredCredits: 3,
          currentBalance: 0.25,
        },
      }),
    );
    expect(state.lastError).toEqual(baseError);
    expect(state.showAccountBalance).toBe(true);
    expect(state.creditIntent?.actionName).toBe("Generate application");
  });

  it("clears account balance prompt", () => {
    const withPrompt = reducer(
      undefined,
      insufficientCreditsDetected({ error: baseError }),
    );
    const cleared = reducer(withPrompt, clearAccountBalancePrompt());
    expect(cleared.showAccountBalance).toBe(false);
  });

  it("clears the task-aware credit intent after purchase or resume", () => {
    const withIntent = reducer(
      undefined,
      insufficientCreditsDetected({
        error: baseError,
        creditIntent: {
          actionName: "Run agent",
          requiredCredits: 2,
          currentBalance: 0,
        },
      }),
    );

    const cleared = reducer(withIntent, clearCreditIntent());
    expect(cleared.creditIntent).toBeUndefined();
  });
});
