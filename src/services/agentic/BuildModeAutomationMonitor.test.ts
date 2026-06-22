import { BuildModeAutomationMonitor } from "./BuildModeAutomationMonitor";

describe("BuildModeAutomationMonitor", () => {
  it("runs due scheduled automations with the current monitor time", async () => {
    const runDue = jest.fn().mockResolvedValue({
      executedCount: 2,
      receiptIds: ["receipt-1", "receipt-2"],
      skippedCount: 1,
    });
    const monitor = new BuildModeAutomationMonitor({
      now: () => new Date("2026-06-22T12:00:00.000Z"),
      runDue,
    });

    await expect(monitor.runOnce("manual")).resolves.toEqual({
      executedCount: 2,
      ranAt: "2026-06-22T12:00:00.000Z",
      receiptIds: ["receipt-1", "receipt-2"],
      skippedCount: 1,
      status: "completed",
      trigger: "manual",
    });
    expect(runDue).toHaveBeenCalledWith(new Date("2026-06-22T12:00:00.000Z"));
  });

  it("skips overlapping interval runs while a previous run is active", async () => {
    let resolveRun!: (value: {
      executedCount: number;
      skippedCount: number;
    }) => void;
    const monitor = new BuildModeAutomationMonitor({
      now: () => new Date("2026-06-22T12:00:00.000Z"),
      runDue: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveRun = resolve;
          }),
      ),
    });

    const firstRun = monitor.runOnce("interval");
    await expect(monitor.runOnce("interval")).resolves.toMatchObject({
      executedCount: 0,
      skippedCount: 0,
      status: "skipped",
      trigger: "interval",
    });

    resolveRun({ executedCount: 1, skippedCount: 0 });
    await expect(firstRun).resolves.toMatchObject({
      executedCount: 1,
      status: "completed",
    });
  });

  it("starts once and disposes the interval timer", () => {
    const callbacks: Array<() => void> = [];
    const clearIntervalFn = jest.fn();
    const setIntervalFn = jest.fn((callback: () => void) => {
      callbacks.push(callback);
      return "timer-1";
    });
    const monitor = new BuildModeAutomationMonitor({
      clearIntervalFn,
      intervalMs: 30_000,
      runDue: jest
        .fn()
        .mockResolvedValue({ executedCount: 0, skippedCount: 0 }),
      setIntervalFn,
    });

    monitor.start();
    monitor.start();
    expect(setIntervalFn).toHaveBeenCalledTimes(1);
    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 30_000);

    callbacks[0]();
    monitor.stop();
    monitor.stop();
    expect(clearIntervalFn).toHaveBeenCalledTimes(1);
    expect(clearIntervalFn).toHaveBeenCalledWith("timer-1");
  });

  it("returns failed monitor results when due execution throws", async () => {
    const logger = jest.fn();
    const monitor = new BuildModeAutomationMonitor({
      logger,
      now: () => new Date("2026-06-22T12:00:00.000Z"),
      runDue: jest.fn().mockRejectedValue(new Error("MCP unavailable")),
    });

    await expect(monitor.runOnce("interval")).resolves.toEqual({
      error: "MCP unavailable",
      executedCount: 0,
      ranAt: "2026-06-22T12:00:00.000Z",
      skippedCount: 0,
      status: "failed",
      trigger: "interval",
    });
    expect(logger).toHaveBeenCalledWith(
      "Build Mode automation monitor failed: MCP unavailable",
    );
  });
});
