import {
  authorizeCanonicalSwarmApproval,
  buildSwarmRuntimeOutcome,
  classifySwarmTerminalStatus,
  extractSwarmInboundCommandContext,
  normalizeServerStampedSwarmMessage,
  SWARM_RUNTIME_OUTCOME_SCHEMA_VERSION,
  SwarmOutcomeHandoffLedger,
  wrapSwarmRuntimeOutcome,
} from "./SwarmRuntimeOutcome";
import {
  SwarmEntityType,
  SwarmMessageType,
  type SwarmMessage,
} from "@shared/swarm-protocol";
import { AgenticCommandBus } from "../agentic/CommandBus";
import {
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "../agentic/CapabilityRegistry";

const localInstanceId = "valoride-agent-1";
const fixedTime = "2026-08-08T01:02:03.000Z";
const actionDigest = `sha256:${"a".repeat(64)}`;
const scopeDigest = `sha256:${"b".repeat(64)}`;
const approvalRef = `gm_approval_${"c".repeat(64)}`;

const approvalProof = {
  approvalRef,
  approvedDigest: actionDigest,
  approverPrincipalId: "principal-human-overseer",
  checkpointId: "checkpoint-waiting-approval",
  decidedAt: "2026-08-08T01:01:00.000Z",
  decision: "APPROVED",
  scopeDigest,
  signature: "server-signature",
} as const;

const makeCommand = (metadata: Record<string, unknown> = {}): SwarmMessage => ({
  from: {
    instanceId: "api-0",
    type: SwarmEntityType.SERVER,
  },
  id: "command-1",
  payload: {
    action: "valor.execute",
    data: { instruction: "Run the governed task" },
    metadata: {
      actionDigest,
      approvalProof,
      checkpointId: "checkpoint-waiting-approval",
      commandId: "command-1",
      correlationId: "correlation-1",
      goalId: "goal-1",
      idempotencyKey: "idempotency-1",
      scopeDigest,
      sessionId: "session-1",
      taskId: "task-1",
      trajectoryId: "trajectory-1",
      workflowExecutionRef: "workflow-execution-1",
      workflowVersionId: "workflow-version-1",
      ...metadata,
    },
  },
  timestamp: fixedTime,
  to: {
    instanceId: localInstanceId,
    type: SwarmEntityType.AGENT,
  },
  type: SwarmMessageType.COMMAND,
});

describe("SWARM runtime terminal outcomes", () => {
  it("classifies an explicit blocker as BLOCKED even with exit code zero", () => {
    expect(
      classifySwarmTerminalStatus({
        blocked: true,
        exitCode: 0,
        succeeded: true,
      }),
    ).toBe("BLOCKED");
  });

  it("classifies explicit failure and explicit success without guessing", () => {
    expect(
      classifySwarmTerminalStatus({
        exitCode: 0,
        explicitFailure: true,
      }),
    ).toBe("FAILED");
    expect(
      classifySwarmTerminalStatus({
        exitCode: 0,
        succeeded: true,
      }),
    ).toBe("SUCCEEDED");
    expect(classifySwarmTerminalStatus({ exitCode: 0 })).toBe(
      "OUTCOME_UNCERTAIN",
    );
    expect(
      classifySwarmTerminalStatus({
        exitCode: 0,
        outcomeUncertain: true,
        succeeded: true,
      }),
    ).toBe("OUTCOME_UNCERTAIN");
  });

  it("fails closed when approval or server-owned digest bindings are absent", () => {
    const noApproval = makeCommand({ approvalProof: undefined });
    const noApprovalContext = extractSwarmInboundCommandContext(
      noApproval,
      localInstanceId,
    );
    expect(
      authorizeCanonicalSwarmApproval(noApproval, noApprovalContext),
    ).toMatchObject({
      approved: false,
      code: "ERR_APPROVAL_REQUIRED",
      status: "WAITING_APPROVAL",
    });

    const missingScope = makeCommand({ scopeDigest: undefined });
    const missingScopeContext = extractSwarmInboundCommandContext(
      missingScope,
      localInstanceId,
    );
    expect(missingScopeContext.correlation.scopeDigest).toBeUndefined();
    expect(
      authorizeCanonicalSwarmApproval(missingScope, missingScopeContext),
    ).toMatchObject({
      approved: false,
      code: "ERR_GOVERNED_BINDING_REQUIRED",
      status: "WAITING_APPROVAL",
    });
  });

  it("accepts identical server stamps from command/data shapes and rejects conflicts", () => {
    const unstampedPayload = makeCommand({
      actionDigest: undefined,
      scopeDigest: undefined,
    });
    const normalized = normalizeServerStampedSwarmMessage(unstampedPayload, [
      {
        actionDigest,
        metadata: { scopeDigest },
      },
      {
        data: {
          metadata: {
            actionDigest,
            scopeDigest,
          },
        },
      },
    ]);
    const normalizedContext = extractSwarmInboundCommandContext(
      normalized,
      localInstanceId,
    );
    expect(normalizedContext.correlation).toMatchObject({
      actionDigest,
      scopeDigest,
    });
    expect(
      authorizeCanonicalSwarmApproval(normalized, normalizedContext),
    ).toMatchObject({ approved: true });

    const conflicted = normalizeServerStampedSwarmMessage(makeCommand(), [
      { actionDigest: `sha256:${"d".repeat(64)}` },
    ]);
    const conflictedContext = extractSwarmInboundCommandContext(
      conflicted,
      localInstanceId,
    );
    expect(conflicted.payload.metadata?.bindingConflict).toEqual([
      "actionDigest",
    ]);
    expect(conflictedContext.correlation.actionDigest).toBeUndefined();
    expect(
      authorizeCanonicalSwarmApproval(conflicted, conflictedContext),
    ).toMatchObject({
      approved: false,
      code: "ERR_GOVERNED_BINDING_REQUIRED",
      status: "WAITING_APPROVAL",
    });
  });

  it("maps an explicit human denial to BLOCKED and accepts only exact proof", () => {
    const denied = makeCommand({
      approvalProof: { ...approvalProof, decision: "DENIED" },
    });
    const deniedContext = extractSwarmInboundCommandContext(
      denied,
      localInstanceId,
    );
    expect(
      authorizeCanonicalSwarmApproval(denied, deniedContext),
    ).toMatchObject({
      approved: false,
      approvalRef,
      code: "ERR_APPROVAL_REJECTED",
      status: "BLOCKED",
    });

    const approved = makeCommand();
    const approvedContext = extractSwarmInboundCommandContext(
      approved,
      localInstanceId,
    );
    expect(
      authorizeCanonicalSwarmApproval(approved, approvedContext),
    ).toMatchObject({
      approved: true,
      approvalRef,
    });
  });

  it("keeps the existing CommandBus handler closed when canonical approval is refused", async () => {
    const message = makeCommand({ approvalProof: undefined });
    const context = extractSwarmInboundCommandContext(message, localInstanceId);
    const handler = jest.fn(async () => ({ status: "started" }));
    const bus = new AgenticCommandBus({
      approve: () => {
        const authorization = authorizeCanonicalSwarmApproval(message, context);
        return {
          approved: authorization.approved,
          reason: authorization.reason,
        };
      },
      capabilities: new CapabilityRegistry(createDefaultValorCapabilities()),
    });
    bus.registerHandler("swarm.command", handler);

    const result = await bus.execute({
      capabilityId: "swarm.command",
      correlationId: context.correlation.correlationId,
      id: context.correlation.commandId,
      payload: { context, message },
      source: "swarm",
    });

    expect(result.status).toBe("rejected");
    expect(handler).not.toHaveBeenCalled();
  });

  it("emits the canonical nested result.outcome contract deterministically", () => {
    const context = extractSwarmInboundCommandContext(
      makeCommand(),
      localInstanceId,
    );
    const build = () =>
      buildSwarmRuntimeOutcome({
        completedAt: fixedTime,
        correlation: context.correlation,
        evidenceRefs: ["valoride-task:local-1", "valoride-task:local-1"],
        localTaskId: "local-1",
        startedAt: "2026-08-08T01:01:30.000Z",
        status: "SUCCEEDED",
        summary: "Governed task completed.",
      });
    const first = build();
    const second = build();

    expect(wrapSwarmRuntimeOutcome(first)).toEqual({
      result: { outcome: first },
    });
    expect(first).toMatchObject({
      actionDigest,
      commandId: "command-1",
      confidence: "EXPLICIT",
      evidenceRefs: ["valoride-task:local-1"],
      schemaVersion: SWARM_RUNTIME_OUTCOME_SCHEMA_VERSION,
      scopeDigest,
      source: "runtime-envelope",
      status: "SUCCEEDED",
      targetInstanceId: localInstanceId,
    });
    expect(first.outcomeHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(second.outcomeHash).toBe(first.outcomeHash);
  });

  it("deduplicates live correlation and preserves restart-safe handoff closure", () => {
    const correlation = extractSwarmInboundCommandContext(
      makeCommand(),
      localInstanceId,
    ).correlation;
    const ledger = new SwarmOutcomeHandoffLedger();
    expect(ledger.accept(correlation, fixedTime).kind).toBe("accepted");
    ledger.markRunning(
      correlation.commandId,
      "2026-08-08T01:02:04.000Z",
      "local-task-1",
    );
    expect(ledger.accept(correlation, fixedTime)).toMatchObject({
      kind: "duplicate-active",
      handoff: {
        localTaskId: "local-task-1",
        state: "RUNNING",
      },
    });

    const restarted = new SwarmOutcomeHandoffLedger(ledger.getSnapshot());
    const recovered = restarted.recoverUnfinished("2026-08-08T01:03:00.000Z");
    expect(recovered).toHaveLength(1);
    expect(recovered[0]).toMatchObject({
      commandId: "command-1",
      retryable: true,
      status: "OUTCOME_UNCERTAIN",
    });
    expect(restarted.listActive()).toEqual([]);
    expect(restarted.accept(correlation, fixedTime)).toMatchObject({
      kind: "duplicate-terminal",
      outcome: { outcomeHash: recovered[0].outcomeHash },
    });
  });
});
