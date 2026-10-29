import type { ToolUseName } from "@core/assistant-message";

const WORKSPACE_MUTATING_TOOLS = new Set<ToolUseName>([
  "execute_command",
  "precision_search_and_replace",
  "replace_in_file",
  "use_mcp_tool",
  "write_to_file",
]);
const STREAMING_WORKSPACE_MUTATING_TOOLS = new Set<ToolUseName>([
  "precision_search_and_replace",
  "replace_in_file",
  "write_to_file",
]);

export const mutatesWorkspaceDuringStreaming = (toolName: ToolUseName) =>
  STREAMING_WORKSPACE_MUTATING_TOOLS.has(toolName);

export const requiresInitialCheckpointBarrier = (
  toolName: ToolUseName,
  force = false,
) => force || WORKSPACE_MUTATING_TOOLS.has(toolName);

/**
 * Starts the initial workspace snapshot without delaying the first model token,
 * while retaining the safety barrier before any workspace-mutating tool runs.
 */
export class InitialCheckpointCoordinator {
  private capturePromise?: Promise<void>;
  private captureError?: Error;

  constructor(
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {}

  start(capture: () => Promise<void>): void {
    if (this.capturePromise) {
      return;
    }

    this.capturePromise = Promise.resolve()
      .then(capture)
      .catch((error) => {
        this.captureError = error instanceof Error ? error : new Error(String(error));
        this.onError(error);
      });
  }

  async beforeTool(toolName: ToolUseName, force = false): Promise<void> {
    if (!requiresInitialCheckpointBarrier(toolName, force)) {
      return;
    }
    await this.onIdle();
  }

  async onIdle(): Promise<void> {
    await this.capturePromise;
    if (this.captureError) throw this.captureError;
  }
}
