export type GrayMatterReceiptPolicyState =
  | "allowed"
  | "allowed_with_caveat"
  | "clarification_required"
  | "conflicting"
  | "denied"
  | "partial"
  | "quota"
  | "retry_required"
  | "stale"
  | "unavailable";

export interface GrayMatterReceiptMetadata {
  answerAllowed?: boolean;
  answerPolicy?: string;
  caveatRequired?: boolean;
  confidence?: number;
  contradictionScore?: number;
  coverageStatus?: string;
  disposition?: string;
  freshnessScore?: number;
  receiptId?: string;
  recommendedAction?: string;
  retrievalStatus?: string;
  requiredActions?: string[];
  traceId?: string;
  warning?: string;
  format?: "hosted" | "lite";
  liteProvenanceValid?: boolean;
  identityMismatch?: boolean;
  malformedPolicy?: boolean;
}

export interface GrayMatterReceiptPolicyOutcome {
  allowsContext: boolean;
  metadata?: GrayMatterReceiptMetadata;
  state: GrayMatterReceiptPolicyState;
  warning: string;
}

type JsonRecord = Record<string, unknown>;

const POLICY_DENIALS = new Set(["DENY"]);
const POLICY_RETRIES = new Set(["DO_NOT_ANSWER_CONFIDENTLY", "REQUIRE_RETRY"]);
const POLICY_CLARIFICATIONS = new Set(["REQUIRE_CLARIFICATION"]);
const STATUS_DENIALS = new Set(["ACCESS_DENIED", "POLICY_REDACTED"]);
const STATUS_RETRIES = new Set([
  "EVALUATOR_REJECTED",
  "LOW_CONFIDENCE",
  "RETRY_REQUIRED",
]);
const ACTION_DENIALS = new Set(["DO_NOT_ANSWER"]);
const ACTION_RETRIES = new Set([
  "RETRY_SAME_QUERY",
  "RETRY_WITH_EXPANDED_QUERY",
  "RETRY_WITH_RECENCY_BIAS",
  "RETRY_WITH_SCHEMA_FILTER",
  "RUN_EVALUATOR",
]);
const ACTION_CLARIFICATIONS = new Set([
  "ASK_CLARIFYING_QUESTION",
  "ESCALATE_TO_USER",
]);
const ALLOW_POLICIES = new Set([
  "ALLOW_ANSWER",
  "ALLOW_WITH_CAVEAT",
  "ANSWER_WITH_CITATIONS",
]);
const ALLOW_STATUSES = new Set(["OK", "NO_RESULTS", "SUFFICIENT_CONTEXT"]);
const ALLOW_ACTIONS = new Set([
  "",
  "ANSWER",
  "ANSWER_WITH_CAVEAT",
  "ANSWER_WITH_CITATIONS",
  "USE_CONTEXT",
]);
const LITE_POLICY_VERSION = "bifrost-lite-context/v1";

