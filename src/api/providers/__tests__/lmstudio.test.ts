import { ApiHandlerOptions } from "@shared/api";
import type { LmStudioHandler as LmStudioHandlerType } from "../lmstudio";

const mockCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

const { LmStudioHandler } =
  jest.requireActual<typeof import("../lmstudio")>("../lmstudio");

describe("LmStudioHandler", () => {
  let handler: LmStudioHandlerType;

  beforeEach(() => {
    mockCreate.mockReset();
    const options: ApiHandlerOptions = {
      lmStudioModelId: "qwen/qwen3.8-27b",
      lmStudioBaseUrl: "http://localhost:1234",
    };
    handler = new LmStudioHandler(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("streams LM Studio reasoning fields into the thinking channel", async () => {
    mockCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield {
          choices: [{ delta: { reasoning_content: "Plan " } }],
        };
        yield {
          choices: [{ delta: { reasoning: "then verify" } }],
        };
        yield {
          choices: [{ delta: { content: "Done" } }],
        };
      },
    } as any);

    const result = [];

    for await (const chunk of handler.createMessage("System prompt", [
      { role: "user", content: "Test reasoning" },
    ])) {
      result.push(chunk);
    }

    expect(result).toEqual([
      { type: "reasoning", reasoning: "Plan " },
      { type: "reasoning", reasoning: "then verify" },
      { type: "text", text: "Done" },
    ]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen/qwen3.8-27b",
        stream: true,
      }),
    );
  });

  it("prefers the current reasoning field when both fields are present", async () => {
    mockCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield {
          choices: [
            {
              delta: {
                reasoning: "current",
                reasoning_content: "compatibility",
              },
            },
          ],
        };
      },
    } as any);

    const result = [];
    for await (const chunk of handler.createMessage("System prompt", [])) {
      result.push(chunk);
    }

    expect(result).toEqual([{ type: "reasoning", reasoning: "current" }]);
  });
});
