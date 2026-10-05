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
  const liteReceipt = () => ({
    receiptId: "ca944002-b655-4f31-adcc-886fcd6e085c",
    contextPageRef: "ca944002-b655-4f31-adcc-886fcd6e085c",
    policyVersion: "bifrost-lite-context/v1",
    contextHash: "a".repeat(64),
    retrievalStatus: "SUFFICIENT_CONTEXT",
    answerPolicy: "ANSWER_WITH_CITATIONS",
    recommendedAction: "use_context",
    staleRefs: [],
    omittedRefs: [],
  });

  it("adapts the actual flat Lite v1 contract using its explicit compiler reference", () => {
    const receipt = liteReceipt();
    const extracted = extractGrayMatterReceiptMetadata(receipt);
    expect(extracted).toMatchObject({
      format: "lite",
      receiptId: receipt.receiptId,
      traceId: receipt.contextPageRef,
    });
    expect(evaluateGrayMatterReceiptPolicy(extracted)).toMatchObject({
      allowsContext: true,
      state: "allowed",
    });
  });

  it("keeps a declared local keyword fallback usable with an explicit caveat", () => {
    const extracted = extractGrayMatterReceiptMetadata({
      ...liteReceipt(),
      semanticDegraded: true,
    });
    const result = evaluateGrayMatterReceiptPolicy(extracted);
    expect(result).toMatchObject({
      allowsContext: true,
      state: "allowed_with_caveat",
    });
    expect(result.warning).toContain("local_semantic_search_degraded");
  });

  it.each([
    { contextPageRef: "a-different-receipt" },
    { contextHash: "" },
    { policyVersion: "unknown/v2" },
    { staleRefs: undefined },
    { omittedRefs: undefined },
    { receiptId: "not-a-local-receipt" },
    { answerPolicy: "UNKNOWN_ALLOW" },
    { retrievalStatus: "UNKNOWN_OK" },
  ])("rejects incomplete or unknown Lite contract %j", (changes) => {
    expect(
      evaluateGrayMatterReceiptPolicy(
        extractGrayMatterReceiptMetadata({ ...liteReceipt(), ...changes }),
      ).allowsContext,
    ).toBe(false);
  });

  it.each([
    [{ staleRefs: ["changed-memory"] }, "stale"],
    [{ omittedRefs: ["missing-memory"] }, "partial"],
  ])(
    "blocks stale or omitted Lite sources despite a positive status %j",
    (changes, state) => {
      expect(
        evaluateGrayMatterReceiptPolicy(
          extractGrayMatterReceiptMetadata({ ...liteReceipt(), ...changes }),
        ),
      ).toMatchObject({ allowsContext: false, state });
    },
  );

  it("supports a flat hosted receipt only with its own explicit trace", () => {
    expect(
      evaluateGrayMatterReceiptPolicy(
        extractGrayMatterReceiptMetadata(metadata()),
      ).allowsContext,
    ).toBe(true);
    expect(
      evaluateGrayMatterReceiptPolicy(
        extractGrayMatterReceiptMetadata(metadata({ traceId: undefined })),
      ).allowsContext,
    ).toBe(false);
  });

  it.each([
    { answerAllowed: false },
    { answerPolicy: "DENY" },
    { retrievalStatus: "ACCESS_DENIED" },
    { answerPolicy: "UNKNOWN_ALLOW" },
    { retrievalStatus: "UNKNOWN_OK" },
    { answerAllowed: "false" },
    { recommendedAction: { action: "ANSWER" } },
  ])("a positive wrapper cannot override an unsafe receipt %j", (veto) => {
    const extracted = extractGrayMatterReceiptMetadata({
      graymatterPolicy: metadata(),
      receipt: { ...metadata(), ...veto },
    });
    expect(evaluateGrayMatterReceiptPolicy(extracted).allowsContext).toBe(
      false,
    );
  });

  it("rejects a wrapper bound to a different receipt or trace", () => {
    const extracted = extractGrayMatterReceiptMetadata({
      graymatterPolicy: metadata({ receiptId: "different" }),
      receipt: metadata(),
    });
    expect(evaluateGrayMatterReceiptPolicy(extracted)).toMatchObject({
      allowsContext: false,
      state: "conflicting",
    });
  });

  it("does not let caveats turn unknown policy into permission", () => {
    expect(
      evaluateGrayMatterReceiptPolicy(
        metadata({ answerPolicy: "UNKNOWN", caveatRequired: true }),
      ).allowsContext,
    ).toBe(false);
    expect(
      evaluateGrayMatterReceiptPolicy(
        metadata({ retrievalStatus: "UNKNOWN", warning: "use cautiously" }),
      ).allowsContext,
    ).toBe(false);
    expect(
      evaluateGrayMatterReceiptPolicy(
        metadata({ answerAllowed: false, caveatRequired: true }),
      ).allowsContext,
    ).toBe(false);
  });

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
