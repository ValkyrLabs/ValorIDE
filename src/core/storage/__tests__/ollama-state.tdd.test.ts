import { updateApiConfiguration } from "../state";

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

describe("Ollama extension state", () => {
  it("persists every Ollama runtime setting exposed in the settings UI", async () => {
    const { context, globalStateValues } = createContext();

    await updateApiConfiguration(context, {
      apiProvider: "ollama",
      ollamaModelId: "gemma4:26b",
      ollamaBaseUrl: "http://localhost:11434",
      ollamaApiOptionsCtxNum: "262144",
      ollamaRequestTimeout: "900000",
      ollamaKeepAlive: "30m",
      ollamaTemperature: "1",
      ollamaTopP: "0.95",
      ollamaTopK: "64",
      ollamaRepeatPenalty: "1.05",
      ollamaNumPredict: "8192",
      ollamaMirostat: "0",
    });

    expect(Object.fromEntries(globalStateValues.entries())).toMatchObject({
      ollamaModelId: "gemma4:26b",
      ollamaBaseUrl: "http://localhost:11434",
      ollamaApiOptionsCtxNum: "262144",
      ollamaRequestTimeout: "900000",
      ollamaKeepAlive: "30m",
      ollamaTemperature: "1",
      ollamaTopP: "0.95",
      ollamaTopK: "64",
      ollamaRepeatPenalty: "1.05",
      ollamaNumPredict: "8192",
      ollamaMirostat: "0",
    });
  });
});
