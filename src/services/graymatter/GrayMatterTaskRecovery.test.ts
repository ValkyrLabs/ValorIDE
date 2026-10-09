import { it } from "@jest/globals";
import { defaultGrayMatterCapabilities } from "@shared/GrayMatterSession";
import type { GrayMatterSessionState } from "@shared/GrayMatterSession";
import {
  grayMatterPolicyMessage,
  shouldDegradeGrayMatterAccess,
  waitForGrayMatterTaskSession,
} from "./GrayMatterTaskRecovery";

const session = (
  status: GrayMatterSessionState["status"],
): GrayMatterSessionState => ({
  baseUrl: "https://api-0.valkyrlabs.com/v1",
  capabilities: {
    ...defaultGrayMatterCapabilities,
    memoryRead: status === "ready",
    memoryQuery: status === "ready",
  },
  checkedAt: "2026-10-09T02:01:34.008Z",
  status,
});

describe("GrayMatter task recovery", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("uses the recovered session before reporting the cached failure", async () => {
    const ready = session("ready");
    const refreshed = new Promise<GrayMatterSessionState>((resolve) =>
      setTimeout(() => resolve(ready), 266),
    );
    const result = waitForGrayMatterTaskSession(
      refreshed,
      session("unavailable"),
    );
    await jest.advanceTimersByTimeAsync(266);
    await expect(result).resolves.toEqual({ pending: false, session: ready });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("bounds a stalled discovery and does not project the old failure as current", async () => {
    const result = waitForGrayMatterTaskSession(
      new Promise(() => {}),
      session("unavailable"),
    );
    await jest.advanceTimersByTimeAsync(2_000);
    await expect(result).resolves.toEqual({
      pending: true,
      session: undefined,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("lets a late refresh finish for the next task without changing this task's result", async () => {
    const ready = session("ready");
    const updated = jest.fn();
    const refreshed = new Promise<GrayMatterSessionState>((resolve) =>
      setTimeout(() => resolve(ready), 2_200),
    ).then((value) => {
      updated(value);
      return value;
    });
    const result = waitForGrayMatterTaskSession(
      refreshed,
      session("unavailable"),
    );
    await jest.advanceTimersByTimeAsync(2_000);
    await expect(result).resolves.toEqual({
      pending: true,
      session: undefined,
    });
    await jest.advanceTimersByTimeAsync(200);
    expect(updated).toHaveBeenCalledWith(ready);
    await expect(result).resolves.toEqual({
      pending: true,
      session: undefined,
    });
  });

  it.each(["forbidden", "quota", "unauthenticated"] as const)(
    "returns a fresh %s instead of cached readiness",
    async (status) => {
      const denied = session(status);
      await expect(
        waitForGrayMatterTaskSession(Promise.resolve(denied), session("ready")),
      ).resolves.toEqual({ pending: false, session: denied });
    },
  );

  it.each([
    "retry_required",
    "clarification_required",
    "conflicting",
    "partial",
    "stale",
    "unavailable",
  ] as const)("keeps discovery separate from a %s receipt", (policyState) => {
    expect(
      shouldDegradeGrayMatterAccess({ status: "unavailable", policyState }),
    ).toBe(false);
    expect(grayMatterPolicyMessage(policyState)).toContain(
      "No memory was added",
    );
  });

  it.each(["unauthenticated", "forbidden", "quota"] as const)(
    "still invalidates capabilities after an actual %s",
    (status) => {
      expect(
        shouldDegradeGrayMatterAccess({
          status,
          policyState: "retry_required",
        }),
      ).toBe(true);
    },
  );

  it.each(["denied", "quota"] as const)(
    "does not preserve access after a %s policy",
    (policyState) => {
      expect(
        shouldDegradeGrayMatterAccess({ status: "unavailable", policyState }),
      ).toBe(true);
    },
  );

  it("still invalidates capabilities after a transport failure", () => {
    expect(shouldDegradeGrayMatterAccess({ status: "unavailable" })).toBe(true);
  });
});
