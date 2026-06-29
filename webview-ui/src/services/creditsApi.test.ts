import { describe, expect, it } from "vitest";
import {
  chooseBestBalance,
  getAccountBalancePath,
  getAccountBalanceSummaryPath,
  isInsufficientFunds,
  mergeAccountBalance,
  normalizeAccountBalance,
  resolveBalanceLookupAccountIds,
  resolvePrimaryBalanceAccountId,
  selectSyncedAccountBalance,
} from "./creditsApi";

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
        paymentTransactions: [],
        usageTransactions: [],
      }),
    );
  });

  it("preserves paymentTransactions for generated consumers", () => {
    expect(
      normalizeAccountBalance({
        customerId: "acct-123",
        paymentTransactions: [{ credits: 12, amountCents: 1200 }],
        usageTransactions: [],
      }),
    ).toEqual(
      expect.objectContaining({
        customerId: "acct-123",
        currentBalance: 12,
        payments: [{ credits: 12, amountCents: 1200 }],
        paymentTransactions: [{ credits: 12, amountCents: 1200 }],
        usageTransactions: [],
      }),
    );
  });

  it("accepts alternate account identifier field names", () => {
    expect(
      normalizeAccountBalance({
        account_id: "acct-456",
        currentBalance: 34,
      }),
    ).toEqual(
      expect.objectContaining({
        customerId: "acct-456",
        currentBalance: 34,
      }),
    );
  });
});

describe("chooseBestBalance", () => {
  it("prefers richer ledger data over a zero-row summary with the same balance", () => {
    const summary = normalizeAccountBalance({
      customerId: "acct-123",
      currentBalance: 72,
    });
    const detailed = normalizeAccountBalance({
      customerId: "acct-123",
      currentBalance: 72,
      paymentTransactions: [{ credits: 100 }],
      usageTransactions: [{ credits: 28 }],
    });

    expect(chooseBestBalance([summary, detailed])).toEqual(detailed);
  });
});

describe("mergeAccountBalance", () => {
  it("keeps full balance when authenticated summary is stale zero", () => {
    const summary = normalizeAccountBalance({
      customerId: "acct-123",
      currentBalance: 0,
    });
    const fullBalance = normalizeAccountBalance({
      customerId: "acct-123",
      currentBalance: 250,
      payments: [],
      usageTransactions: [],
    });

    expect(mergeAccountBalance(summary, fullBalance)?.currentBalance).toBe(250);
  });

  it("keeps summary when full balance is an empty zero and summary is populated", () => {
    const summary = normalizeAccountBalance({
      customerId: "acct-123",
      currentBalance: 72,
    });
    const fullBalance = normalizeAccountBalance({
      customerId: "acct-123",
      currentBalance: 0,
      payments: [],
      usageTransactions: [],
    });

    expect(mergeAccountBalance(summary, fullBalance)?.currentBalance).toBe(72);
  });
});

describe("selectSyncedAccountBalance", () => {
  it("keeps authenticated summary over stale generated fallback rows", () => {
    const summary = normalizeAccountBalance({
      customerId: "acct-live",
      currentBalance: 1906,
    });
    const staleFallback = normalizeAccountBalance({
      customerId: "acct-old",
      currentBalance: 3400,
      usageTransactions: [{ credits: 1 }, { credits: 1 }],
    });

    expect(
      selectSyncedAccountBalance({
        authoritativeCandidates: [],
        fallbackCandidates: [staleFallback],
        summaryBalance: summary,
      })?.currentBalance,
    ).toBe(1906);
  });

  it("keeps the dashboard summary balance while using live rows for history", () => {
    const summary = normalizeAccountBalance({
      customerId: "acct-live",
      currentBalance: 1906,
    });
    const liveBalance = normalizeAccountBalance({
      customerId: "acct-live",
      currentBalance: 1880,
      usageTransactions: [{ credits: 26 }],
    });

    expect(
      selectSyncedAccountBalance({
        authoritativeCandidates: [liveBalance],
        fallbackCandidates: [],
        summaryBalance: summary,
      })?.currentBalance,
    ).toBe(1906);
    expect(
      selectSyncedAccountBalance({
        authoritativeCandidates: [liveBalance],
        fallbackCandidates: [],
        summaryBalance: summary,
      })?.usageTransactions,
    ).toEqual([{ credits: 26 }]);
  });
});

describe("creditsApi balance request resolution", () => {
  it("prefers explicit account ids over me when the summary exposes one", () => {
    expect(resolvePrimaryBalanceAccountId("me", "acct-123")).toBe("acct-123");
    expect(getAccountBalancePath("me")).toBe("credits/me/balance");
    expect(getAccountBalanceSummaryPath("me")).toBe(
      "credits/me/balance/summary",
    );
  });

  it("keeps me as a fallback after explicit account ids", () => {
    expect(resolveBalanceLookupAccountIds("acct-123", "acct-456")).toEqual([
      "acct-123",
      "acct-456",
      "me",
    ]);
  });
});
