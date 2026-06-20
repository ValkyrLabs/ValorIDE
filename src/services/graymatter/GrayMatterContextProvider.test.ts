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
    const queryMemory = jest
      .fn()
      .mockResolvedValueOnce({
        results: [
          {
            content: "Rule: Use generated ThorAPI services for ACL behavior.",
            id: "invariant-1",
            tags: ["scope:organization", "invariant", "acl", "thorapi"],
            type: "decision",
          },
        ],
      })
      .mockResolvedValueOnce({
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
      });

    const result = await provider.getContextForPrompt(
      "React form validation",
      baseConfig(queryMemory),
    );

    expect(queryMemory).toHaveBeenNthCalledWith(1, {
      limit: 12,
      query: expect.stringContaining("invariant decision methodology"),
    });
    expect(queryMemory).toHaveBeenNthCalledWith(2, {
      limit: 24,
      query: "React form validation",
    });
    expect(result?.formattedBlock).toContain("## Remembered Context");
    expect(result?.formattedBlock).toContain("[gm:invariant-1] decision");
    expect(result?.formattedBlock).toContain("### project");
    expect(result?.formattedBlock).toContain("[gm:project-1] decision");
    expect(result?.formattedBlock).toContain("### user");
    expect(result?.fromScopes).toEqual(["organization", "project", "user"]);
  });

  it("keeps invariant decisions when the ordinary context query also returns them", async () => {
    const provider = new GrayMatterContextProvider(undefined, () => 1000);
    const invariant = {
      content: "Rule: Never hand-edit generated ThorAPI clients.",
      id: "invariant-1",
      tags: ["scope:project", "invariant", "generated-code"],
      type: "decision",
    };
    const queryMemory = jest
      .fn()
      .mockResolvedValueOnce({ results: [invariant] })
      .mockResolvedValueOnce({
        results: [
          invariant,
          {
            content: "Use Vitest for webview tests.",
            id: "project-2",
            tags: ["scope:project"],
            type: "context",
          },
        ],
      });

    const result = await provider.getContextForPrompt(
      "generated clients",
      baseConfig(queryMemory),
    );

    expect(result?.entriesUsed).toBe(2);
    expect(result?.formattedBlock.match(/invariant-1/g)?.length).toBe(1);
    expect(result?.formattedBlock.indexOf("invariant-1")).toBeLessThan(
      result?.formattedBlock.indexOf("project-2") ?? Number.MAX_SAFE_INTEGER,
    );
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