export const extractGrayMatterReceiptMetadata = (
  response: unknown,
): GrayMatterReceiptMetadata | undefined => {
  if (!isRecord(response)) {
    return undefined;
  }
  const receipt = isRecord(response.receipt)
    ? response.receipt
    : getString(response, "receiptId")
      ? response
      : undefined;
  const policy = extractGrayMatterPolicy(response, receipt);
  if (!receipt && !policy) {
    return undefined;
  }

  const quality = isRecord(receipt?.quality) ? receipt?.quality : undefined;
  const coverage = isRecord(receipt?.coverage) ? receipt?.coverage : undefined;
  const records = [
    policy,
    isRecord(receipt?.graymatterPolicy) ? receipt.graymatterPolicy : undefined,
    receipt,
  ].filter((value): value is JsonRecord => Boolean(value));
  const lite = getString(receipt, "policyVersion") === LITE_POLICY_VERSION;
  const receiptIds = records
    .map((record) => getString(record, "receiptId"))
    .filter(Boolean);
  const traceIds = records
    .map((record) => getString(record, "traceId"))
    .filter(Boolean);
  const metadata: GrayMatterReceiptMetadata = {
    format: lite ? "lite" : "hosted",
    liteProvenanceValid: lite ? validLiteProvenance(receipt) : undefined,
    identityMismatch:
      new Set(receiptIds).size > 1 || new Set(traceIds).size > 1,
    malformedPolicy: records.some(
      (record) =>
        ["answerAllowed", "caveatRequired"].some(
          (key) => record[key] != null && typeof record[key] !== "boolean",
        ) ||
        [
          "answerPolicy",
          "retrievalStatus",
          "recommendedAction",
          "disposition",
          "receiptId",
          "traceId",
          "warning",
        ].some(
          (key) => record[key] != null && typeof record[key] !== "string",
        ) ||
        (record.requiredActions != null &&
          (!Array.isArray(record.requiredActions) ||
            record.requiredActions.some((value) => typeof value !== "string"))),
    ),
    answerAllowed: records.some(
      (record) => getBoolean(record, "answerAllowed") === false,
    )
      ? false
      : (getBoolean(policy, "answerAllowed") ??
        getBoolean(receipt, "answerAllowed")),
    answerPolicy: guardedSignal(records, "answerPolicy", ALLOW_POLICIES),
    caveatRequired:
      getBoolean(policy, "caveatRequired") ??
      getBoolean(receipt, "caveatRequired"),
    confidence:
      getNumber(policy, "confidence") ?? getNumber(quality, "overallScore"),
    contradictionScore:
      getNumber(policy, "contradictionScore") ??
      getNumber(quality, "contradictionScore"),
    coverageStatus:
      getString(policy, "coverageStatus") ??
      getString(coverage, "coverageStatus"),
    disposition:
      records
        .map((record) => getString(record, "disposition"))
        .find((value) =>
          [
            "DENY",
            "DENIED",
            "DO_NOT_ANSWER",
            "DO_NOT_ANSWER_FROM_MEMORY",
            "CLARIFY",
            "REQUIRE_CLARIFICATION",
            "RETRY",
            "REQUIRE_RETRY",
          ].includes(normalize(value)),
        ) ?? getString(policy, "disposition"),
    freshnessScore:
      getNumber(policy, "freshnessScore") ??
      getNumber(quality, "freshnessScore"),
    receiptId:
      getString(policy, "receiptId") ?? getString(receipt, "receiptId"),
    recommendedAction: guardedSignal(
      records,
      "recommendedAction",
      ALLOW_ACTIONS,
    ),
    retrievalStatus:
      lite && Array.isArray(receipt?.staleRefs) && receipt.staleRefs.length
        ? "STALE_CONTEXT"
        : lite &&
            Array.isArray(receipt?.omittedRefs) &&
            receipt.omittedRefs.length
          ? "PARTIAL_COVERAGE"
          : guardedSignal(records, "retrievalStatus", ALLOW_STATUSES),
    requiredActions: getStringArray(policy, "requiredActions"),
    // Lite v1 exposes the contextPageRef as its compiler correlation reference,
    // rather than a separate hosted traceId. Only the verified Lite contract can
    // use it; missing hosted trace IDs never inherit a receipt ID.
    traceId:
      getString(policy, "traceId") ??
      getString(receipt, "traceId") ??
      (lite && validLiteProvenance(receipt)
        ? getString(receipt, "contextPageRef")
        : undefined),
    warning:
      getString(policy, "warning") ??
      (lite && receipt?.semanticDegraded === true
        ? "local_semantic_search_degraded_to_authorized_keyword_search"
        : undefined),
  };

  return Object.values(metadata).some((value) => value !== undefined)
    ? metadata
    : undefined;
};

