export interface BuildModeAutomationMonitorDueResult {
  executedCount: number;
  receiptIds?: string[];
  skippedCount: number;
}

export interface BuildModeAutomationMonitorRunResult
  extends BuildModeAutomationMonitorDueResult {
  error?: string;
  ranAt: string;
  status: "completed" | "failed" | "skipped";
  trigger: string;
}

interface BuildModeAutomationMonitorOptions {
  clearIntervalFn?: (handle: unknown) => void;
  intervalMs?: number;
  logger?: (message: string) => void;
  now?: () => Date;
  runDue: (now: Date) => Promise<BuildModeAutomationMonitorDueResult>;
  setIntervalFn?: (callback: () => void, intervalMs: number) => unknown;
}

export class BuildModeAutomationMonitor {
  private readonly clearIntervalFn: (handle: unknown) => void;
  private readonly intervalMs: number;
  private readonly logger?: (message: string) => void;
  private readonly now: () => Date;
  private running = false;
  private readonly runDue: (
    now: Date,
  ) => Promise<BuildModeAutomationMonitorDueResult>;
  private readonly setIntervalFn: (
    callback: () => void,
    intervalMs: number,
  ) => unknown;
  private timer: unknown;

  constructor(options: BuildModeAutomationMonitorOptions) {
    this.clearIntervalFn =
      options.clearIntervalFn ?? ((handle) => clearInterval(handle as never));
    this.intervalMs = options.intervalMs ?? 60_000;
    this.logger = options.logger;
    this.now = options.now ?? (() => new Date());
    this.runDue = options.runDue;
    this.setIntervalFn =
      options.setIntervalFn ??
      ((callback, intervalMs) => setInterval(callback, intervalMs));
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = this.setIntervalFn(() => {
      void this.runOnce("interval");
    }, this.intervalMs);
    void this.runOnce("startup");
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    this.clearIntervalFn(this.timer);
    this.timer = undefined;
  }

  async runOnce(
    trigger: string = "manual",
  ): Promise<BuildModeAutomationMonitorRunResult> {
    const now = this.now();
    const ranAt = now.toISOString();
    if (this.running) {
      return {
        executedCount: 0,
        ranAt,
        skippedCount: 0,
        status: "skipped",
        trigger,
      };
    }

    this.running = true;
    try {
      const result = await this.runDue(now);
      const completed: BuildModeAutomationMonitorRunResult = {
        ...result,
        ranAt,
        status: "completed",
        trigger,
      };
      const total = result.executedCount + result.skippedCount;
      if (total > 0) {
        this.logger?.(
          `Build Mode automation monitor processed ${result.executedCount} due automation(s) and skipped ${result.skippedCount}.`,
        );
      }
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.(`Build Mode automation monitor failed: ${message}`);
      return {
        error: message,
        executedCount: 0,
        ranAt,
        skippedCount: 0,
        status: "failed",
        trigger,
      };
    } finally {
      this.running = false;
    }
  }
}
