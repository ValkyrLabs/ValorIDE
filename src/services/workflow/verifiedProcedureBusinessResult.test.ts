import { expect, it } from "@jest/globals";
import { createHash } from "node:crypto";
import { verifiedProcedureBusinessResult } from "./verifiedProcedureBusinessResult";
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const result = {
  customerCount: 1,
  invoiceCount: 1,
  matchedCount: 0,
  snapshotRef: "sha256:" + "c".repeat(64),
  unmatchedCount: 1,
  unmatchedInvoiceIds: ["8afff6d2-080b-4afa-aa5d-caee612d4459"],
};
const raw = {
  status: "available",
  executionId: "exact",
  workflowVersionId: "frozen",
  definitionSnapshotHash: "a".repeat(64),
  contractId: "invoice-customer-reconciliation/v1",
  contractHash: digest({
    contract: "invoice-customer-reconciliation/v1",
    field: "reconciliationReport",
  }),
  correctness: "unverified",
  resultChecksum: digest(result),
  result,
};
const verify = (value: unknown) =>
  verifiedProcedureBusinessResult(value, "exact", "frozen", "a".repeat(64));
it("projects an exact checked reconciliation without unrelated transport data", () => {
  const received = verify({ ...raw, privateContext: "secret" });
  expect(received?.result).toEqual(result);
  expect(received?.correctness).toEqual("unverified");
  expect(JSON.stringify(received)).not.toContain("secret");
});
it.each([
  { executionId: "other" },
  { workflowVersionId: "other" },
  { definitionSnapshotHash: "b".repeat(64) },
  { contractHash: "b".repeat(64) },
  { resultChecksum: "b".repeat(64) },
  { status: "unavailable" },
  { result: { ...result, privateContext: "secret" } },
  { result: { ...result, unmatchedCount: 2 } },
])("rejects invalid receipt projection %o", (delta) =>
  expect(verify({ ...raw, ...delta })).toBeUndefined(),
);
