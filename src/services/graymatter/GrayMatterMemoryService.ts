import {
  GrayMatterClientError,
  GrayMatterMemoryInput,
  GrayMatterMemoryWriteErrorKind,
  GrayMatterMemoryWriteUnverifiedError,
  requireVerifiedMemoryWrite,
} from "./GrayMatterClient";

export type GrayMatterWriteStatus =
  | "failed"
  | "queued"
  | "written"
  | "unverified";

export interface PendingGrayMatterWrite extends GrayMatterMemoryInput {
  attempts?: number;
  idempotencyKey: string;
  lastError?: string;
  lastErrorKind?: GrayMatterMemoryWriteErrorKind;
  lastTriedAt?: string;
  queuedAt: string;
  phase?: "verification_required";
  memoryId?: string;
}

export interface GrayMatterMemoryWriteResult {
  error?: string;
  errorKind?: GrayMatterMemoryWriteErrorKind;
  memoryId?: string;
  status: GrayMatterWriteStatus;
  type: GrayMatterMemoryInput["type"];
}

export interface GrayMatterTranscriptWrite {
  at: string;
  error?: string;
  id?: string;
  status: GrayMatterWriteStatus;
  tags?: string[];
  type: GrayMatterMemoryInput["type"];
}

export interface GrayMatterTranscriptSummary {
  pendingWrites: number;
  reads: unknown[];
  writes: GrayMatterTranscriptWrite[];
}

export interface GrayMatterMemoryServiceOptions {
  loadPendingWrites?: () => Promise<PendingGrayMatterWrite[] | undefined>;
  now?: () => Date;
  savePendingWrites?: (writes: PendingGrayMatterWrite[]) => Promise<void>;
  writeMemory: (input: GrayMatterMemoryInput) => Promise<unknown>;
}

export class GrayMatterMemoryService {
  private readonly now: () => Date;
  private readonly pendingWrites: PendingGrayMatterWrite[] = [];
  private readonly ready: Promise<void>;
  private readonly writes: GrayMatterTranscriptWrite[] = [];

  constructor(private readonly options: GrayMatterMemoryServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.ready = this.loadPendingWrites();
  }

  private async loadPendingWrites(): Promise<void> {
    const loaded = await this.options.loadPendingWrites?.();
    if (!loaded?.length) {
      return;
    }
    this.pendingWrites.push(...loaded.map(sanitizePendingWrite));
  }

  private async persistPendingWrites(): Promise<void> {
    if (!this.options.savePendingWrites) {
      return;
    }
    await this.options.savePendingWrites(this.getPendingWrites());
  }

  async writeMemory(
    input: GrayMatterMemoryInput,
  ): Promise<GrayMatterMemoryWriteResult> {
    await this.ready;
    const at = this.now().toISOString();

    try {
      const response = await this.options.writeMemory(input);
      const memoryId = requireVerifiedMemoryWrite(response, input).id;
      this.writes.push({
        at,
        id: memoryId,
        status: "written",
        tags: input.tags,
        type: input.type,
      });
      return {
        memoryId,
        status: "written",
        type: input.type,
      };
    } catch (error) {
      const clientError =
        error instanceof GrayMatterClientError ||
        error instanceof GrayMatterMemoryWriteUnverifiedError
          ? error
          : undefined;
      const message =
        error instanceof Error ? error.message : "GrayMatter write failed.";
      const shouldQueue = isRetryableKind(clientError?.kind);
      const unverified = clientError?.kind === "unverified";
      const memoryId =
        error instanceof GrayMatterMemoryWriteUnverifiedError
          ? error.memoryId
          : undefined;
      const status: GrayMatterWriteStatus = unverified
        ? "unverified"
        : shouldQueue
          ? "queued"
          : "failed";

      if (shouldQueue || unverified) {
        this.pendingWrites.push(
          sanitizePendingWrite({
            ...input,
            attempts: 0,
            idempotencyKey: createIdempotencyKey(input, at),
            queuedAt: at,
            ...(unverified
              ? {
                  phase: "verification_required" as const,
                  memoryId,
                  lastErrorKind: "unverified" as const,
                }
              : {}),
          }),
        );
        await this.persistPendingWrites();
      }

      this.writes.push({
        at,
        ...(memoryId ? { id: memoryId } : {}),
        error: message,
        status,
        tags: input.tags,
        type: input.type,
      });

      return {
        error: message,
        errorKind: clientError?.kind ?? "unavailable",
        ...(memoryId ? { memoryId } : {}),
        status,
        type: input.type,
      };
    }
  }

