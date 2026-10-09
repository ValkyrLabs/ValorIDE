import { describe, expect, it } from "vitest";
import { getGrayMatterContextPresentation } from "../grayMatterContextPresentation";

describe("GrayMatter connection and memory outcomes", () => {
  it("treats an accepted empty result as a successful check without recovery", () => {
    expect(
      getGrayMatterContextPresentation({
        status: "empty",
        policyState: "allowed",
        citations: 0,
        recovery: {
          message: "Sign in again",
          actions: [{ id: "open_login" }],
        },
      }),
    ).toMatchObject({
      title: "memory checked",
      statusLabel: "no relevant memories",
      tone: "ready",
      message: expect.stringContaining("No relevant memories were found"),
      showRecoveryActions: false,
    });
  });

  it.each([
    "retry_required",
    "clarification_required",
    "conflicting",
    "partial",
    "stale",
  ])(
    "keeps a %s quality outcome separate from connection failure",
    (policyState) => {
      const presentation = getGrayMatterContextPresentation({
        status: "unavailable",
        policyState,
        citations: 0,
        message: "Refine the request and retry. No memory was added.",
        recovery: { actions: [{ id: "open_account" }] },
      });
      expect(presentation).toMatchObject({
        title: "memory checked",
        statusLabel: "no context used",
        tone: "neutral",
        showRecoveryActions: false,
      });
      expect(presentation.message).toContain("GrayMatter is connected");
      expect(presentation.message).toContain("Continuing with project context");
      expect(presentation.message).not.toMatch(
        /retry|No relevant memories were found/,
      );
    },
  );

  it("does not turn a failed receipt verification into no matches", () => {
    expect(
      getGrayMatterContextPresentation({
        status: "unavailable",
        policyState: "unavailable",
        message: "GrayMatter's receipt could not be verified.",
      }),
    ).toMatchObject({
      title: "memory check failed",
      statusLabel: "receipt not verified",
      tone: "warning",
      showRecoveryActions: false,
    });
  });

  it.each([
    ["unauthenticated", "sign in required"],
    ["forbidden", "access denied"],
    ["quota", "credits needed"],
  ])(
    "keeps actual %s access failures visible despite stale receipt metadata",
    (status, statusLabel) => {
      expect(
        getGrayMatterContextPresentation({
          status,
          policyState: "retry_required",
          message: "Actual access error",
        }),
      ).toMatchObject({
        title: "needs attention",
        statusLabel,
        tone: "warning",
        message: "Actual access error",
        showRecoveryActions: true,
      });
    },
  );

  it.each([
    ["denied", "access denied"],
    ["quota", "credits needed"],
  ])(
    "does not hide a %s policy behind an empty status",
    (policyState, statusLabel) => {
      expect(
        getGrayMatterContextPresentation({ status: "empty", policyState }),
      ).toMatchObject({ statusLabel, tone: "warning" });
    },
  );

  it.each([undefined, "unknown", "allowed", "toString"])(
    "does not guess connection success from an unavailable result with policy %s",
    (policyState) => {
      expect(
        getGrayMatterContextPresentation({
          status: "unavailable",
          policyState,
          citations: 0,
          message: "The backend did not respond.",
        }),
      ).toMatchObject({
        title: "needs attention",
        statusLabel: "unavailable",
        tone: "warning",
        message: "The backend did not respond.",
      });
    },
  );

  it.each([
    ["checking", "checking connection", "checking"],
    ["disabled", "memory off", "off"],
  ])("shows %s without an attention warning", (status, title, statusLabel) => {
    expect(getGrayMatterContextPresentation({ status })).toMatchObject({
      title,
      statusLabel,
      tone: "neutral",
      showRecoveryActions: false,
    });
  });

  it("preserves a successful injection message and does not alter the receipt", () => {
    const payload = Object.freeze({
      status: "ready",
      policyState: "allowed_with_caveat",
      citations: 2,
      message: "GrayMatter injected 2 remembered context entries.",
    });
    expect(getGrayMatterContextPresentation(payload)).toMatchObject({
      title: "memory checked",
      statusLabel: "ready",
      tone: "ready",
      message: payload.message,
      showRecoveryActions: false,
    });
    expect(payload).toEqual({
      status: "ready",
      policyState: "allowed_with_caveat",
      citations: 2,
      message: "GrayMatter injected 2 remembered context entries.",
    });
  });
});
