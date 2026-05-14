import * as vscode from "vscode";
import { AgenticCapabilityCommandCenterState } from "@shared/AgenticState";
import { getAllExtensionState } from "../state";

function createContext() {
  const globalStateValues = new Map<string, any>();
  const secretValues = new Map<string, string>();

  return {
    context: {
      globalState: {
        update: jest.fn(async (key: string, value: any) => {
          globalStateValues.set(key, value);
        }),
        get: jest.fn(async (key: string) => globalStateValues.get(key)),
        keys: jest.fn(() => Array.from(globalStateValues.keys())),
      },
      secrets: {
        store: jest.fn(async (key: string, value: string) => {
          secretValues.set(key, value);
        }),
        delete: jest.fn(async (key: string) => {
          secretValues.delete(key);
        }),
        get: jest.fn(async (key: string) => secretValues.get(key)),
      },
      workspaceState: {
        update: jest.fn(),
        get: jest.fn(),
      },
    } as any,
    globalStateValues,
  };
}

describe("Agentic extension state", () => {
  beforeEach(() => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => ({
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    }));
  });

  it("posts SWARM status and command audit state to the webview state", async () => {
    const { context, globalStateValues } = createContext();
    const agenticState: AgenticCapabilityCommandCenterState = {
      approvalPolicy: "local-confirmation-required",
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
        capabilities: ["graymatter.memory", "terminal.execute"],
        instanceId: "valoride-local-1",
        lastAckAt: "2026-05-13T18:00:02.000Z",
        status: "online",
      },
    };
    globalStateValues.set("agenticState", agenticState);

    const state = await getAllExtensionState(context);

    expect(state.agenticState).toEqual(agenticState);
  });
});
