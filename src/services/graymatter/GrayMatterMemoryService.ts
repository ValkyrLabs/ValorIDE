import {
  GrayMatterClientError,
  GrayMatterErrorKind,
  GrayMatterMemoryInput,
} from "./GrayMatterClient";

export type GrayMatterWriteStatus = "failed" | "queued" | "written";

export interface PendingGrayMatterWrite extends GrayMatterMemoryInput {
  attempts?: number;
  idempotencyKey: string;
  lastError?: string;
  lastErrorKind?: GrayMatterErrorKind;
  lastTriedAt?: string;
  queuedAt: string;
}

export interface GrayMatterMemoryWriteResult {
  error?: string;
  errorKind?: GrayMatterErrorKind;
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
      const memoryId = getMemoryId(response);
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
        error instanceof GrayMatterClientError ? error : undefined;
      const message =
        error instanceof Error ? error.message : "GrayMatter write failed.";
      const shouldQueue = isRetryableKind(clientError?.kind);
      const status: GrayMatterWriteStatus = shouldQueue ? "queued" : "failed";

      if (shouldQueue) {
        this.pendingWrites.push(sanitizePendingWrite({
          ...input,
          attempts: 0,
          idempotencyKey: createIdempotencyKey(input, at),
          queuedAt: at,
        }));
        await this.persistPendingWrites();
      }

      this.writes.push({
        at,
        error: message,
        status,
        tags: input.tags,
        type: input.type,
      });

      return {
        error: message,
        errorKind: clientError?.kind ?? "unavailable",
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
      const replayInput: GrayMatterMemoryInput = {
        content: write.content,
        metadata: write.metadata,
        tags: write.tags,
        type: write.type,
      };
      const at = this.now().toISOString();

      try {
        const response = await this.options.writeMemory(replayInput);
        this.writes.push({
          at,
          id: getMemoryId(response),
          status: "written",
          tags: write.tags,
          type: write.type,
        });
      } catch (error) {
        const clientError =
          error instanceof GrayMatterClientError ? error : undefined;
        const message =
          error instanceof Error ? error.message : "GrayMatter write failed.";
        const shouldQueue = isRetryableKind(clientError?.kind);

        this.writes.push({
          at,
          error: message,
          status: shouldQueue ? "queued" : "failed",
          tags: write.tags,
          type: write.type,
        });

        if (shouldQueue) {
          this.pendingWrites.push(
            sanitizePendingWrite({
              ...write,
              attempts: (write.attempts ?? 0) + 1,
              lastError: message,
              lastErrorKind: clientError?.kind ?? "unavailable",
              lastTriedAt: at,
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

const SENSITIVE_METADATA_KEY = /(secret|token|password|api[-_]?key|authorization)/iu;

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

const isRetryableKind = (kind?: GrayMatterErrorKind) =>
  kind === "unavailable" || kind === "quota" || kind === "unauthenticated";

const createIdempotencyKey = (input: GrayMatterMemoryInput, at: string) =>
  `${input.type}:${at}:${input.content.slice(0, 48)}`;

const getMemoryId = (response: unknown): string | undefined => {
  if (!response || typeof response !== "object") {
    return undefined;
  }
  const candidate = (response as { id?: unknown }).id;
  return typeof candidate === "string" ? candidate : undefined;
};