  getPendingWrites(): PendingGrayMatterWrite[] {
    return this.pendingWrites.map((write) => ({
      ...write,
      metadata: write.metadata ? { ...write.metadata } : undefined,
      tags: write.tags ? [...write.tags] : undefined,
    }));
  }

  async replayPendingWrites(): Promise<void> {
    await this.ready;
    const snapshot = [...this.pendingWrites];
    this.pendingWrites.length = 0;

    for (const write of snapshot) {
      if (
        write.phase === "verification_required" ||
        write.lastErrorKind === "unverified"
      ) {
        this.pendingWrites.push(write);
        continue;
      }
      const replayInput: GrayMatterMemoryInput = {
        content: write.content,
        metadata: write.metadata,
        tags: write.tags,
        type: write.type,
      };
      const at = this.now().toISOString();

      try {
        const response = await this.options.writeMemory(replayInput);
        const receipt = requireVerifiedMemoryWrite(response, replayInput);
        this.writes.push({
          at,
          id: receipt.id,
          status: "written",
          tags: write.tags,
          type: write.type,
        });
      } catch (error) {
        const clientError =
          error instanceof GrayMatterClientError ||
          error instanceof GrayMatterMemoryWriteUnverifiedError
            ? error
            : undefined;
        const message =
          error instanceof Error ? error.message : "GrayMatter write failed.";
        const shouldQueue = isRetryableKind(clientError?.kind);
        const unverified = clientError?.kind === "unverified";
        const memoryId =
          error instanceof GrayMatterMemoryWriteUnverifiedError
            ? error.memoryId
            : undefined;

        this.writes.push({
          at,
          error: message,
          ...(memoryId ? { id: memoryId } : {}),
          status: unverified ? "unverified" : shouldQueue ? "queued" : "failed",
          tags: write.tags,
          type: write.type,
        });

        if (shouldQueue || unverified) {
          this.pendingWrites.push(
            sanitizePendingWrite({
              ...write,
              attempts: (write.attempts ?? 0) + 1,
              lastError: message,
              lastErrorKind: clientError?.kind ?? "unavailable",
              lastTriedAt: at,
              ...(unverified
                ? { phase: "verification_required" as const, memoryId }
                : {}),
            }),
          );
        }
      }
    }

    await this.persistPendingWrites();
  }

  getTranscriptSummary(): GrayMatterTranscriptSummary {
    return {
      pendingWrites: this.pendingWrites.length,
      reads: [],
      writes: this.writes.map((write) => ({
        ...write,
        tags: write.tags ? [...write.tags] : undefined,
      })),
    };
  }
}

const SENSITIVE_METADATA_KEY =
  /(secret|token|password|api[-_]?key|authorization)/iu;

const sanitizePendingWrite = (
  write: PendingGrayMatterWrite,
): PendingGrayMatterWrite => ({
  ...write,
  metadata: sanitizeMetadata(write.metadata),
});

const sanitizeMetadata = (
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEY.test(key)) {
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
};

const isRetryableKind = (kind?: GrayMatterMemoryWriteErrorKind) =>
  kind === "unavailable" || kind === "quota" || kind === "unauthenticated";

const createIdempotencyKey = (input: GrayMatterMemoryInput, at: string) =>
  `${input.type}:${at}:${input.content.slice(0, 48)}`;
