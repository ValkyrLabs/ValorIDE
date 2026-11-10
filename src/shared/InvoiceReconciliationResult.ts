export const reconciliationContract = "invoice-customer-reconciliation/v1";
export const reconciliationCorrectness = {
  "matches-fixture": "Matches the saved fixture",
  "differs-from-fixture": "Differs from the saved fixture",
  unverified: "No verified fixture comparison",
} as const;

export function isReconciliationCorrectness(
  value: unknown,
): value is keyof typeof reconciliationCorrectness {
  return (
    typeof value === "string" && Object.hasOwn(reconciliationCorrectness, value)
  );
}

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const keys = [
  "customerCount",
  "invoiceCount",
  "matchedCount",
  "snapshotRef",
  "unmatchedCount",
  "unmatchedInvoiceIds",
] as const;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 128;

/** Return the bounded canonical form used by the private receipt checksum. */
export function readInvoiceReconciliation(r: unknown) {
  if (
    !object(r) ||
    Object.keys(r).sort().join(",") !== keys.join(",") ||
    !count(r.customerCount) ||
    !count(r.invoiceCount) ||
    !count(r.matchedCount) ||
    !count(r.unmatchedCount) ||
    r.matchedCount + r.unmatchedCount !== r.invoiceCount ||
    typeof r.snapshotRef !== "string" ||
    !/^sha256:[0-9a-f]{64}$/.test(r.snapshotRef) ||
    !Array.isArray(r.unmatchedInvoiceIds) ||
    r.unmatchedInvoiceIds.length !== r.unmatchedCount ||
    !r.unmatchedInvoiceIds.every(
      (id): id is string => typeof id === "string" && uuid.test(id),
    ) ||
    new Set(r.unmatchedInvoiceIds.map((id) => id.toLowerCase())).size !==
      r.unmatchedCount
  )
    return undefined;
  return {
    customerCount: r.customerCount,
    invoiceCount: r.invoiceCount,
    matchedCount: r.matchedCount,
    snapshotRef: r.snapshotRef,
    unmatchedCount: r.unmatchedCount,
    unmatchedInvoiceIds: [...r.unmatchedInvoiceIds],
  };
}
