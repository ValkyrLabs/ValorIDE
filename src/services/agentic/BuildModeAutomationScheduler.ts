import fs from "fs/promises";
import path from "path";
import type {
  BuildModeAutomationSnapshot,
  BuildModeAutomationSnapshotRecord,
  BuildModeAutomationRunHistoryEntry,
  BuildModeCommand,
  BuildModeCommandReceipt,
  BuildModePromptExecutionContext,
  BuildModeScopeContext,
  ProviderRoute,
} from "@shared/BuildMode";
import { redactCommandSecrets } from "./BuildModeCommandPolicy";

export interface BuildModeAutomationScheduleRequest {
  command: BuildModeCommand;
  commandCatalog?: BuildModeCommand[];
  createdAt: Date;
  cronLauncher?: BuildModeValkyraiCronLauncher;
  promptContext?: BuildModePromptExecutionContext;
  providerRoute?: ProviderRoute;
  scope?: BuildModeScopeContext;
  taskId: string;
}

export interface BuildModeValkyraiCronScheduleRequest {
  activate: boolean;
  cronExpression: string;
  scheduleId: string;
  taskId: string;
  workflowId: string;
  workflowRef: string;
}

export interface BuildModeValkyraiCronScheduleStatus {
  inSync?: boolean;
  quartzCron?: string | null;
  quartzNextFireTime?: string | null;
  quartzPreviousFireTime?: string | null;
  quartzState?: string | null;
  workflowDefinedCron?: string | null;
  workflowId: string;
  workflowName?: string;
  workflowStatus?: string;
}

export type BuildModeValkyraiCronLauncher = (
  request: BuildModeValkyraiCronScheduleRequest,
) =>
  | Promise<BuildModeValkyraiCronScheduleStatus>
  | BuildModeValkyraiCronScheduleStatus;

export interface BuildModeScheduledAutomationRecord {
  commandId?: string;
  createdAt: string;
  id: string;
  label: string;
  lastRunAt?: string;
  lastRunReceiptId?: string;
  lastRunStatus?: "failed" | "skipped" | "succeeded";
  nextRunAt?: string;
  principalId?: string;
  promptContext?: BuildModePromptExecutionContext;
  providerRoute?: ProviderRoute;
  runHistory?: BuildModeAutomationRunHistoryEntry[];
  schedule: string;
  scheduler?: "local" | "valkyrai-cron";
  status: "paused" | "scheduled";
  taskId: string;
  tenantId?: string;
  updatedAt: string;
  valkyraiScheduleUri?: string;
  valkyraiWorkflowId?: string;
  workflowCommandId?: string;
  workflowCommandSnapshot?: BuildModeCommand;
  workflowRef: string;
  workspaceRoot?: string;
}

export interface BuildModeAutomationScheduleResult {
  lifecycleReceipt?: BuildModeCommandReceipt;
  record: BuildModeScheduledAutomationRecord;
  storagePath: string;
}

export interface BuildModeAutomationRunAttempt {
  completedAt: Date;
  error?: string;
  receiptId: string;
  scheduleId: string;
  status: "failed" | "skipped" | "succeeded";
}

export interface BuildModeAutomationRunResult {
  error?: string;
  record: BuildModeScheduledAutomationRecord;
  runReceipt?: BuildModeCommandReceipt;
  runReceiptId?: string;
  status: "failed" | "skipped" | "succeeded";
}

export interface BuildModeAutomationStatusUpdateRequest {
  cronLauncher?: BuildModeValkyraiCronLauncher;
  id: string;
  status: "paused" | "scheduled";
  updatedAt: Date;
}

export type BuildModeAutomationExecutor = (
  record: BuildModeScheduledAutomationRecord,
) => Promise<{ receiptId: string; status: "failed" | "succeeded" }>;

interface BuildModeAutomationStore {
  records: BuildModeScheduledAutomationRecord[];
  version: 1;
}

const MAX_RUN_HISTORY = 20;

export class BuildModeAutomationScheduler {
  constructor(private readonly globalStoragePath: string) {}

  async getSnapshot(refreshedAt: Date): Promise<BuildModeAutomationSnapshot> {
    const storagePath = this.getStoragePath();
    const store = await this.readStore(storagePath);
    return {
      records: store.records.map(toSnapshotRecord),
      refreshedAt: refreshedAt.toISOString(),
      storageUri: `valoride://build-mode/automations`,
    };
  }

