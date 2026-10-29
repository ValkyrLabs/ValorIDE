/** Request-scoped generation contract; omission preserves the backend's existing policy. */
export type McpPublicationMode = "inherit" | "suppress";

export type McpPublicationDisposition =
  | "SUPPRESSED"
  | "GLOBAL_DISABLED"
  | "PUBLISHER_UNAVAILABLE"
  | "NO_APPLICATION"
  | "PUBLISHED"
  | "PUBLISH_FAILED"
  | "UNKNOWN";

/** Server-observed receipt values, never inferred from generated files. */
export interface McpPublicationObservation {
  mcpPublicationMode: McpPublicationMode;
  mcpPublicationDisposition: McpPublicationDisposition;
}
