import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import StartupDebit, {
  getOrCreateStartupDebitReceipt,
  hasStartupDebitBeenSent,
  markStartupDebitSent,
} from "./StartupDebit";

const mockRecordUsageTransaction = vi.fn();
const mockReadStoredPrincipal = vi.fn();

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  } as Storage;
};

vi.mock("@thorapi/services/creditsApi", () => ({
  useRecordUsageTransactionMutation: () => [mockRecordUsageTransaction],
}));

vi.mock("@thorapi/utils/accessControl", () => ({
  readStoredPrincipal: () => mockReadStoredPrincipal(),
}));

describe("StartupDebit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem("jwtToken", "token");
    mockRecordUsageTransaction.mockReset();
    mockRecordUsageTransaction.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ currentBalance: 10 }),
    });
    mockReadStoredPrincipal.mockReset();
    mockReadStoredPrincipal.mockReturnValue({ id: "account-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses the same startup debit idempotency key and spentAt for retries", () => {
    vi.setSystemTime(new Date("2026-07-01T16:00:00.000Z"));

    const first = getOrCreateStartupDebitReceipt("account-1");
    vi.setSystemTime(new Date("2026-07-01T16:01:00.000Z"));
    const retry = getOrCreateStartupDebitReceipt("account-1");

    expect(retry).toEqual(first);
    expect(first.idempotencyKey).toMatch(/^auto-connect-account-1-/);
    expect(first.spentAt).toBe("2026-07-01T16:00:00.000Z");
  });

  it("records startup debit with matching stable body and idempotency key", async () => {
    vi.setSystemTime(new Date("2026-07-01T16:00:00.000Z"));

    render(<StartupDebit />);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockRecordUsageTransaction).toHaveBeenCalledTimes(1);
    const call = mockRecordUsageTransaction.mock.calls[0][0];

    expect(call.accountId).toBe("account-1");
    expect(call.idempotencyKey).toMatch(/^auto-connect-account-1-/);
    expect(call.usage).toMatchObject({
      spentAt: "2026-07-01T16:00:00.250Z",
      credits: 1,
      modelProvider: "valoride",
      model: "auto-connect",
      promptTokens: 0,
      completionTokens: 0,
    });
    expect(hasStartupDebitBeenSent("account-1")).toBe(true);
  });

  it("keeps the sent guard account-scoped", () => {
    markStartupDebitSent("account-1");

    expect(hasStartupDebitBeenSent("account-1")).toBe(true);
    expect(hasStartupDebitBeenSent("account-2")).toBe(false);
  });

  it("ignores the legacy global sent flag once account scope is known", async () => {
    sessionStorage.setItem("valoride.startupDebit.sent", "true");

    render(<StartupDebit />);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockRecordUsageTransaction).toHaveBeenCalledTimes(1);
    expect(mockRecordUsageTransaction.mock.calls[0][0].accountId).toBe(
      "account-1",
    );
  });

  it("does not reuse another account's startup debit receipt", () => {
    const accountOne = getOrCreateStartupDebitReceipt("account-1");
    const accountTwo = getOrCreateStartupDebitReceipt("account-2");

    expect(accountOne.idempotencyKey).toMatch(/^auto-connect-account-1-/);
    expect(accountTwo.idempotencyKey).toMatch(/^auto-connect-account-2-/);
    expect(accountOne.idempotencyKey).not.toBe(accountTwo.idempotencyKey);
  });
});
