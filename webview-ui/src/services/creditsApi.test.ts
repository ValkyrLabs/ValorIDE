import { describe, expect, it } from "vitest";
import { isInsufficientFunds } from "./creditsApi";

describe("creditsApi isInsufficientFunds", () => {
  it("detects INSUFFICIENT_CREDITS errors", () => {
    const error = {
      data: {
        error: "INSUFFICIENT_CREDITS",
      },
    };

    expect(isInsufficientFunds(error)).toBe(true);
  });
});
