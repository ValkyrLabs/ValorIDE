import fs from "fs/promises";
import os from "os";
import path from "path";
import type { BuildModePromptExecutionContext } from "@shared/BuildMode";
import {
  BuildModeAutomationScheduler,
  type BuildModeValkyraiCronLauncher,
} from "./BuildModeAutomationScheduler";

const promptContext: BuildModePromptExecutionContext = {
  promptProfileId: "prompt-profile-valhalla",
  promptProfileName: "Valhalla Build Operator",
  promptBundleId: "prompt-bundle-valhalla-001",
  promptBundleVersion: "2026.06.21",
  promptBundlePolicy: "locked",
  promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
};

const createPassthroughCronLauncher =
  (): jest.MockedFunction<BuildModeValkyraiCronLauncher> =>
    jest.fn(async (request) => ({
      inSync: true,
      quartzNextFireTime: null,
      workflowDefinedCron: null,
      workflowId: request.workflowId,
      workflowStatus: request.activate ? "READY" : "PAUSED",
    })) as jest.MockedFunction<BuildModeValkyraiCronLauncher>;

const writeLegacyLocalScheduler = async (
  storagePath: string,
  ids: string[],
) => {
  const raw = await fs.readFile(storagePath, "utf8");
  const parsed = JSON.parse(raw) as {
    records: Array<Record<string, unknown>>;
    version: 1;
  };
  await fs.writeFile(
    storagePath,
    JSON.stringify(
      {
        ...parsed,
        records: parsed.records.map((record) =>
          ids.includes(String(record.id))
            ? {
                ...record,
                scheduler: "local",
                valkyraiScheduleUri: undefined,
                valkyraiWorkflowId: undefined,
              }
            : record,
        ),
      },
      null,
      2,
    ),
    "utf8",
  );
};