  async schedule(
    request: BuildModeAutomationScheduleRequest,
  ): Promise<BuildModeAutomationScheduleResult> {
    const parsed = parseBuildModeScheduleCommand(request.command.command);
    if (!parsed) {
      throw new Error(
        "Build Mode automation commands must use schedule:<cron> workflow:<workflow-ref>.",
      );
    }

    const storagePath = this.getStoragePath();
    const store = await this.readStore(storagePath);
    const nowIso = request.createdAt.toISOString();
    const id =
      extractAutomationId(request.command.id) ??
      createScheduleId(request.taskId, parsed.workflowRef, parsed.schedule);
    const existing = store.records.find((record) => record.id === id);
    const valkyraiWorkflowId = extractValkyraiWorkflowId(parsed.workflowRef);
    if (!request.cronLauncher) {
      throw new Error(
        "Build Mode automation scheduling must use the ValkyrAI cron workflow launcher.",
      );
    }
    const cronStatus = await request.cronLauncher({
      activate: true,
      cronExpression: parsed.schedule,
      scheduleId: id,
      taskId: request.taskId,
      workflowId: valkyraiWorkflowId,
      workflowRef: parsed.workflowRef,
    });
    const workflowCommandSnapshot = parsed.workflowCommandId
      ? request.commandCatalog
          ?.map(redactScheduledCommandSnapshot)
          .find((command) => command.id === parsed.workflowCommandId)
      : undefined;
    const record: BuildModeScheduledAutomationRecord = {
      commandId: request.command.id,
      createdAt: existing?.createdAt ?? nowIso,
      id,
      label: request.command.label,
      nextRunAt:
        cronStatus?.quartzNextFireTime ??
        computeNextRunAt(parsed.schedule, request.createdAt),
      principalId: request.scope?.principalId,
      promptContext: request.promptContext,
      providerRoute: request.providerRoute,
      schedule: cronStatus?.workflowDefinedCron ?? parsed.schedule,
      scheduler: "valkyrai-cron",
      status: "scheduled",
      taskId: request.taskId,
      tenantId: request.scope?.tenantId,
      updatedAt: nowIso,
      valkyraiScheduleUri: `valkyrai://vaiworkflow/${encodeURIComponent(valkyraiWorkflowId)}/schedule`,
      valkyraiWorkflowId,
      workflowCommandId: parsed.workflowCommandId,
      workflowCommandSnapshot,
      workflowRef: parsed.workflowRef,
      workspaceRoot: request.scope?.workspaceRoot,
    };

    const nextRecords = existing
      ? store.records.map((item) => (item.id === id ? record : item))
      : [...store.records, record];
    await this.writeStore(storagePath, { records: nextRecords, version: 1 });

    return { record, storagePath };
  }

  async listDue(now: Date): Promise<BuildModeScheduledAutomationRecord[]> {
    const store = await this.readStore(this.getStoragePath());
    return store.records.filter(
      (record) =>
        record.status === "scheduled" &&
        record.scheduler !== "valkyrai-cron" &&
        Boolean(record.nextRunAt) &&
        new Date(record.nextRunAt!).getTime() <= now.getTime(),
    );
  }

  async updateStatus(
    request: BuildModeAutomationStatusUpdateRequest,
  ): Promise<BuildModeAutomationScheduleResult> {
    const storagePath = this.getStoragePath();
    const store = await this.readStore(storagePath);
    const existing = store.records.find((record) => record.id === request.id);
    if (!existing) {
      throw new Error(
        `Build Mode automation schedule not found: ${request.id}.`,
      );
    }

    const existingNextRunAt = existing.nextRunAt
      ? new Date(existing.nextRunAt)
      : undefined;
    if (existing.scheduler === "valkyrai-cron" && !request.cronLauncher) {
      throw new Error(
        "Build Mode automation lifecycle updates must use the ValkyrAI cron workflow launcher.",
      );
    }
    const nextRunAt =
      request.status === "scheduled" &&
      (!existingNextRunAt || existingNextRunAt <= request.updatedAt)
        ? computeNextRunAt(existing.schedule, request.updatedAt)
        : existing.nextRunAt;
    const valkyraiWorkflowId =
      existing.valkyraiWorkflowId ??
      extractValkyraiWorkflowId(existing.workflowRef);
    const cronStatus =
      existing.scheduler === "valkyrai-cron" && request.cronLauncher
        ? await request.cronLauncher({
            activate: request.status === "scheduled",
            cronExpression: existing.schedule,
            scheduleId: existing.id,
            taskId: existing.taskId,
            workflowId: valkyraiWorkflowId,
            workflowRef: existing.workflowRef,
          })
        : undefined;
    const record: BuildModeScheduledAutomationRecord = {
      ...existing,
      nextRunAt: cronStatus?.quartzNextFireTime ?? nextRunAt,
      schedule: cronStatus?.workflowDefinedCron ?? existing.schedule,
      status: request.status,
      updatedAt: request.updatedAt.toISOString(),
      valkyraiScheduleUri:
        existing.scheduler === "valkyrai-cron"
          ? (existing.valkyraiScheduleUri ??
            `valkyrai://vaiworkflow/${encodeURIComponent(
              valkyraiWorkflowId,
            )}/schedule`)
          : existing.valkyraiScheduleUri,
      valkyraiWorkflowId:
        existing.scheduler === "valkyrai-cron"
          ? valkyraiWorkflowId
          : existing.valkyraiWorkflowId,
    };
    await this.writeStore(storagePath, {
      records: store.records.map((item) =>
        item.id === request.id ? record : item,
      ),
      version: 1,
    });
    return {
      lifecycleReceipt: createAutomationLifecycleReceipt(
        record,
        request.status,
        request.updatedAt,
      ),
      record,
      storagePath,
    };
  }

