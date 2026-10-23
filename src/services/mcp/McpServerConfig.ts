import { z } from "zod";
import {
  DEFAULT_MCP_TIMEOUT_SECONDS,
  MIN_MCP_TIMEOUT_SECONDS,
} from "@shared/mcp";

const AutoApproveSchema = z.array(z.string()).default([]);

export const BaseConfigSchema = z.object({
  autoApprove: AutoApproveSchema.optional(),
  disabled: z.boolean().optional(),
  timeout: z
    .number()
    .min(MIN_MCP_TIMEOUT_SECONDS)
    .optional()
    .default(DEFAULT_MCP_TIMEOUT_SECONDS),
});

export const SseConfigSchema = BaseConfigSchema.extend({
  url: z.string().url(),
}).transform((config) => ({
  ...config,
  transportType: "sse" as const,
}));

export const StdioConfigSchema = BaseConfigSchema.extend({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
}).transform((config) => ({
  ...config,
  transportType: "stdio" as const,
}));

export const ServerConfigSchema = z.union([StdioConfigSchema, SseConfigSchema]);

export const McpSettingsSchema = z.object({
  mcpServers: z.record(ServerConfigSchema),
});

export type McpServerConfig = z.infer<typeof ServerConfigSchema>;

export interface ParsedMcpServerConfigs {
  invalidServers: Array<{ error: string; name: string }>;
  migratedFileConfigs: Record<string, unknown>;
  migratedServers: string[];
  servers: Record<string, McpServerConfig>;
}

/**
 * Parse MCP entries independently so one obsolete or malformed install cannot
 * take the entire MCP hub (including GrayMatter) offline. Older marketplace
 * records used `baseUrl`; migrate those remote transports to the canonical
 * `url` field without discarding their descriptive metadata.
 */
export const parseMcpServerConfigs = (
  rawServers: unknown,
): ParsedMcpServerConfigs => {
  const entries =
    rawServers && typeof rawServers === "object" && !Array.isArray(rawServers)
      ? Object.entries(rawServers as Record<string, unknown>)
      : [];
  const result: ParsedMcpServerConfigs = {
    invalidServers: [],
    migratedFileConfigs: {},
    migratedServers: [],
    servers: {},
  };

  for (const [name, value] of entries) {
    let candidate = value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (
        typeof record.command !== "string" &&
        typeof record.url !== "string" &&
        typeof record.baseUrl === "string"
      ) {
        candidate = { ...record, url: record.baseUrl };
        result.migratedServers.push(name);
      }
    }

    result.migratedFileConfigs[name] = candidate;
    const parsed = ServerConfigSchema.safeParse(candidate);
    if (parsed.success) {
      result.servers[name] = parsed.data;
      continue;
    }
    result.invalidServers.push({
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
      name,
    });
  }

  return result;
};
