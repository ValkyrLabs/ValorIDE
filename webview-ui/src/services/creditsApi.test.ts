import { describe, expect, it } from "vitest";
import { isInsufficientFunds, normalizeAccountBalance } from "./creditsApi";

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

describe("normalizeAccountBalance", () => {
  it("derives whole credit balance when summary balance is stale zero", () => {
    expect(
      normalizeAccountBalance({
        currentBalance: 0,
        payments: [{ credits: "10" }],
        usageTransactions: [{ credits: "2" }],
      }).currentBalance,
    ).toBe(8);
  });

  it("accepts alternate balance field names", () => {
    expect(
      normalizeAccountBalance({
        current_balance: "42",
        paymentTransactions: [],
        usage: [],
      }).currentBalance,
    ).toBe(42);
  });

  it("accepts authenticated balance summary payloads", () => {
    expect(
      normalizeAccountBalance({
        customerId: "acct-123",
        currentBalance: 72,
        paymentTransactionCount: 2,
        usageTransactionCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        customerId: "acct-123",
        currentBalance: 72,
        payments: [],
        usageTransactions: [],
      }),
    );
  });
});
