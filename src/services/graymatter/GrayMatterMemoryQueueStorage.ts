import type * as vscode from "vscode";
import { getGlobalState, updateGlobalState } from "@core/storage/state";
import type { GrayMatterClient } from "./GrayMatterClient";
import { GrayMatterMemoryService } from "./GrayMatterMemoryService";
import type { PendingGrayMatterWrite } from "./GrayMatterMemoryService";

const PENDING_WRITES_KEY = "grayMatterPendingWrites";

export const loadPendingGrayMatterWrites = async (
  context: vscode.ExtensionContext,
): Promise<PendingGrayMatterWrite[]> => {
  const stored = await getGlobalState(context, PENDING_WRITES_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .map(toPendingWrite)
    .filter((write): write is PendingGrayMatterWrite => Boolean(write));
};

export const savePendingGrayMatterWrites = async (
  context: vscode.ExtensionContext,
  writes: PendingGrayMatterWrite[],
): Promise<void> => {
  await updateGlobalState(
    context,
    PENDING_WRITES_KEY,
    writes.length ? writes.map(toStoredWrite) : undefined,
  );
};

export const createGrayMatterMemoryService = (
  context: vscode.ExtensionContext,
  client: Pick<GrayMatterClient, "writeMemory">,
): GrayMatterMemoryService =>
  new GrayMatterMemoryService({
    loadPendingWrites: () => loadPendingGrayMatterWrites(context),
    savePendingWrites: (writes) => savePendingGrayMatterWrites(context, writes),
    writeMemory: (input) => client.writeMemory(input),
  });

const toPendingWrite = (value: unknown): PendingGrayMatterWrite | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<PendingGrayMatterWrite>;
  if (
    typeof candidate.content !== "string" ||
    typeof candidate.idempotencyKey !== "string" ||
    typeof candidate.queuedAt !== "string" ||
    typeof candidate.type !== "string"
  ) {
    return undefined;
  }

  return {
    ...candidate,
    content: candidate.content,
    idempotencyKey: candidate.idempotencyKey,
    queuedAt: candidate.queuedAt,
    type: candidate.type,
  } as PendingGrayMatterWrite;
};

const toStoredWrite = (
  write: PendingGrayMatterWrite,
): PendingGrayMatterWrite => ({
  ...write,
  metadata: write.metadata ? { ...write.metadata } : undefined,
  tags: write.tags ? [...write.tags] : undefined,
});
