import { describe, expect, it } from "@jest/globals";
import {
  evaluateGrayMatterReceiptPolicy,
  extractGrayMatterReceiptMetadata,
  redactGrayMatterPromptText,
  type GrayMatterReceiptMetadata,
} from "./GrayMatterReceiptPolicy";

const metadata = (
  overrides: Partial<GrayMatterReceiptMetadata> = {},
): GrayMatterReceiptMetadata => ({
  answerPolicy: "ALLOW_ANSWER",
  receiptId: "gm_rr_1",
  recommendedAction: "ANSWER",
  retrievalStatus: "OK",
  traceId: "gm_trace_1",
  ...overrides,
});

describe("GrayMatterReceiptPolicy", () => {
  it.each([
    ["REQUIRE_CLARIFICATION", "OK", "ANSWER", "clarification_required"],
    ["ALLOW_ANSWER", "CONFLICTING_CONTEXT", "ANSWER", "conflicting"],
    ["DENY", "ACCESS_DENIED", "DO_NOT_ANSWER", "denied"],
    ["ALLOW_ANSWER", "PARTIAL_COVERAGE", "ANSWER", "partial"],
    ["ALLOW_ANSWER", "QUOTA_EXHAUSTED", "BUY_CREDITS", "quota"],
    ["REQUIRE_RETRY", "LOW_CONFIDENCE", "RETRY_SAME_QUERY", "retry_required"],
    ["ALLOW_ANSWER", "STALE_CONTEXT", "ANSWER", "stale"],
    ["ALLOW_ANSWER", "ERROR", "ANSWER", "unavailable"],
  ])(
    "classifies %s/%s/%s as %s without allowing prompt context",
    (answerPolicy, retrievalStatus, recommendedAction, state) => {
      const outcome = evaluateGrayMatterReceiptPolicy(
        metadata({ answerPolicy, recommendedAction, retrievalStatus }),
      );

      expect(outcome.state).toBe(state);
      expect(outcome.allowsContext).toBe(false);
      expect(outcome.warning).toContain("receiptId=gm_rr_1");
      expect(outcome.warning).toContain("traceId=gm_trace_1");
    },
  );

  it("requires receipt and trace references before any prompt injection", () => {
    expect(
      evaluateGrayMatterReceiptPolicy(metadata({ receiptId: undefined })).state,
    ).toBe("unavailable");
    expect(
      evaluateGrayMatterReceiptPolicy(metadata({ traceId: undefined })).state,
    ).toBe("unavailable");
    expect(evaluateGrayMatterReceiptPolicy(undefined).allowsContext).toBe(
      false,
    );
  });

  it("preserves authorized quality, coverage, freshness, and contradiction evidence", () => {
    const extracted = extractGrayMatterReceiptMetadata({
      receipt: {
        ...metadata(),
        coverage: { coverageStatus: "COMPLETE" },
        quality: {
          contradictionScore: 0.12,
          freshnessScore: 0.84,
          overallScore: 0.91,
        },
      },
    });

    expect(extracted).toMatchObject({
      confidence: 0.91,
      contradictionScore: 0.12,
      coverageStatus: "COMPLETE",
      freshnessScore: 0.84,
      receiptId: "gm_rr_1",
      traceId: "gm_trace_1",
    });
    expect(evaluateGrayMatterReceiptPolicy(extracted).allowsContext).toBe(true);
  });

  it("redacts credentials, provider keys, tokens, and private keys", () => {
    const redacted = redactGrayMatterPromptText(
      [
        "password=hunter2",
        "api_key=sk-abcdefghijklmnopqrstuvwxyz123456",
        "github=ghp_abcdefghijklmnopqrstuvwxyz123456",
        "aws=AKIAIOSFODNN7EXAMPLE",
        "Authorization: Bearer top-secret-token",
        "-----BEGIN PRIVATE KEY-----\nsecret-key-material\n-----END PRIVATE KEY-----",
      ].join("\n"),
    );

    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("top-secret-token");
    expect(redacted).not.toContain("secret-key-material");
    expect(redacted).not.toContain("abcdefghijklmnopqrstuvwxyz123456");
    expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(redacted).toContain("[REDACTED_PRIVATE_KEY]");
  });
});