  async markRunAttempt(
    attempt: BuildModeAutomationRunAttempt,
  ): Promise<BuildModeAutomationScheduleResult> {
    const storagePath = this.getStoragePath();
    const store = await this.readStore(storagePath);
    const existing = store.records.find(
      (record) => record.id === attempt.scheduleId,
    );
    if (!existing) {
      throw new Error(
        `Build Mode automation schedule not found: ${attempt.scheduleId}.`,
      );
    }

    const completedAt = attempt.completedAt;
    const runHistoryEntry: BuildModeAutomationRunHistoryEntry = {
      completedAt: completedAt.toISOString(),
      error: attempt.error,
      receiptId: attempt.receiptId,
      status: attempt.status,
    };
    const record: BuildModeScheduledAutomationRecord = {
      ...existing,
      lastRunAt: completedAt.toISOString(),
      lastRunReceiptId: attempt.receiptId,
      lastRunStatus: attempt.status,
      nextRunAt: computeNextRunAt(existing.schedule, completedAt),
      runHistory: [runHistoryEntry, ...(existing.runHistory ?? [])].slice(
        0,
        MAX_RUN_HISTORY,
      ),
      updatedAt: completedAt.toISOString(),
    };
    await this.writeStore(storagePath, {
      records: store.records.map((item) =>
        item.id === attempt.scheduleId ? record : item,
      ),
      version: 1,
    });
    return { record, storagePath };
  }

