import { describe, expect, it } from "vitest";
import {
  buildRuntimeInvocation,
  discoverRuntimeExecutable,
} from "./ValorRuntimeExecutor";

describe("ValorRuntimeExecutor", () => {
  it("honors the product runtime executable override", () => {
    expect(
      discoverRuntimeExecutable({ VALOR_RUNTIME_EXECUTABLE: "/opt/valor/codex" }),
    ).toBe("/opt/valor/codex");
  });

  it("builds a streamed headless act invocation with protected-action guards", () => {
    const invocation = buildRuntimeInvocation({
      description: "Inspect the repository and report status",
      executable: "/Applications/ChatGPT.app/Contents/Resources/codex",
      mode: "act",
      workspace: "/workspace/project",
    });
    expect(invocation.args).toContain("workspace-write");
    expect(invocation.args).toContain("/workspace/project");
    expect(invocation.args.at(-1)).toContain("Never send outbound messages");
    expect(invocation.args.at(-1)).toContain("Inspect the repository");
  });

  it("uses a read-only sandbox for plan mode", () => {
    const invocation = buildRuntimeInvocation({
      description: "Plan the change",
      executable: "codex",
      mode: "plan",
      workspace: "/workspace/project",
    });
    expect(invocation.args).toContain("read-only");
    expect(invocation.args.at(-1)).toContain("Do not modify the workspace");
  });
});
