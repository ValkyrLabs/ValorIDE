jest.mock("../../core/webview", () => ({
  WebviewProvider: {
    getAllInstances: jest.fn(() => []),
  },
}));
jest.mock("p-wait-for", () => jest.fn(async () => undefined));
jest.mock("@core/storage/state", () => ({
  ...jest.requireActual("@core/storage/state"),
  getAllExtensionState: jest.fn(async () => ({ apiConfiguration: {} })),
}));
// This retained unit isolates task/chat handoff. The companion inference tests
// exercise configuration retrieval, proof checking and per-request revocation.
jest.mock("../swarm/SwarmCodingInference", () => ({
  ...jest.requireActual("../swarm/SwarmCodingInference"),
  resolveInboundGovernedCodingTask: jest.fn(),
}));
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
import * as vscode from "vscode";
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

  it("serializes overlapping startup and manual SWARM initialization", async () => {
    const state = jest.requireMock("@core/storage/state");
    state.getAllExtensionState.mockResolvedValue({
      apiConfiguration: { valkyraiHost: "https://core.native-unit.invalid" },
    });
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.ensureInstanceId = jest.fn(async () => localInstanceId);
    coordinator.restoreOutcomeHandoffs = jest.fn(async () => undefined);
    coordinator.setSwarmState = jest.fn();
    coordinator.setupGitTelemetry = jest.fn(async () => undefined);
    coordinator.registerCommands = jest.fn();

    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let markFirstEntered!: () => void;
    const firstEntered = new Promise<void>((resolve) => {
      markFirstEntered = resolve;
    });
    let calls = 0;
    let active = 0;
    let maxActive = 0;
    coordinator.ensureMothership = jest.fn(async () => {
      calls += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (calls === 1) {
        markFirstEntered();
        await firstBlocked;
      }
      active -= 1;
    });

    const startup = coordinator.initialize("startup-token", {
      id: "principal-1",
    });
    await firstEntered;
    const manualRetry = coordinator.initialize("manual-token", {
      id: "principal-1",
    });
    await Promise.resolve();

    expect(coordinator.ensureMothership).toHaveBeenCalledTimes(1);
    expect(maxActive).toBe(1);
    releaseFirst();
    await Promise.all([startup, manualRetry]);

    expect(coordinator.ensureMothership).toHaveBeenCalledTimes(2);
    expect(maxActive).toBe(1);
    expect(coordinator.getInstanceId()).toBe(localInstanceId);
    expect(coordinator.setupGitTelemetry).toHaveBeenCalledTimes(1);
    expect(coordinator.registerCommands).toHaveBeenCalledTimes(1);
  });

  it("derives the same durable fallback identity across concurrent activation contexts", async () => {
    (vscode.env as any).machineId = "stable-machine-identity";
    const updates: string[] = [];
    const makeContext = () => ({
      extension: {
        id: "ValkyrLabsInc.valoride-dev",
        packageJSON: { version: "test" },
      },
      globalStorageUri: {
        fsPath: "/profiles/company-runner/globalStorage/valoride",
        toString: () =>
          "file:///profiles/company-runner/globalStorage/valoride",
      },
      globalState: {
        get: jest.fn(async () => undefined),
        update: jest.fn(async (_key: string, value: string) => {
          updates.push(value);
        }),
      },
      subscriptions: [],
    });
    const first = new AgentRuntimeCoordinator(makeContext() as any) as any;
    const second = new AgentRuntimeCoordinator(makeContext() as any) as any;

    const [firstId, secondId] = await Promise.all([
      first.ensureInstanceId(),
      second.ensureInstanceId(),
    ]);

    expect(firstId).toBe(secondId);
    expect(firstId).toMatch(/^valoride-stable-[0-9a-f]{8}$/);
    expect(updates).toEqual([firstId, firstId]);
  });

  it("rebinds the mothership when canonical runner identity changes", async () => {
    const { MothershipService } = jest.requireActual("./MothershipService");
    const connect = jest
      .spyOn(MothershipService.prototype, "connect")
      .mockResolvedValue(undefined);
    try {
      const coordinator = new AgentRuntimeCoordinator(context) as any;
      const disconnect = jest.fn();
      coordinator.mothership = {
        disconnect,
        isConnected: () => true,
        removeAllListeners: jest.fn(),
      };
      coordinator.mothershipBaseUrl = "https://core.native-unit.invalid";
      coordinator.mothershipInstanceId = "valoride-old";
      coordinator.swarmTransport = { dispose: jest.fn() };
      coordinator.stopHeartbeat = jest.fn();

      await coordinator.ensureMothership({
        baseUrl: "https://core.native-unit.invalid",
        instanceId: "valoride-current",
        jwtToken: "unit-token",
        userId: "principal-1",
      });

      expect(disconnect).toHaveBeenCalledTimes(1);
      expect(coordinator.mothershipInstanceId).toBe("valoride-current");
      expect(coordinator.mothership).not.toBeNull();
      expect(connect).toHaveBeenCalledTimes(1);
      coordinator.disposeMothershipConnection();
    } finally {
      connect.mockRestore();
    }
  });

  it("converts a legacy governed coding command to its exact reviewed data without nesting the binding", () => {
    const coordinator = Object.create(AgentRuntimeCoordinator.prototype) as any;
    coordinator.instanceId = localInstanceId;
    const reviewedData = {
      instruction: "Run the governed task",
      images: ["data:image/png;base64,explicit-native-unit-fixture"],
      governedCodingInference: {
        schemaVersion: "workflow-governed-coding-inference/v1",
        toolCallId: "reviewed-call",
      },
    };
    const incoming = coordinator.toInboundSwarmCommand(
      {
        id: "legacy-command",
        type: "filesystem.write",
        targetInstanceId: localInstanceId,
      },
      { data: reviewedData, metadata: { actionDigest, scopeDigest } },
    ) as SwarmMessage;
    expect(incoming.payload.data).toEqual(reviewedData);
    expect(incoming.payload.data).not.toHaveProperty("data");
    expect(incoming.payload.metadata).toMatchObject({
      commandId: "legacy-command",
      actionDigest,
      scopeDigest,
    });
    expect(
      coordinator.extractRemoteTaskText(
        "filesystem.write",
        incoming.payload.data,
      ),
    ).toBe(reviewedData.instruction);
  });

  it("preserves ordinary legacy conversion even when ordinary data resembles a coding binding", () => {
    const coordinator = Object.create(AgentRuntimeCoordinator.prototype) as any;
    coordinator.instanceId = localInstanceId;
    const payload = {
      data: { governedCodingInference: { unrelated: true } },
      message: "Inspect the runtime",
    };
    const incoming = coordinator.toInboundSwarmCommand(
      {
        id: "ordinary-command",
        type: "chat.send",
        targetInstanceId: localInstanceId,
      },
      payload,
    ) as SwarmMessage;
    expect(incoming.payload.data).toEqual(payload);
    expect(incoming.payload.data).toHaveProperty(
      "data.governedCodingInference.unrelated",
      true,
    );
  });

  it("preserves canonical SwarmMessage data while applying the server command identity", () => {
    const coordinator = Object.create(AgentRuntimeCoordinator.prototype) as any;
    coordinator.instanceId = localInstanceId;
    const canonical = makeCommand();
    canonical.payload.data.governedCodingInference = {
      schemaVersion: "workflow-governed-coding-inference/v1",
    };
    const incoming = coordinator.toInboundSwarmCommand(
      { id: "server-command", type: "valor.execute", raw: canonical },
      canonical.payload,
    ) as SwarmMessage;
    expect(incoming.id).toBe("server-command");
    expect(incoming.payload.data).toEqual(canonical.payload.data);
  });

  for (const status of ["SUCCEEDED", "FAILED", "OUTCOME_UNCERTAIN"]) {
    it(`persists ${status} before publishing its exact outcome over the canonical command transport`, async () => {
      const { MothershipService } = jest.requireActual("./MothershipService");
      const mothership = new MothershipService({
        instanceId: localInstanceId,
        userId: "fixture-user",
        jwtToken: "fixture-token",
      }) as any;
      const publish = jest.fn();
      mothership.connected = true;
      mothership.stompClient = { connected: true, publish };
      const coordinator = new AgentRuntimeCoordinator(context) as any;
      coordinator.instanceId = localInstanceId;
      coordinator.mothership = mothership;
      coordinator.setSwarmState = jest.fn();
      const correlation = extractSwarmInboundCommandContext(
        makeCommand(),
        localInstanceId,
      ).correlation;
      const outcome = await coordinator.closeSwarmAssignment({
        completedAt: "2026-08-08T01:03:00.000Z",
        startedAt: "2026-08-08T01:02:03.000Z",
        correlation,
        status,
        confidence: status === "OUTCOME_UNCERTAIN" ? "UNRESOLVED" : "EXPLICIT",
        source: "runtime-envelope",
        summary: "Observed terminal result",
        localTaskId: "local-task-1",
        evidenceRefs: ["valoride-checkpoint:" + "a".repeat(40)],
      });
      expect(context.globalState.update).toHaveBeenCalledWith(
        "valorideSwarmOutcomeHandoffs",
        expect.objectContaining({
          outcomes: { "command-1": outcome },
        }),
      );
      expect(publish).toHaveBeenCalledTimes(1);
      expect(
        context.globalState.update.mock.invocationCallOrder[0],
      ).toBeLessThan(publish.mock.invocationCallOrder[0]);
      expect(publish.mock.calls[0][0].destination).toBe("/app/command");
      const payload = JSON.parse(
        JSON.parse(publish.mock.calls[0][0].body).payload,
      );
      expect(payload).toMatchObject({
        type: "ACK",
        ackId: "command-1",
        commandId: "command-1",
        targetInstanceId: localInstanceId,
        status: status.toLowerCase(),
        result: { outcome },
      });
      publish.mockClear();
      coordinator.replayDurableOutcomes();
      expect(publish).toHaveBeenCalledTimes(1);
      expect(
        JSON.parse(JSON.parse(publish.mock.calls[0][0].body).payload),
      ).toEqual(payload);
    });
  }

  it("retains a disconnected outcome for unchanged replay when the canonical connection returns", async () => {
    const { MothershipService } = jest.requireActual("./MothershipService");
    const mothership = new MothershipService({
      instanceId: localInstanceId,
      jwtToken: "fixture-token",
    }) as any;
    const publish = jest.fn();
    mothership.connected = false;
    mothership.stompClient = { connected: false, publish };
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    coordinator.mothership = mothership;
    coordinator.setSwarmState = jest.fn();
    const outcome = await coordinator.closeSwarmAssignment({
      completedAt: "2026-08-08T01:03:00.000Z",
      startedAt: "2026-08-08T01:02:03.000Z",
      correlation: extractSwarmInboundCommandContext(
        makeCommand(),
        localInstanceId,
      ).correlation,
      status: "SUCCEEDED",
      source: "runtime-envelope",
      confidence: "EXPLICIT",
      summary: "Verified before disconnection",
      evidenceRefs: ["valoride-checkpoint:" + "b".repeat(40)],
    });
    expect(publish).not.toHaveBeenCalled();
    expect(
      coordinator.getDurableOutcomeHandoffs().outcomes["command-1"],
    ).toEqual(outcome);
    mothership.connected = true;
    mothership.stompClient.connected = true;
    coordinator.replayDurableOutcomes();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(JSON.parse(publish.mock.calls[0][0].body).payload).result
        .outcome,
    ).toEqual(outcome);
  });

  it("returns the durable terminal outcome for the same approved command without starting a second task", async () => {
    const coordinator = new AgentRuntimeCoordinator(context) as any;
    coordinator.instanceId = localInstanceId;
    coordinator.persistOutcomeHandoffs = jest.fn(async () => undefined);
    coordinator.emitRuntimeOutcome = jest.fn();
    coordinator.setSwarmState = jest.fn();
    coordinator.startInboundSwarmTask = jest.fn(async () => ({
      status: "started",
    }));
    const command = makeCommand({ approvalRequired: false });
    const correlation = extractSwarmInboundCommandContext(
      command,
      localInstanceId,
    ).correlation;
    coordinator.outcomeHandoffLedger.accept(
      correlation,
      "2026-08-08T01:02:03.000Z",
    );
    const outcome = await coordinator.closeSwarmAssignment({
      completedAt: "2026-08-08T01:03:00.000Z",
      confidence: "EXPLICIT",
      correlation,
      evidenceRefs: ["valoride-checkpoint:durable-terminal-proof"],
      localTaskId: "local-task-1",
      source: "runtime-envelope",
      startedAt: "2026-08-08T01:02:04.000Z",
      status: "SUCCEEDED",
      summary: "The governed task completed once.",
    });
    coordinator.emitRuntimeOutcome.mockClear();

    const response = await coordinator.executeInboundSwarmCommand(command);

    expect(response).toEqual({
      action: "valor.execute",
      commandId: "command-1",
      duplicate: true,
      outcome,
      status: "terminal-replayed",
    });
    expect(coordinator.startInboundSwarmTask).not.toHaveBeenCalled();
    expect(coordinator.emitRuntimeOutcome).toHaveBeenCalledTimes(1);
    expect(coordinator.emitRuntimeOutcome).toHaveBeenCalledWith(outcome);
  });

  it("replays durable outcomes only after registration has been acknowledged", async () => {
    const { SwarmNodeService } = jest.requireActual(
      "../swarm/SwarmNodeService",
    );
    let acknowledge!: (value: any) => void;
    const registration = jest
      .spyOn(SwarmNodeService.prototype, "register")
      .mockReturnValue(
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
      );
    try {
      const coordinator = new AgentRuntimeCoordinator(context) as any;
      coordinator.instanceId = localInstanceId;
      coordinator.mothership = { isConnected: () => true };
      coordinator.swarmTransport = {};
      coordinator.setSwarmState = jest.fn();
      coordinator.startHeartbeat = jest.fn();
      coordinator.replayDurableOutcomes = jest.fn();
      const pending = coordinator.performSwarmRegistration();
      await Promise.resolve();
      expect(registration).toHaveBeenCalledTimes(1);
      expect(coordinator.replayDurableOutcomes).not.toHaveBeenCalled();
      acknowledge({ type: SwarmMessageType.ACK });
      await pending;
      expect(coordinator.replayDurableOutcomes).toHaveBeenCalledTimes(1);
    } finally {
      registration.mockRestore();
    }
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

  it("maps verification-only command evidence to SUCCEEDED without a file checkpoint", async () => {
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
      evidenceRefs: [`valoride-command:${"c".repeat(64)}`],
      kind: "completed",
      source: "runtime-envelope",
      summary: "The approved verification command passed.",
      taskId: "local-task-1",
    });

    expect(coordinator.closeSwarmAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: "EXPLICIT",
        evidenceRefs: [`valoride-command:${"c".repeat(64)}`],
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
    const state = jest.requireMock("@core/storage/state");
    state.getAllExtensionState.mockResolvedValueOnce({
      apiConfiguration: { valkyraiHost: "https://core.native-unit.invalid" },
    });
    const { TokenStorageService } = jest.requireActual(
      "../auth/TokenStorageService",
    );
    const tokenStorage = jest
      .spyOn(TokenStorageService, "getInstance")
      .mockReturnValue({
        getJwtToken: jest.fn(async () => "explicit-native-unit-token"),
      });
    const { resolveInboundGovernedCodingTask } = jest.requireMock(
      "../swarm/SwarmCodingInference",
    );
    const admittedConfiguration = {
      apiProvider: "lmstudio",
      lmStudioModelId: "explicit-unit-model",
    };
    resolveInboundGovernedCodingTask.mockResolvedValueOnce(
      admittedConfiguration,
    );

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
      admittedConfiguration,
    );
    expect(resolveInboundGovernedCodingTask).toHaveBeenCalledWith(
      "https://core.native-unit.invalid",
      expect.any(Function),
      localInstanceId,
      message,
      inboundContext,
    );
    expect(
      resolveInboundGovernedCodingTask.mock.invocationCallOrder[0],
    ).toBeLessThan(controller.initTask.mock.invocationCallOrder[0]);
    tokenStorage.mockRestore();
  });
});
