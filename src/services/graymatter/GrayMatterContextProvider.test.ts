import {
  GrayMatterContextProvider,
  GrayMatterContextConfig,
} from "./GrayMatterContextProvider";

const baseConfig = (
  queryMemory: GrayMatterContextConfig["queryMemory"],
): GrayMatterContextConfig => ({
  enabled: true,
  maxTokens: 400,
  queryMemory,
  scopes: ["project", "organization", "user"],
  timeoutMs: 3000,
});

describe("GrayMatterContextProvider", () => {
  it("formats scoped memories as a Remembered Context block", async () => {
    const provider = new GrayMatterContextProvider(undefined, () => 1000);
    const queryMemory = jest.fn(async () => ({
      results: [
        {
          content: "Use Zod for validation and never Yup.",
          id: "project-1",
          tags: ["scope:project", "project:abc"],
          type: "decision",
        },
        {
          content: "Prefer terse responses.",
          id: "user-1",
          tags: ["scope:user"],
          type: "preference",
        },
      ],
    }));

    const result = await provider.getContextForPrompt(
      "React form validation",
      baseConfig(queryMemory),
    );

    expect(queryMemory).toHaveBeenCalledWith({
      limit: 24,
      query: "React form validation",
    });
    expect(result?.formattedBlock).toContain("## Remembered Context");
    expect(result?.formattedBlock).toContain("### project");
    expect(result?.formattedBlock).toContain("[gm:project-1] decision");
    expect(result?.formattedBlock).toContain("### user");
    expect(result?.fromScopes).toEqual(["project", "user"]);
  });

  it("returns null when GrayMatter query fails so prompt generation can continue", async () => {
    const appendLine = jest.fn();
    const provider = new GrayMatterContextProvider({ appendLine });

    const result = await provider.getContextForPrompt(
      "anything",
      baseConfig(async () => {
        throw new Error("network down");
      }),
    );

    expect(result).toBeNull();
    expect(appendLine).toHaveBeenCalledWith(
      expect.stringContaining("Skipping context layer"),
    );
  });
});
