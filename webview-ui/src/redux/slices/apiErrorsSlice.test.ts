import { describe, expect, it } from "vitest";
import reducer, {
  apiErrorReceived,
  clearAccountBalancePrompt,
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
    const state = reducer(undefined, insufficientCreditsDetected(baseError));
    expect(state.lastError).toEqual(baseError);
    expect(state.showAccountBalance).toBe(true);
  });

  it("clears account balance prompt", () => {
    const withPrompt = reducer(
      undefined,
      insufficientCreditsDetected(baseError),
    );
    const cleared = reducer(withPrompt, clearAccountBalancePrompt());
    expect(cleared.showAccountBalance).toBe(false);
  });
});
