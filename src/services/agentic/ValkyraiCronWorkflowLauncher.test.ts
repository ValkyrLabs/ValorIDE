const authFetchMock = jest.fn();

jest.mock("@utils/authFetch", () => ({
  authFetch: (...args: Parameters<typeof fetch>) => authFetchMock(...args),
}));

jest.mock("@utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: jest.fn(() => "https://api-0.valkyrlabs.com/v1/"),
  normalizeValkyraiHost: jest.fn((value?: string) =>
    (value ?? "https://api-0.valkyrlabs.com/v1").replace(/\/+$/, ""),
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { launchValkyraiCronWorkflowSchedule } = require(
  "./ValkyraiCronWorkflowLauncher",
) as typeof import("./ValkyraiCronWorkflowLauncher");

describe("launchValkyraiCronWorkflowSchedule", () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it("delegates schedule activation to the ValkyrAI cron workflow endpoint", async () => {
    authFetchMock.mockResolvedValue({
      json: jest.fn(async () => ({
        inSync: true,
        quartzCron: "0 0 7 * * ?",
        quartzNextFireTime: "2026-06-22T07:00:00.000Z",
        quartzState: "SCHEDULED",
        workflowDefinedCron: "0 0 7 * * ?",
        workflowId: "workflow-123",
        workflowName: "Nightly Build Mode check",
        workflowStatus: "READY",
      })),
      ok: true,
    } as unknown as Response);

    const result = await launchValkyraiCronWorkflowSchedule({
      activate: true,
      cronExpression: "0 7 * * *",
      scheduleId: "automation-nightly-check",
      taskId: "build-mode-task",
      workflowId: "workflow-123",
      workflowRef: "workflow:workflow-123",
    });

    expect(authFetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/vaiworkflow/workflow-123/schedule",
      {
        body: JSON.stringify({
          activate: true,
          cronExpression: "0 7 * * *",
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    expect(result).toMatchObject({
      inSync: true,
      quartzNextFireTime: "2026-06-22T07:00:00.000Z",
      workflowId: "workflow-123",
      workflowStatus: "READY",
    });
  });

  it("surfaces ValkyrAI cron workflow schedule failures with workflow context", async () => {
    authFetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      text: jest.fn(async () => "cron expression is invalid"),
    } as unknown as Response);

    await expect(
      launchValkyraiCronWorkflowSchedule({
        activate: false,
        cronExpression: "bad-cron",
        scheduleId: "automation-nightly-check",
        taskId: "build-mode-task",
        workflowId: "workflow-123",
        workflowRef: "workflow:workflow-123",
      }),
    ).rejects.toThrow(
      "ValkyrAI cron workflow schedule failed for workflow:workflow-123: 409 cron expression is invalid",
    );
  });
});