export const evaluateGrayMatterReceiptPolicy = (
  metadata?: GrayMatterReceiptMetadata,
): GrayMatterReceiptPolicyOutcome => {
  if (!metadata) {
    return outcome("unavailable", false, metadata, "receipt_metadata_missing");
  }
  if (metadata.identityMismatch) {
    return outcome("conflicting", false, metadata, "receipt_identity_mismatch");
  }
  if (metadata.malformedPolicy) {
    return outcome(
      "unavailable",
      false,
      metadata,
      "receipt_policy_fields_malformed",
    );
  }
  if (metadata.format === "lite" && !metadata.liteProvenanceValid) {
    return outcome(
      "unavailable",
      false,
      metadata,
      "lite_receipt_provenance_invalid",
    );
  }
  if (!metadata.receiptId || !metadata.traceId) {
    return outcome(
      "unavailable",
      false,
      metadata,
      [
        !metadata.receiptId ? "receipt_id_missing" : undefined,
        !metadata.traceId ? "trace_id_missing" : undefined,
      ]
        .filter(Boolean)
        .join(","),
    );
  }

  const disposition = normalize(metadata.disposition);
  const answerPolicy = normalize(metadata.answerPolicy);
  const retrievalStatus = normalize(metadata.retrievalStatus);
  const recommendedAction = normalize(metadata.recommendedAction);

  if (
    metadata.answerAllowed === false ||
    POLICY_DENIALS.has(answerPolicy) ||
    STATUS_DENIALS.has(retrievalStatus) ||
    ACTION_DENIALS.has(recommendedAction) ||
    ["DENY", "DENIED", "DO_NOT_ANSWER", "DO_NOT_ANSWER_FROM_MEMORY"].includes(
      disposition,
    )
  ) {
    return outcome("denied", false, metadata);
  }
  if (
    POLICY_CLARIFICATIONS.has(answerPolicy) ||
    ACTION_CLARIFICATIONS.has(recommendedAction) ||
    ["CLARIFY", "REQUIRE_CLARIFICATION"].includes(disposition)
  ) {
    return outcome("clarification_required", false, metadata);
  }
  if (retrievalStatus === "CONFLICTING_CONTEXT") {
    return outcome("conflicting", false, metadata);
  }
  if (retrievalStatus === "STALE_CONTEXT") {
    return outcome("stale", false, metadata);
  }
  if (retrievalStatus === "PARTIAL_COVERAGE") {
    return outcome("partial", false, metadata);
  }
  if (
    ["INSUFFICIENT_CREDITS", "QUOTA_EXHAUSTED"].includes(retrievalStatus) ||
    ["BUY_CREDITS", "RECHARGE"].includes(recommendedAction)
  ) {
    return outcome("quota", false, metadata);
  }
  if (
    POLICY_RETRIES.has(answerPolicy) ||
    STATUS_RETRIES.has(retrievalStatus) ||
    ACTION_RETRIES.has(recommendedAction) ||
    ["RETRY", "REQUIRE_RETRY"].includes(disposition)
  ) {
    return outcome("retry_required", false, metadata);
  }
  if (["ERROR", "UNAVAILABLE"].includes(retrievalStatus)) {
    return outcome("unavailable", false, metadata);
  }
  const allowed =
    ALLOW_POLICIES.has(answerPolicy) &&
    ALLOW_STATUSES.has(retrievalStatus) &&
    ALLOW_ACTIONS.has(recommendedAction) &&
    (answerPolicy !== "ANSWER_WITH_CITATIONS" || metadata.format === "lite");
  if (!allowed) {
    return outcome(
      "unavailable",
      false,
      metadata,
      "receipt_policy_incomplete_or_unknown",
    );
  }
  if (
    metadata.caveatRequired === true ||
    answerPolicy === "ALLOW_WITH_CAVEAT" ||
    recommendedAction === "ANSWER_WITH_CAVEAT" ||
    Boolean(metadata.warning)
  ) {
    return outcome("allowed_with_caveat", true, metadata);
  }
  return outcome("allowed", true, metadata);
};

