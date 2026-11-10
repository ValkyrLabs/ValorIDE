import {
  reconciliationContract,
  isReconciliationCorrectness,
  readInvoiceReconciliation,
} from "@shared/InvoiceReconciliationResult";
import { createHash } from "node:crypto";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const contractId = reconciliationContract;
const contractHash = sha256(
  JSON.stringify({ contract: contractId, field: "reconciliationReport" }),
);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Only expose the verified inline contract. Never return a status or context snapshot wholesale. */
export function verifiedProcedureBusinessResult(
  value: unknown,
  executionId: string,
  versionId: string,
  definitionHash: string,
) {
  if (
    !object(value) ||
    value.status !== "available" ||
    value.executionId !== executionId ||
    value.workflowVersionId !== versionId ||
    !/^[0-9a-f]{64}$/.test(definitionHash) ||
    value.definitionSnapshotHash !== definitionHash ||
    value.contractId !== contractId ||
    value.contractHash !== contractHash ||
    !isReconciliationCorrectness(value.correctness)
  )
    return undefined;
  const result = readInvoiceReconciliation(value.result);
  if (!result) return undefined;
  const resultChecksum = sha256(JSON.stringify(result));
  if (resultChecksum !== value.resultChecksum) return undefined;
  return {
    contractId,
    contractHash,
    resultChecksum,
    correctness: value.correctness,
    definitionSnapshotHash: definitionHash,
    result,
  };
}
