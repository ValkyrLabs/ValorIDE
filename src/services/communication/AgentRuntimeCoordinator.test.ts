jest.mock("../../core/webview", () => ({
  WebviewProvider: {
    getAllInstances: jest.fn(() => []),
  },
}));
jest.mock("p-wait-for", () => jest.fn(async () => undefined));
jest.mock("../logging/Logger", () => ({
  Logger: {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  SwarmEntityType,
  SwarmMessageType,
  type SwarmMessage,
} from "@shared/swarm-protocol";
import { extractSwarmInboundCommandContext } from "../swarm/SwarmRuntimeOutcome";

// This suite uses the repository's esbuild Jest transform, which does not hoist
// jest.mock calls. Keep the coordinator load after the webview and ESM-only
// dependency mocks above so the focused contract lane stays isolated.
let AgentRuntimeCoordinator: typeof import("./AgentRuntimeCoordinator").default;

beforeAll(async () => {
  const loaded = await import("./AgentRuntimeCoordinator");
  AgentRuntimeCoordinator = ((loaded.default as any)?.default ??
    loaded.default) as typeof AgentRuntimeCoordinator;
});

const localInstanceId = "valoride-agent-1";
const actionDigest = `sha256:${"a".repeat(64)}`;
const scopeDigest = `sha256:${"b".repeat(64)}`;

const context = {
  extension: { packageJSON: { version: "test" } },
  globalState: {
    get: jest.fn(),
    update: jest.fn(async () => undefined),
  },
  subscriptions: [],
} as any;

const makeCommand = (metadata: Record<string, unknown> = {}): SwarmMessage => ({
  from: { instanceId: "api-0", type: SwarmEntityType.SERVER },
  id: "command-1",
  payload: {
    action: "valor.execute",
    data: { instruction: "Run the governed task" },
    metadata: {
      actionDigest,
      checkpointId: "checkpoint-1",
      commandId: "command-1",
      correlationId: "correlation-1",
      idempotencyKey: "idempotency-1",
      scopeDigest,
      sessionId: "session-1",
      ...metadata,
    },
  },
  timestamp: "2026-08-08T01:02:03.000Z",
  to: { instanceId: localInstanceId, type: SwarmEntityType.AGENT },
  type: SwarmMessageType.COMMAND,
});

describe("AgentRuntimeCoordinator governed SWARM routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes missing canonical approval through CommandBus and never starts initTask", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    coordinator.persistOutcomeHandoffs = jest.fn(async () => undefined);
    coordinator.emitRuntimeOutcome = jest.fn();
    coordinator.setSwarmState = jest.fn();
    coordinator.startInboundSwarmTask = jest.fn(async () => ({
      status: "started",
    }));

    const response = await coordinator.executeInboundSwarmCommand(
      makeCommand({ approvalProof: undefined }),
    );

    expect(response).toMatchObject({
      outcome: { status: "WAITING_APPROVAL" },
      status: "terminal",
    });
    expect(coordinator.startInboundSwarmTask).not.toHaveBeenCalled();
  });

  it("rejects missing server binding before creating a durable assignment or task", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    coordinator.startInboundSwarmTask = jest.fn(async () => ({
      status: "started",
    }));

    const response = await coordinator.executeInboundSwarmCommand(
      makeCommand({ scopeDigest: undefined }),
    );

    expect(response).toMatchObject({
      code: "ERR_GOVERNED_BINDING_REQUIRED",
      commandBusStatus: "rejected",
      status: "WAITING_APPROVAL",
    });
    expect(coordinator.startInboundSwarmTask).not.toHaveBeenCalled();
    expect(coordinator.getDurableOutcomeHandoffs().active).toEqual({});
  });

  it("never falls back to the direct webview lane for executable commands", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.tryHandleInboundSwarmCommand = jest.fn(async () => false);
    coordinator.forwardRemoteCommandToWebview = jest.fn();

    await coordinator.handleRemoteCommand({
      id: "command-1",
      payload: { instruction: "run" },
      sourceInstanceId: "api-0",
      targetInstanceId: localInstanceId,
      type: "valor.execute",
    });

    expect(coordinator.tryHandleInboundSwarmCommand).toHaveBeenCalledTimes(1);
    expect(coordinator.forwardRemoteCommandToWebview).not.toHaveBeenCalled();
  });

  it("does not treat a local task id as success proof", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    const correlation = extractSwarmInboundCommandContext(
      makeCommand(),
      localInstanceId,
    ).correlation;
    coordinator.outcomeHandoffLedger.accept(
      correlation,
      "2026-08-08T01:02:03.000Z",
    );
    coordinator.closeSwarmAssignment = jest.fn(async () => ({}));

    await coordinator.completeSwarmTaskFromLifecycle("command-1", {
      completedAt: "2026-08-08T01:03:00.000Z",
      confidence: "EXPLICIT",
      kind: "completed",
      source: "runtime-envelope",
      summary: "Claimed completion without a machine evidence carrier.",
      taskId: "local-task-1",
    });

    expect(coordinator.closeSwarmAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: "UNRESOLVED",
        evidenceRefs: undefined,
        localTaskId: "local-task-1",
        source: "legacy-classifier",
        status: "OUTCOME_UNCERTAIN",
      }),
    );
  });

  it("maps an explicit runtime completion with machine evidence to SUCCEEDED", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    const correlation = extractSwarmInboundCommandContext(
      makeCommand(),
      localInstanceId,
    ).correlation;
    coordinator.outcomeHandoffLedger.accept(
      correlation,
      "2026-08-08T01:02:03.000Z",
    );
    coordinator.closeSwarmAssignment = jest.fn(async () => ({}));

    await coordinator.completeSwarmTaskFromLifecycle("command-1", {
      completedAt: "2026-08-08T01:03:00.000Z",
      confidence: "EXPLICIT",
      evidenceRefs: ["valoride-checkpoint:abc123"],
      kind: "completed",
      source: "runtime-envelope",
      summary: "The requested artifact was created and verified.",
      taskId: "local-task-1",
    });

    expect(coordinator.closeSwarmAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: "EXPLICIT",
        evidenceRefs: ["valoride-checkpoint:abc123"],
        source: "runtime-envelope",
        status: "SUCCEEDED",
      }),
    );
  });

  it("binds a local task to the originating SWARM task chat before progress streams", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    coordinator.persistOutcomeHandoffs = jest.fn(async () => undefined);
    coordinator.setSwarmState = jest.fn();

    const message = makeCommand({ taskId: "originating-task-1" });
    const inboundContext = extractSwarmInboundCommandContext(
      message,
      localInstanceId,
    );
    coordinator.outcomeHandoffLedger.accept(
      inboundContext.correlation,
      "2026-08-08T01:02:03.000Z",
    );

    const controller: any = {
      initTask: jest.fn(async () => {
        controller.task = { taskId: "local-task-1" };
      }),
      onTaskTerminal: jest.fn(() => ({ dispose: jest.fn() })),
      task: undefined,
    };
    const { WebviewProvider } = jest.requireMock("../../core/webview") as {
      WebviewProvider: { getAllInstances: jest.Mock };
    };
    jest
      .mocked(WebviewProvider.getAllInstances)
      .mockReturnValue([{ controller } as any]);

    await coordinator.startInboundSwarmTask({
      payload: { context: inboundContext, message },
    });

    expect(controller.initTask).toHaveBeenCalledWith(
      "Run the governed task",
      undefined,
      undefined,
      {
        commandId: "command-1",
        correlationId: "correlation-1",
        sessionId: "session-1",
        taskId: "originating-task-1",
      },
    );
  });
});
