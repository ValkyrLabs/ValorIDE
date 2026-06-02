import * as vscode from "vscode";
import { getAllExtensionState } from "../state";
import { GrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";

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

describe("GrayMatter extension state", () => {
  beforeEach(() => {
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => ({
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    }));
  });

  it("posts GrayMatter session capability state to the webview state", async () => {
    const { context, globalStateValues } = createContext();
    const grayMatterSession: GrayMatterSessionState = {
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      capabilities: {
        agent: true,
        grayMatter: true,
        memoryEntry: true,
        memoryQuery: true,
        memoryRead: true,
        memoryWrite: true,
        project: true,
        projectObjectLink: true,
        swarmGraph: false,
        swarmOps: true,
      },
      checkedAt: "2026-05-13T12:00:00.000Z",
      status: "ready",
    };
    globalStateValues.set("grayMatterSession", grayMatterSession);

    const state = await getAllExtensionState(context);

    expect(state.grayMatterSession).toEqual(grayMatterSession);
  });
});