  async runDue(
    now: Date,
    executor: BuildModeAutomationExecutor,
  ): Promise<BuildModeAutomationRunResult[]> {
    const due = await this.listDue(now);
    const results: BuildModeAutomationRunResult[] = [];
    for (const record of due) {
      if (!record.workflowCommandId) {
        const receiptId = createRunAttemptReceiptId(record.id, now, "skipped");
        const marked = await this.markRunAttempt({
          completedAt: now,
          error: "Scheduled automation does not have a workflow command id.",
          receiptId,
          scheduleId: record.id,
          status: "skipped",
        });
        const runReceipt = createAutomationRunAttemptReceipt({
          completedAt: now,
          error: "Scheduled automation does not have a workflow command id.",
          receiptId,
          record: marked.record,
          status: "skipped",
        });
        results.push({
          error: "Scheduled automation does not have a workflow command id.",
          record: marked.record,
          runReceipt,
          runReceiptId: marked.record.lastRunReceiptId,
          status: "skipped",
        });
        continue;
      }
      try {
        const execution = await executor(record);
        const marked = await this.markRunAttempt({
          completedAt: now,
          receiptId: execution.receiptId,
          scheduleId: record.id,
          status: execution.status,
        });
        results.push({
          record: marked.record,
          runReceiptId: execution.receiptId,
          status: execution.status,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const receiptId = createRunAttemptReceiptId(record.id, now, "failed");
        const marked = await this.markRunAttempt({
          completedAt: now,
          error: message,
          receiptId,
          scheduleId: record.id,
          status: "failed",
        });
        const runReceipt = createAutomationRunAttemptReceipt({
          completedAt: now,
          error: message,
          receiptId,
          record: marked.record,
          status: "failed",
        });
        results.push({
          error: message,
          record: marked.record,
          runReceipt,
          runReceiptId: marked.record.lastRunReceiptId,
          status: "failed",
        });
      }
    }
    return results;
  }

  private getStoragePath(): string {
    return path.join(
      this.globalStoragePath,
      "build-mode",
      "scheduled-automations.json",
    );
  }

  private async readStore(
    storagePath: string,
  ): Promise<BuildModeAutomationStore> {
    try {
      const raw = await fs.readFile(storagePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<BuildModeAutomationStore>;
      return {
        records: Array.isArray(parsed.records) ? parsed.records : [],
        version: 1,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { records: [], version: 1 };
      }
      throw error;
    }
  }

  private async writeStore(
    storagePath: string,
    store: BuildModeAutomationStore,
  ): Promise<void> {
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, JSON.stringify(store, null, 2), "utf8");
  }
}

const toSnapshotRecord = (
  record: BuildModeScheduledAutomationRecord,
): BuildModeAutomationSnapshotRecord => ({
  commandId: record.commandId,
  id: record.id,
  label: record.label,
  lastRunAt: record.lastRunAt,
  lastRunReceiptId: record.lastRunReceiptId,
  lastRunStatus: record.lastRunStatus,
  nextRunAt: record.nextRunAt,
  principalId: record.principalId,
  promptContext: record.promptContext,
  providerRoute: record.providerRoute,
  runHistory: record.runHistory,
  schedule: record.schedule,
  scheduler: record.scheduler,
  status: record.status,
  taskId: record.taskId,
  tenantId: record.tenantId,
  valkyraiScheduleUri: record.valkyraiScheduleUri,
  valkyraiWorkflowId: record.valkyraiWorkflowId,
  workflowCommandId: record.workflowCommandId,
  workflowRef: record.workflowRef,
  workspaceRoot: record.workspaceRoot,
});

export const parseBuildModeScheduleCommand = (
  command: string,
):
  | {
      schedule: string;
      workflowCommandId?: string;
      workflowRef: string;
    }
  | undefined => {
  if (!command.startsWith("schedule:")) {
    return undefined;
  }
  const workflowIndex = command.indexOf(" workflow:");
  if (workflowIndex < 0) {
    return undefined;
  }
  const schedule = command.slice("schedule:".length, workflowIndex).trim();
  const remainder = command.slice(workflowIndex + " workflow:".length);
  const commandIndex = remainder.indexOf(" command:");
  const workflowRef =
    commandIndex >= 0
      ? remainder.slice(0, commandIndex).trim()
      : remainder.trim();
  const workflowCommandId =
    commandIndex >= 0
      ? remainder.slice(commandIndex + " command:".length).trim() || undefined
      : undefined;
  if (!schedule || !workflowRef) {
    return undefined;
  }
  return { schedule, workflowCommandId, workflowRef };
};

const extractAutomationId = (commandId: string): string | undefined =>
  commandId.startsWith("cmd-automation-")
    ? commandId.slice("cmd-automation-".length)
    : undefined;

const extractValkyraiWorkflowId = (workflowRef: string): string =>
  workflowRef.startsWith("workflow:")
    ? workflowRef.slice("workflow:".length)
    : workflowRef;

const createRunAttemptReceiptId = (
  scheduleId: string,
  completedAt: Date,
  status: "failed" | "skipped",
): string =>
  `build-automation-${status}-${stableHash(`${scheduleId}:${completedAt.toISOString()}:${status}`).slice(0, 12)}`;

const createLifecycleReceiptId = (
  scheduleId: string,
  status: "paused" | "scheduled",
  updatedAt: Date,
): string =>
  `build-command-receipt-automation-${status}-${stableHash(`${scheduleId}:${updatedAt.toISOString()}:${status}`).slice(0, 12)}`;

const createAutomationLifecycleReceipt = (
  record: BuildModeScheduledAutomationRecord,
  status: "paused" | "scheduled",
  updatedAt: Date,
): BuildModeCommandReceipt => {
  const receiptId = createLifecycleReceiptId(record.id, status, updatedAt);
  const commandId = record.commandId ?? `cmd-automation-${record.id}`;
  const action = status === "paused" ? "paused" : "resumed";
  return {
    id: receiptId,
    commandId,
    capabilityId: "automation.schedule",
    status: "succeeded",
    approved: true,
    requiresApproval: false,
    summary: `Scheduled automation ${record.id} ${action}. Next run: ${record.nextRunAt ?? "not scheduled"}.`,
    createdAt: updatedAt.toISOString(),
    executionMode: "agentic-command-bus",
    nextOperatorAction: "continue",
    operatorActionSummary:
      "Automation lifecycle state changed and the cockpit can continue with the updated schedule snapshot.",
    policyDecision: "allow",
    policyReasons: ["Build Mode automation lifecycle status update."],
    scope:
      record.tenantId && record.principalId && record.workspaceRoot
        ? {
            tenantId: record.tenantId,
            principalId: record.principalId,
            roles: ["Owner", "BuildOperator"],
            workspaceRoot: record.workspaceRoot,
            policyRefs: ["build-mode:scheduled-automation"],
          }
        : undefined,
    artifacts: [
      {
        id: `${receiptId}-artifact-1`,
        kind: "workflow_receipt",
        title: `Automation ${action} receipt`,
        uri: `valoride://build-mode/automations/${encodeURIComponent(record.id)}/status/${status}`,
        commandId,
        receiptId,
        summary: `Automation ${record.label} is ${status}.`,
        metadata: {
          automationStatus: status,
          nextRunAt: record.nextRunAt,
          schedule: record.schedule,
          scheduleId: record.id,
          workflowCommandId: record.workflowCommandId,
          workflowRef: record.workflowRef,
        },
        createdAt: updatedAt.toISOString(),
      },
    ],
  };
};

const createAutomationRunAttemptReceipt = ({
  completedAt,
  error,
  receiptId,
  record,
  status,
}: {
  completedAt: Date;
  error?: string;
  receiptId: string;
  record: BuildModeScheduledAutomationRecord;
  status: "failed" | "skipped";
}): BuildModeCommandReceipt => {
  const commandId = record.commandId ?? `cmd-automation-${record.id}`;
  const summary =
    status === "skipped"
      ? `Scheduled automation ${record.id} skipped: ${error ?? "No runnable workflow command was available"}. Next run: ${record.nextRunAt ?? "not scheduled"}.`
      : `Scheduled automation ${record.id} failed before completion: ${error ?? "Unknown error"}. Next run: ${record.nextRunAt ?? "not scheduled"}.`;
  return {
    id: receiptId,
    commandId,
    capabilityId: "automation.schedule",
    status: "failed",
    approved: true,
    requiresApproval: false,
    summary,
    createdAt: completedAt.toISOString(),
    executionMode: "operator-handoff",
    nextOperatorAction: status === "skipped" ? "revise" : "inspect",
    operatorActionSummary:
      status === "skipped"
        ? "Attach a workflow command to this scheduled automation or revise the schedule before the next run."
        : "Inspect the failed scheduled automation receipt, repair the workflow command or environment, then let the next scheduled run proceed.",
    policyDecision: "allow",
    policyReasons: ["Build Mode scheduled automation run attempt."],
    scope:
      record.tenantId && record.principalId && record.workspaceRoot
        ? {
            tenantId: record.tenantId,
            principalId: record.principalId,
            roles: ["Owner", "BuildOperator"],
            workspaceRoot: record.workspaceRoot,
            policyRefs: ["build-mode:scheduled-automation"],
          }
        : undefined,
    artifacts: [
      {
        id: `${receiptId}-artifact-1`,
        kind: "workflow_receipt",
        title: `Automation ${status} run receipt`,
        uri: `valoride://build-mode/automations/${encodeURIComponent(record.id)}/runs/${encodeURIComponent(receiptId)}`,
        commandId,
        receiptId,
        summary,
        metadata: {
          automationRunStatus: status,
          error,
          nextRunAt: record.nextRunAt,
          schedule: record.schedule,
          scheduleId: record.id,
          workflowCommandId: record.workflowCommandId,
          workflowRef: record.workflowRef,
        },
        createdAt: completedAt.toISOString(),
      },
    ],
  };
};

const redactScheduledCommandSnapshot = (
  command: BuildModeCommand,
): BuildModeCommand => ({
  ...command,
  command: redactCommandSecrets(command.command),
});

const createScheduleId = (
  taskId: string,
  workflowRef: string,
  schedule: string,
): string =>
  `automation-${stableHash(`${taskId}:${workflowRef}:${schedule}`).slice(0, 12)}`;

const stableHash = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const computeNextRunAt = (
  schedule: string,
  from: Date,
): string | undefined => {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    return undefined;
  }
  const minute = parseCronNumber(parts[0], 0, 59);
  const hour = parseCronNumber(parts[1], 0, 23);
  if (minute === undefined || hour === undefined) {
    return undefined;
  }

  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hour, minute, 0, 0);
  if (next <= from) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
};

const parseCronNumber = (
  value: string,
  min: number,
  max: number,
): number | undefined => {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return parsed >= min && parsed <= max ? parsed : undefined;
};