export const redactGrayMatterPromptText = (value: string): string =>
  value
    .replace(
      /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/giu,
      "[REDACTED_PRIVATE_KEY]",
    )
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,;]+/giu, "$1[REDACTED]")
    .replace(/\b(bearer\s+)[^\s,;]+/giu, "$1[REDACTED]")
    .replace(
      /\b[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/gu,
      "[REDACTED_JWT]",
    )
    .replace(/\b(?:sk|rk)-[A-Za-z0-9_-]{20,}\b/gu, "[REDACTED_API_KEY]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/gu, "[REDACTED_GITHUB_TOKEN]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/gu, "[REDACTED_AWS_ACCESS_KEY]")
    .replace(
      /\b(password|passwd|pwd|client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)\s*([:=])\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/giu,
      "$1$2[REDACTED]",
    );

const outcome = (
  state: GrayMatterReceiptPolicyState,
  allowsContext: boolean,
  metadata?: GrayMatterReceiptMetadata,
  reason?: string,
): GrayMatterReceiptPolicyOutcome => ({
  allowsContext,
  metadata,
  state,
  warning: formatGrayMatterReceiptWarning(metadata, state, reason),
});

const formatGrayMatterReceiptWarning = (
  metadata: GrayMatterReceiptMetadata | undefined,
  state: GrayMatterReceiptPolicyState,
  reason?: string,
): string =>
  [
    `policyState=${state}`,
    metadata?.receiptId ? `receiptId=${metadata.receiptId}` : undefined,
    metadata?.traceId ? `traceId=${metadata.traceId}` : undefined,
    metadata?.answerPolicy
      ? `answerPolicy=${metadata.answerPolicy}`
      : undefined,
    metadata?.retrievalStatus
      ? `retrievalStatus=${metadata.retrievalStatus}`
      : undefined,
    metadata?.recommendedAction
      ? `recommendedAction=${metadata.recommendedAction}`
      : undefined,
    metadata?.coverageStatus
      ? `coverageStatus=${metadata.coverageStatus}`
      : undefined,
    metadata?.confidence !== undefined
      ? `confidence=${boundedScore(metadata.confidence)}`
      : undefined,
    metadata?.freshnessScore !== undefined
      ? `freshnessScore=${boundedScore(metadata.freshnessScore)}`
      : undefined,
    metadata?.contradictionScore !== undefined
      ? `contradictionScore=${boundedScore(metadata.contradictionScore)}`
      : undefined,
    metadata?.answerAllowed !== undefined
      ? `answerAllowed=${metadata.answerAllowed}`
      : undefined,
    metadata?.caveatRequired !== undefined
      ? `caveatRequired=${metadata.caveatRequired}`
      : undefined,
    metadata?.disposition ? `disposition=${metadata.disposition}` : undefined,
    metadata?.requiredActions?.length
      ? `requiredActions=${metadata.requiredActions.join(",")}`
      : undefined,
    reason ? `reason=${reason}` : undefined,
    metadata?.warning
      ? `warning=${redactGrayMatterPromptText(metadata.warning)}`
      : undefined,
  ]
    .filter(Boolean)
    .map((value) => redactGrayMatterPromptText(String(value)))
    .join(" ");

const guardedSignal = (
  records: JsonRecord[],
  key: string,
  allowed: Set<string>,
) => {
  const values = records
    .map((record) => getString(record, key))
    .filter((value): value is string => Boolean(value));
  // A positive wrapper policy must never override a denied or unknown receipt.
  return values.find((value) => !allowed.has(normalize(value))) ?? values[0];
};

const validLiteProvenance = (receipt?: JsonRecord) => {
  if (!receipt) return false;
  const id = getString(receipt, "receiptId");
  return Boolean(
    id &&
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(id) &&
      getString(receipt, "contextPageRef") === id &&
      /^[a-f0-9]{64}$/iu.test(getString(receipt, "contextHash") ?? "") &&
      Array.isArray(receipt.staleRefs) &&
      Array.isArray(receipt.omittedRefs),
  );
};

const extractGrayMatterPolicy = (
  response: JsonRecord,
  receipt?: JsonRecord,
): JsonRecord | undefined => {
  if (isRecord(response.graymatterPolicy)) {
    return response.graymatterPolicy;
  }
  return isRecord(receipt?.graymatterPolicy)
    ? receipt?.graymatterPolicy
    : undefined;
};

const getString = (record: JsonRecord | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getBoolean = (record: JsonRecord | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const getNumber = (record: JsonRecord | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const getStringArray = (record: JsonRecord | undefined, key: string) => {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return strings.length ? strings : undefined;
};

const normalize = (value?: string) => value?.trim().toUpperCase() ?? "";

const boundedScore = (value: number) =>
  Math.max(0, Math.min(1, value)).toFixed(4);

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
