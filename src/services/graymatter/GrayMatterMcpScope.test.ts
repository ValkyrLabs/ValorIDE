import {
  deriveGrayMatterWorkspaceKey,
  scopeGrayMatterMcpArguments,
} from "./GrayMatterMcpScope";

describe("GrayMatter MCP workspace scoping", () => {
  it("derives the workspace key from the active project root", () => {
    expect(
      deriveGrayMatterWorkspaceKey(["/Users/valor/workspace/ChronicleAI"]),
    ).toBe("ChronicleAI");
  });

  it("supplies invariant-preflight scope when a model emits empty arguments", () => {
    expect(
      scopeGrayMatterMcpArguments(
        "graymatter-memory",
        "graymatter_invariant_preflight",
        undefined,
        ["/Users/valor/workspace/ChronicleAI"],
      ),
    ).toEqual({ workspaceKey: "ChronicleAI" });
  });

  it("preserves an explicit source channel", () => {
    expect(
      scopeGrayMatterMcpArguments(
        "graymatter-memory",
        "graymatter_invariant_preflight",
        { sourceChannel: "valoride:workspace:ChronicleAI" },
        ["/ignored"],
      ),
    ).toEqual({ sourceChannel: "valoride:workspace:ChronicleAI" });
  });

  it("does not mutate unrelated MCP calls", () => {
    expect(
      scopeGrayMatterMcpArguments(
        "another-server",
        "graymatter_invariant_preflight",
        undefined,
        ["/Users/valor/workspace/ChronicleAI"],
      ),
    ).toBeUndefined();
  });
});