describe("BuildModeAutomationScheduler", () => {
  let cronLauncher: jest.MockedFunction<BuildModeValkyraiCronLauncher>;
  let tempDir: string;

  beforeEach(async () => {
    cronLauncher = createPassthroughCronLauncher();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "valor-build-mode-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("requires the ValkyrAI cron workflow launcher for new schedules", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);

    await expect(
      scheduler.schedule({
        command: {
          id: "cmd-automation-automation-nightly-fulfillment-check",
          kind: "automation",
          label: "Schedule nightly smoke check",
          command:
            "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
          capabilityId: "automation.schedule",
          requiresApproval: true,
          status: "approval-required",
        },
        createdAt: new Date("2026-06-22T03:00:00.000Z"),
        taskId: "build-mode-task",
      }),
    ).rejects.toThrow(
      "Build Mode automation scheduling must use the ValkyrAI cron workflow launcher.",
    );
  });

  it("uses the constructor ValkyrAI cron launcher for schedule creation", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir, cronLauncher);

    const scheduled = await scheduler.schedule({
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      taskId: "build-mode-task",
    });

    expect(cronLauncher).toHaveBeenCalledWith({
      activate: true,
      cronExpression: "0 7 * * *",
      scheduleId: "automation-nightly-fulfillment-check",
      taskId: "build-mode-task",
      workflowId: "digital-product-fulfillment",
      workflowRef: "workflow:digital-product-fulfillment",
    });
    expect(scheduled.record).toMatchObject({
      scheduler: "valkyrai-cron",
      valkyraiScheduleUri:
        "valkyrai://vaiworkflow/digital-product-fulfillment/schedule",
      valkyraiWorkflowId: "digital-product-fulfillment",
    });
  });

  it("persists scheduled automations with tenant scope and next run metadata", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const scheduled = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      commandCatalog: [
        {
          id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
          kind: "workflow",
          label: "Run fulfillment workflow",
          command:
            'mcp:graymatter.runWorkflow args:{"token":"sk-test-secret-1234567890"}',
          capabilityId: "mcp.tool",
          requiresApproval: true,
          status: "approval-required",
        },
      ],
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      promptContext,
      providerRoute: "enterprise-proxy",
      scope: {
        tenantId: "tenant-valkyr-demo",
        principalId: "principal-valhalla-operator",
        roles: ["Owner"],
        workspaceRoot: "/workspace/valor",
        policyRefs: ["policy://build-mode"],
      },
      taskId: "build-mode-task",
    });

    expect(scheduled.record).toMatchObject({
      commandId: "cmd-automation-automation-nightly-fulfillment-check",
      id: "automation-nightly-fulfillment-check",
      nextRunAt: "2026-06-22T07:00:00.000Z",
      principalId: "principal-valhalla-operator",
      promptContext,
      providerRoute: "enterprise-proxy",
      schedule: "0 7 * * *",
      status: "scheduled",
      tenantId: "tenant-valkyr-demo",
      workflowCommandId: "cmd-workflow-workflow-mcp-dpp-fulfillment",
      workflowCommandSnapshot: {
        command:
          'mcp:graymatter.runWorkflow args:{"token":"<redacted-secret>"}',
        id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
      },
      workflowRef: "workflow:digital-product-fulfillment",
    });

    const raw = await fs.readFile(scheduled.storagePath, "utf8");
    expect(JSON.parse(raw)).toMatchObject({
      records: [
        expect.objectContaining({
          id: scheduled.record.id,
          promptContext,
          providerRoute: "enterprise-proxy",
        }),
      ],
      version: 1,
    });

    await expect(
      scheduler.getSnapshot(new Date("2026-06-22T03:05:00.000Z")),
    ).resolves.toMatchObject({
      records: [
        expect.objectContaining({
          id: scheduled.record.id,
          promptContext,
          providerRoute: "enterprise-proxy",
        }),
      ],
    });
  });

  it("delegates schedule creation to the ValkyrAI cron workflow launcher", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const cronLauncher = jest.fn(async () => ({
      inSync: true,
      quartzCron: "0 0 7 * * ?",
      quartzNextFireTime: "2026-06-22T07:00:00.000Z",
      quartzPreviousFireTime: null,
      quartzState: "SCHEDULED",
      workflowDefinedCron: "0 0 7 * * ?",
      workflowId: "4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
      workflowName: "Nightly fulfillment smoke check",
      workflowStatus: "READY",
    }));

    const scheduled = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1 command:cmd-workflow-nightly",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      taskId: "build-mode-task",
    });

    expect(cronLauncher).toHaveBeenCalledWith({
      activate: true,
      cronExpression: "0 7 * * *",
      scheduleId: "automation-nightly-fulfillment-check",
      taskId: "build-mode-task",
      workflowId: "4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
      workflowRef: "workflow:4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
    });
    expect(scheduled.record).toMatchObject({
      nextRunAt: "2026-06-22T07:00:00.000Z",
      schedule: "0 0 7 * * ?",
      scheduler: "valkyrai-cron",
      valkyraiScheduleUri:
        "valkyrai://vaiworkflow/4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1/schedule",
      valkyraiWorkflowId: "4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
    });

    const due = await scheduler.listDue(new Date("2026-06-22T07:01:00.000Z"));
    expect(due).toEqual([]);
  });

  it("delegates ValkyrAI cron pause and resume lifecycle changes", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const cronLauncher = jest.fn(async (request) => ({
      inSync: true,
      quartzCron: "0 0 7 * * ?",
      quartzNextFireTime: request.activate ? "2026-06-24T07:00:00.000Z" : null,
      quartzPreviousFireTime: null,
      quartzState: request.activate ? "SCHEDULED" : "UNSCHEDULED",
      workflowDefinedCron: "0 0 7 * * ?",
      workflowId: request.workflowId,
      workflowName: "Nightly fulfillment smoke check",
      workflowStatus: request.activate ? "READY" : "PAUSED",
    }));

    const dueSchedule = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1 command:cmd-workflow-nightly",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      taskId: "build-mode-task",
    });

    const paused = await scheduler.updateStatus({
      cronLauncher,
      id: "automation-nightly-fulfillment-check",
      status: "paused",
      updatedAt: new Date("2026-06-23T06:30:00.000Z"),
    });
    const resumed = await scheduler.updateStatus({
      cronLauncher,
      id: "automation-nightly-fulfillment-check",
      status: "scheduled",
      updatedAt: new Date("2026-06-23T07:05:00.000Z"),
    });

    expect(cronLauncher).toHaveBeenNthCalledWith(2, {
      activate: false,
      cronExpression: "0 0 7 * * ?",
      scheduleId: "automation-nightly-fulfillment-check",
      taskId: "build-mode-task",
      workflowId: "4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
      workflowRef: "workflow:4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
    });
    expect(cronLauncher).toHaveBeenNthCalledWith(3, {
      activate: true,
      cronExpression: "0 0 7 * * ?",
      scheduleId: "automation-nightly-fulfillment-check",
      taskId: "build-mode-task",
      workflowId: "4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
      workflowRef: "workflow:4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
    });
    expect(paused.record).toMatchObject({
      schedule: "0 0 7 * * ?",
      scheduler: "valkyrai-cron",
      status: "paused",
      valkyraiWorkflowId: "4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
    });
    expect(resumed.record).toMatchObject({
      nextRunAt: "2026-06-24T07:00:00.000Z",
      scheduler: "valkyrai-cron",
      status: "scheduled",
      valkyraiScheduleUri:
        "valkyrai://vaiworkflow/4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1/schedule",
    });
    await expect(
      scheduler.listDue(new Date("2026-06-24T07:01:00.000Z")),
    ).resolves.toEqual([]);
  });

  it("upserts existing automations by schedule id", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const first = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      taskId: "build-mode-task",
    });
    const second = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:30 9 * * * workflow:workflow:digital-product-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:05:00.000Z"),
      taskId: "build-mode-task",
    });

    expect(second.record).toMatchObject({
      createdAt: first.record.createdAt,
      nextRunAt: "2026-06-22T09:30:00.000Z",
      schedule: "30 9 * * *",
      updatedAt: "2026-06-22T08:05:00.000Z",
    });
    const raw = await fs.readFile(second.storagePath, "utf8");
    expect(JSON.parse(raw).records).toHaveLength(1);
  });

  it("does not list ValkyrAI cron owned automations as locally due", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-due",
        kind: "automation",
        label: "Due automation",
        command:
          "schedule:0 7 * * * workflow:workflow:due command:cmd-workflow-due",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      taskId: "build-mode-task",
    });
    const futureSchedule = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-future",
        kind: "automation",
        label: "Future automation",
        command:
          "schedule:30 12 * * * workflow:workflow:future command:cmd-workflow-future",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T03:00:00.000Z"),
      taskId: "build-mode-task",
    });

    const due = await scheduler.listDue(new Date("2026-06-22T07:01:00.000Z"));

    expect(due).toEqual([]);

    const snapshot = await scheduler.getSnapshot(
      new Date("2026-06-22T07:01:00.000Z"),
    );
    expect(snapshot.records.map((record) => record.scheduler)).toEqual([
      "valkyrai-cron",
      "valkyrai-cron",
    ]);
    expect(snapshot.records[1]).toMatchObject({
      id: futureSchedule.record.id,
      valkyraiScheduleUri: "valkyrai://vaiworkflow/future/schedule",
    });
  });

  it("normalizes legacy local schedule records onto ValkyrAI cron", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const scheduled = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });
    await writeLegacyLocalScheduler(scheduled.storagePath, [
      scheduled.record.id,
    ]);

    await expect(
      scheduler.listDue(new Date("2026-06-23T07:01:00.000Z")),
    ).resolves.toEqual([]);
    await expect(
      scheduler.runDue(new Date("2026-06-23T07:01:00.000Z")),
    ).resolves.toEqual([]);
    await expect(
      scheduler.getSnapshot(new Date("2026-06-23T07:01:00.000Z")),
    ).resolves.toMatchObject({
      records: [
        expect.objectContaining({
          id: "automation-nightly-fulfillment-check",
          scheduler: "valkyrai-cron",
          valkyraiScheduleUri:
            "valkyrai://vaiworkflow/digital-product-fulfillment/schedule",
          valkyraiWorkflowId: "digital-product-fulfillment",
        }),
      ],
    });
  });

  it("does not run due automations locally because ValkyrAI cron launches them", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });
    const results = await scheduler.runDue(
      new Date("2026-06-23T07:01:00.000Z"),
    );

    expect(results).toEqual([]);
    const snapshot = await scheduler.getSnapshot(
      new Date("2026-06-23T07:01:00.000Z"),
    );
    expect(snapshot.records[0]).toMatchObject({
      scheduler: "valkyrai-cron",
    });
    expect(snapshot.records[0].lastRunAt).toBeUndefined();
    expect(snapshot.records[0].lastRunReceiptId).toBeUndefined();
    expect(snapshot.records[0].lastRunStatus).toBeUndefined();
    expect(snapshot.records[0].runHistory).toBeUndefined();
  });

  it("keeps sanitized workflow command snapshots for ValkyrAI cron handoff visibility", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const scheduled = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      commandCatalog: [
        {
          id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
          kind: "workflow",
          label: "Run fulfillment workflow",
          command: "mcp:graymatter.runWorkflow input:workflows/nightly.json",
          capabilityId: "mcp.tool",
          requiresApproval: true,
          status: "approval-required",
        },
      ],
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });

    const raw = await fs.readFile(scheduled.storagePath, "utf8");
    expect(JSON.parse(raw)).toMatchObject({
      records: [
        expect.objectContaining({
          workflowCommandSnapshot: expect.objectContaining({
            id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
            command: "mcp:graymatter.runWorkflow input:workflows/nightly.json",
          }),
        }),
      ],
    });
    await expect(
      scheduler.getSnapshot(new Date("2026-06-23T07:01:00.000Z")),
    ).resolves.toMatchObject({
      records: [
        expect.not.objectContaining({
          workflowCommandSnapshot: expect.anything(),
        }),
      ],
    });

    expect(scheduled.record.workflowCommandSnapshot).toMatchObject({
      id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
      command: "mcp:graymatter.runWorkflow input:workflows/nightly.json",
    });
  });

  it("returns sanitized schedule snapshots for cockpit observability", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    const scheduled = await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      commandCatalog: [
        {
          id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
          kind: "workflow",
          label: "Run fulfillment workflow",
          command:
            'mcp:graymatter.runWorkflow args:{"token":"sk-test-secret-1234567890"}',
          capabilityId: "mcp.tool",
          requiresApproval: true,
          status: "approval-required",
        },
      ],
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      scope: {
        tenantId: "tenant-valkyr-demo",
        principalId: "principal-valhalla-operator",
        roles: ["Owner"],
        workspaceRoot: "/workspace/valor",
        policyRefs: ["policy://build-mode"],
      },
      taskId: "build-mode-task",
    });
    await scheduler.markRunAttempt({
      completedAt: new Date("2026-06-23T07:01:00.000Z"),
      receiptId: "build-command-receipt-workflow-run-001",
      status: "succeeded",
      scheduleId: scheduled.record.id,
    });

    const snapshot = await scheduler.getSnapshot(
      new Date("2026-06-23T07:02:00.000Z"),
    );

    expect(snapshot).toMatchObject({
      refreshedAt: "2026-06-23T07:02:00.000Z",
      records: [
        expect.objectContaining({
          id: "automation-nightly-fulfillment-check",
          lastRunAt: "2026-06-23T07:01:00.000Z",
          lastRunReceiptId: "build-command-receipt-workflow-run-001",
          lastRunStatus: "succeeded",
          nextRunAt: "2026-06-24T07:00:00.000Z",
          runHistory: [
            {
              completedAt: "2026-06-23T07:01:00.000Z",
              receiptId: "build-command-receipt-workflow-run-001",
              status: "succeeded",
            },
          ],
          workflowCommandId: "cmd-workflow-workflow-mcp-dpp-fulfillment",
        }),
      ],
      storageUri: "valoride://build-mode/automations",
    });
    expect(snapshot.records[0]).not.toHaveProperty("workflowCommandSnapshot");
  });

  it("keeps scheduled automation run history bounded with newest attempts first", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });

    for (let index = 0; index < 21; index += 1) {
      await scheduler.markRunAttempt({
        completedAt: new Date(
          `2026-06-23T07:${String(index).padStart(2, "0")}:00.000Z`,
        ),
        error: index % 2 ? "transient workflow failure" : undefined,
        receiptId: `build-command-receipt-workflow-run-${index}`,
        scheduleId: "automation-nightly-fulfillment-check",
        status: index % 2 ? "failed" : "succeeded",
      });
    }

    const snapshot = await scheduler.getSnapshot(
      new Date("2026-06-23T08:00:00.000Z"),
    );

    expect(snapshot.records[0].runHistory).toHaveLength(20);
    expect(snapshot.records[0].runHistory?.[0]).toMatchObject({
      completedAt: "2026-06-23T07:20:00.000Z",
      receiptId: "build-command-receipt-workflow-run-20",
      status: "succeeded",
    });
    expect(snapshot.records[0].runHistory?.at(-1)).toMatchObject({
      completedAt: "2026-06-23T07:01:00.000Z",
      error: "transient workflow failure",
      receiptId: "build-command-receipt-workflow-run-1",
      status: "failed",
    });
  });

  it("pauses and resumes scheduled automations without firing while paused", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });

    const paused = await scheduler.updateStatus({
      cronLauncher,
      id: "automation-nightly-fulfillment-check",
      status: "paused",
      updatedAt: new Date("2026-06-23T06:30:00.000Z"),
    });

    expect(paused.record).toMatchObject({
      status: "paused",
      nextRunAt: "2026-06-23T07:00:00.000Z",
    });
    expect(paused.lifecycleReceipt).toMatchObject({
      capabilityId: "automation.schedule",
      commandId: "cmd-automation-automation-nightly-fulfillment-check",
      executionMode: "agentic-command-bus",
      nextOperatorAction: "continue",
      policyDecision: "allow",
      status: "succeeded",
      summary:
        "Scheduled automation automation-nightly-fulfillment-check paused. Next run: 2026-06-23T07:00:00.000Z.",
    });
    expect(paused.lifecycleReceipt?.id).toMatch(
      /^build-command-receipt-automation-paused-/,
    );
    expect(paused.lifecycleReceipt?.artifacts?.[0]).toMatchObject({
      kind: "workflow_receipt",
      metadata: {
        automationStatus: "paused",
        nextRunAt: "2026-06-23T07:00:00.000Z",
        schedule: "0 7 * * *",
        scheduleId: "automation-nightly-fulfillment-check",
        scheduler: "valkyrai-cron",
        schedulerSource: "valkyrai-cron-workflow-launcher",
        storageUri:
          "valkyrai://vaiworkflow/digital-product-fulfillment/schedule",
        workflowCommandId: "cmd-workflow-workflow-mcp-dpp-fulfillment",
        workflowId: "digital-product-fulfillment",
        workflowRef: "workflow:digital-product-fulfillment",
      },
      uri: "valoride://build-mode/automations/automation-nightly-fulfillment-check/status/paused",
    });
    await expect(
      scheduler.listDue(new Date("2026-06-23T07:01:00.000Z")),
    ).resolves.toEqual([]);

    const resumed = await scheduler.updateStatus({
      cronLauncher,
      id: "automation-nightly-fulfillment-check",
      status: "scheduled",
      updatedAt: new Date("2026-06-23T07:05:00.000Z"),
    });

    expect(resumed.record).toMatchObject({
      status: "scheduled",
      nextRunAt: "2026-06-24T07:00:00.000Z",
    });
    expect(resumed.lifecycleReceipt).toMatchObject({
      status: "succeeded",
      summary:
        "Scheduled automation automation-nightly-fulfillment-check resumed. Next run: 2026-06-24T07:00:00.000Z.",
    });
    expect(resumed.lifecycleReceipt?.artifacts?.[0].metadata).toMatchObject({
      automationStatus: "scheduled",
      nextRunAt: "2026-06-24T07:00:00.000Z",
      scheduler: "valkyrai-cron",
      schedulerSource: "valkyrai-cron-workflow-launcher",
      storageUri: "valkyrai://vaiworkflow/digital-product-fulfillment/schedule",
    });
  });

  it("does not synthesize skipped receipts for cron-owned automations without a workflow command id", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });

    const results = await scheduler.runDue(
      new Date("2026-06-23T07:01:00.000Z"),
    );

    expect(results).toEqual([]);
    const snapshot = await scheduler.getSnapshot(
      new Date("2026-06-23T07:01:00.000Z"),
    );
    expect(snapshot.records[0]).toMatchObject({
      scheduler: "valkyrai-cron",
    });
    expect(snapshot.records[0].lastRunAt).toBeUndefined();
    expect(snapshot.records[0].lastRunReceiptId).toBeUndefined();
    expect(snapshot.records[0].lastRunStatus).toBeUndefined();
    expect(snapshot.records[0].runHistory).toBeUndefined();
    expect(snapshot.records[0].workflowCommandId).toBeUndefined();
  });

  it("does not synthesize local failure receipts for cron-owned automations", async () => {
    const scheduler = new BuildModeAutomationScheduler(tempDir);
    await scheduler.schedule({
      cronLauncher,
      command: {
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        label: "Schedule nightly smoke check",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        capabilityId: "automation.schedule",
        requiresApproval: true,
        status: "approval-required",
      },
      createdAt: new Date("2026-06-22T08:00:00.000Z"),
      taskId: "build-mode-task",
    });
    const results = await scheduler.runDue(
      new Date("2026-06-23T07:01:00.000Z"),
    );

    expect(results).toEqual([]);
    const snapshot = await scheduler.getSnapshot(
      new Date("2026-06-23T07:01:00.000Z"),
    );
    expect(snapshot.records[0]).toMatchObject({
      scheduler: "valkyrai-cron",
    });
    expect(snapshot.records[0].lastRunAt).toBeUndefined();
    expect(snapshot.records[0].lastRunReceiptId).toBeUndefined();
    expect(snapshot.records[0].lastRunStatus).toBeUndefined();
    expect(snapshot.records[0].runHistory).toBeUndefined();
  });
});
