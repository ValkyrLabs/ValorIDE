import { resolveBuildModeExecutionWorkspaceRoot } from "./BuildModeWorkspaceRoot";

describe("BuildModeWorkspaceRoot", () => {
  it("prefers the controller request workspace root over payload scope roots", () => {
    expect(
      resolveBuildModeExecutionWorkspaceRoot({
        activeWorkspaceRoot: "/workspace/active",
        requestWorkspaceRoot: "/workspace/request",
        scopeWorkspaceRoot: "/tmp/forged",
      }),
    ).toBe("/workspace/request");
  });

  it("uses the active workspace root before falling back to scoped records", () => {
    expect(
      resolveBuildModeExecutionWorkspaceRoot({
        activeWorkspaceRoot: "/workspace/active",
        scopeWorkspaceRoot: "/tmp/forged",
      }),
    ).toBe("/workspace/active");
  });

  it("falls back to scoped roots for durable scheduled automation records", () => {
    expect(
      resolveBuildModeExecutionWorkspaceRoot({
        scopeWorkspaceRoot: "/workspace/scheduled",
      }),
    ).toBe("/workspace/scheduled");
  });
});
