import {
  GrayMatterClientError,
  GrayMatterErrorKind,
  GrayMatterMemoryInput,
} from "./GrayMatterClient";

export type GrayMatterWriteStatus = "failed" | "queued" | "written";

export interface PendingGrayMatterWrite extends GrayMatterMemoryInput {
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
  now?: () => Date;
  writeMemory: (input: GrayMatterMemoryInput) => Promise<unknown>;
}

export class GrayMatterMemoryService {
  private readonly now: () => Date;
  private readonly pendingWrites: PendingGrayMatterWrite[] = [];
  private readonly writes: GrayMatterTranscriptWrite[] = [];

  constructor(private readonly options: GrayMatterMemoryServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async writeMemory(
    input: GrayMatterMemoryInput,
  ): Promise<GrayMatterMemoryWriteResult> {
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
      const shouldQueue = clientError?.kind === "unavailable";
      const status: GrayMatterWriteStatus = shouldQueue ? "queued" : "failed";

      if (shouldQueue) {
        this.pendingWrites.push({
          ...input,
          queuedAt: at,
        });
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

const getMemoryId = (response: unknown): string | undefined => {
  if (!response || typeof response !== "object") {
    return undefined;
  }
  const candidate = (response as { id?: unknown }).id;
  return typeof candidate === "string" ? candidate : undefined;
};
