import {
  extractOpenAiResponsesReasoningText,
  takeOpenAiResponsesEventsThroughCompletion,
} from "../openai-native-events";

describe("OpenAI native Responses reasoning summaries", () => {
  it("extracts streamed reasoning summary text deltas", () => {
    expect(
      extractOpenAiResponsesReasoningText({
        type: "response.reasoning_summary_text.delta",
        delta: "Checking the model registry",
      } as any),
    ).toBe("Checking the model registry");
  });

  it("extracts finalized reasoning summary text", () => {
    expect(
      extractOpenAiResponsesReasoningText({
        type: "response.reasoning_summary_text.done",
        text: "I looked for gpt-5.5 model support.",
      } as any),
    ).toBe("I looked for gpt-5.5 model support.");
  });

  it("extracts reasoning summary text from completed reasoning output items", () => {
    expect(
      extractOpenAiResponsesReasoningText({
        type: "response.output_item.done",
        item: {
          type: "reasoning",
          summary: [
            {
              type: "summary_text",
              text: "Found the Responses API stream path.",
            },
          ],
        },
      } as any),
    ).toBe("Found the Responses API stream path.");
  });
});

describe("OpenAI native Responses terminal events", () => {
  it("ends the ValorIDE stream immediately after response.completed", async () => {
    let consumedAfterCompletion = false;

    async function* responseEvents() {
      yield {
        type: "response.output_text.delta",
        delta: "Done",
      };
      yield {
        type: "response.completed",
        response: {
          usage: {
            input_tokens: 4,
            output_tokens: 1,
          },
        },
      };
      consumedAfterCompletion = true;
      yield {
        type: "error",
        message: "The terminal event should have stopped iteration.",
      };
    }

    const events = [];
    for await (const event of takeOpenAiResponsesEventsThroughCompletion(
      responseEvents(),
    )) {
      events.push(event);
    }

    expect(consumedAfterCompletion).toBe(false);
    expect(events).toEqual([
      {
        type: "response.output_text.delta",
        delta: "Done",
      },
      {
        type: "response.completed",
        response: {
          usage: {
            input_tokens: 4,
            output_tokens: 1,
          },
        },
      },
    ]);
  });
});
