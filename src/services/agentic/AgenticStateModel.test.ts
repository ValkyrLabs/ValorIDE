import {
  appendCommandAudit,
  createAgenticCommandCenterState,
  updateSwarmState,
} from "./AgenticStateModel";
import { AgenticCapabilityCommandCenterState } from "@shared/AgenticState";
import { AgenticCommandResult } from "./CommandBus";

const baseResult: AgenticCommandResult = {
  audit: {
    approved: true,
    capabilityId: "terminal.execute",
    completedAt: "2026-05-13T18:00:01.000Z",
    requiresApproval: true,
    source: "swarm",
    startedAt: "2026-05-13T18:00:00.000Z",
  },
  commandId: "cmd-1",
  elapsedMs: 1000,
  status: "success",
  tool: {
    capabilityId: "terminal.execute",
    kind: "terminal",
    label: "Shell",
  },
};

describe("AgenticStateModel", () => {
  it("creates an offline command center state with stable defaults", () => {
    expect(createAgenticCommandCenterState()).toEqual({
      recentCommands: [],
      swarm: {
        status: "offline",
      },
    });
  });

  it("updates SWARM state without dropping existing command audit", () => {
    const state = appendCommandAudit(
      createAgenticCommandCenterState({ approvalPolicy: "ask" }),
      baseResult,
    );

    const updated = updateSwarmState(state, {
      capabilities: ["terminal.execute"],
      instanceId: "valoride-local-1",
      lastAckAt: "2026-05-13T18:00:02.000Z",
      status: "online",
    });

    expect(updated).toEqual({
      approvalPolicy: "ask",
      recentCommands: [
        {
          approved: true,
          capabilityId: "terminal.execute",
          commandId: "cmd-1",
          completedAt: "2026-05-13T18:00:01.000Z",
          elapsedMs: 1000,
          requiresApproval: true,
          source: "swarm",
          startedAt: "2026-05-13T18:00:00.000Z",
          status: "completed",
          toolLabel: "Shell",
        },
      ],
      swarm: {
        capabilities: ["terminal.execute"],
        instanceId: "valoride-local-1",
        lastAckAt: "2026-05-13T18:00:02.000Z",
        status: "online",
      },
    });
  });

  it("keeps the newest command audits first and caps the local UI list", () => {
    const state = Array.from({
      length: 25,
    }).reduce<AgenticCapabilityCommandCenterState>(
      (current, _value, index) =>
        appendCommandAudit(current, {
          ...baseResult,
          commandId: `cmd-${index}`,
          audit: {
            ...baseResult.audit,
            completedAt: `2026-05-13T18:00:${String(index).padStart(2, "0")}.000Z`,
          },
        }),
      createAgenticCommandCenterState(),
    );

    expect(state.recentCommands).toHaveLength(20);
    expect(state.recentCommands[0].commandId).toBe("cmd-24");
    expect(state.recentCommands.at(-1)?.commandId).toBe("cmd-5");
  });
});
