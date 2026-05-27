import crypto from "crypto";
import * as vscode from "vscode";
import {
  GrayMatterMemoryInput,
  GrayMatterMemoryQuery,
  GrayMatterMemoryType,
} from "./GrayMatterClient";
import { GrayMatterMemoryScope } from "./GrayMatterContextProvider";

export type GrayMatterAutoCaptureMode = "all" | "decisions" | "off";

export type CaptureEvent =
  | { kind: "decision"; content: string; scope?: GrayMatterMemoryScope }
  | { kind: "preference"; content: string; scope?: GrayMatterMemoryScope }
  | { kind: "artifact"; content: string; scope?: GrayMatterMemoryScope }
  | { kind: "context"; content: string; scope?: GrayMatterMemoryScope }
  | { kind: "user_explicit"; content: string; scope: GrayMatterMemoryScope };

export interface GrayMatterWritableMemoryService {
  writeMemory: (input: GrayMatterMemoryInput) => Promise<unknown>;
}

export interface GrayMatterCaptureServiceOptions {
  memory: GrayMatterWritableMemoryService;
  queryMemory?: (query: GrayMatterMemoryQuery) => Promise<unknown>;
  logger?: Pick<vscode.OutputChannel, "appendLine">;
  now?: () => Date;
  orgId?: string;
  projectRoot?: string;
  valorIdeVersion?: string;
}

export class GrayMatterCaptureService {
  private readonly now: () => Date;

  constructor(private readonly options: GrayMatterCaptureServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async capture(event: CaptureEvent): Promise<void> {
    if (!event.content.trim()) {
      return;
    }

    const scope = event.scope ?? getDefaultWriteScope();
    const type = getMemoryType(event);
    const tags = buildScopeTags(
      scope,
      this.options.projectRoot,
      this.options.orgId,
    );
    const content = event.content.trim();

    if (await this.hasNearDuplicate(content)) {
      this.options.logger?.appendLine(
        "[GrayMatterCaptureService] Skipped near-duplicate memory.",
      );
      return;
    }

    await this.options.memory.writeMemory({
      content,
      metadata: {
        captureSource: event.kind === "user_explicit" ? "explicit" : "auto",
        capturedAt: this.now().toISOString(),
        projectRoot: this.options.projectRoot
          ? hashWorkspaceRoot(this.options.projectRoot)
          : undefined,
        valorIdeVersion: this.options.valorIdeVersion,
      },
      tags,
      type,
    });
  }

  async maybeCapture(agentMessage: string): Promise<void> {
    const mode = getAutoCaptureMode();
    if (mode === "off") {
      return;
    }

    const explicit = extractExplicitMemory(agentMessage);
    if (explicit) {
      await this.capture({
        kind: "user_explicit",
        content: explicit.content,
        scope: explicit.scope,
      });
      return;
    }

    const decision = extractDecision(agentMessage);
    if (decision) {
      await this.capture({
        kind: "decision",
        content: decision,
        scope: "project",
      });
      return;
    }

    if (mode !== "all") {
      return;
    }

    const preference = extractPreference(agentMessage);
    if (preference) {
      await this.capture({
        kind: "preference",
        content: preference,
        scope: "user",
      });
    }
  }

  private async hasNearDuplicate(content: string): Promise<boolean> {
    if (!this.options.queryMemory) {
      return false;
    }

    try {
      const response = await this.options.queryMemory({
        limit: 3,
        query: content,
      });
      return extractSimilarityScores(response).some((score) => score > 0.9);
    } catch (error) {
      this.options.logger?.appendLine(
        `[GrayMatterCaptureService] Deduplication query failed: ${String(error)}`,
      );
      return false;
    }
  }
}

const getMemoryType = (event: CaptureEvent): GrayMatterMemoryType => {
  if (event.kind === "user_explicit") {
    return "preference";
  }
  return event.kind;
};

const getDefaultWriteScope = (): GrayMatterMemoryScope =>
  vscode.workspace
    .getConfiguration("valoride.graymatter")
    .get<GrayMatterMemoryScope>("defaultWriteScope", "project");

const getAutoCaptureMode = (): GrayMatterAutoCaptureMode =>
  vscode.workspace
    .getConfiguration("valoride.graymatter")
    .get<GrayMatterAutoCaptureMode>("autoCapture", "decisions");

const buildScopeTags = (
  scope: GrayMatterMemoryScope,
  projectRoot?: string,
  orgId?: string,
) => {
  const tags = [`scope:${scope}`];
  if (scope === "project" && projectRoot) {
    tags.push(`project:${hashWorkspaceRoot(projectRoot)}`);
  }
  if (scope === "organization" && orgId) {
    tags.push(`org:${orgId}`);
  }
  return tags;
};

const hashWorkspaceRoot = (projectRoot: string) =>
  crypto.createHash("sha256").update(projectRoot).digest("hex").slice(0, 16);

const extractExplicitMemory = (message: string) => {
  const match = message.match(
    /remember this(?:\s+as\s+(user|project|organization|org))?\s*:\s*([\s\S]+)/iu,
  );
  if (!match?.[2]) {
    return undefined;
  }
  const rawScope = match[1]?.toLowerCase();
  const scope: GrayMatterMemoryScope =
    rawScope === "org" || rawScope === "organization"
      ? "organization"
      : rawScope === "project"
        ? "project"
        : "user";
  return {
    content: match[2].trim(),
    scope,
  };
};

const extractDecision = (message: string) => {
  const patterns = [
    /\b(?:decision|decided|we will|we should|standardize on|use|prefer|never use)\b[^.?!]*(?:[.?!]|$)/iu,
    /\b(?:architecture decision|project convention|team standard)\b[^.?!]*(?:[.?!]|$)/iu,
  ];
  return extractFirstMatch(message, patterns);
};

const extractPreference = (message: string) => {
  const patterns = [
    /\b(?:always|prefer|default to|do not|don't)\b[^.?!]*(?:[.?!]|$)/iu,
    /\b(?:my preference|user preference|response style)\b[^.?!]*(?:[.?!]|$)/iu,
  ];
  return extractFirstMatch(message, patterns);
};

const extractFirstMatch = (message: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[0] && match[0].trim().length >= 20) {
      return match[0].trim();
    }
  }
  return undefined;
};

const extractSimilarityScores = (response: unknown): number[] => {
  const entries = Array.isArray(response)
    ? response
    : response && typeof response === "object"
      ? ((response as Record<string, unknown>).results as unknown[])
      : [];
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }
      const record = entry as Record<string, unknown>;
      const score =
        record.score ?? record.similarity ?? record.cosineSimilarity;
      return typeof score === "number" ? score : undefined;
    })
    .filter((score): score is number => typeof score === "number");
};
