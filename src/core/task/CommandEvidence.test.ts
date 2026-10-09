import {
  buildCommandEvidenceRef,
  commandResultExitCode,
  verificationGateForCommand,
} from "./CommandEvidence";

describe("command runtime evidence", () => {
  it("binds the exact command and observed result without exposing either", () => {
    const first = buildCommandEvidenceRef(
      " node --test quote-total.test.cjs ",
      "Command completed with exit code 0.\n# pass 1\n# fail 0",
    );

    expect(first).toMatch(/^valoride-command:[a-f0-9]{64}$/);
    expect(first).toBe(
      buildCommandEvidenceRef(
        "node --test quote-total.test.cjs",
        "Command completed with exit code 0.\n# pass 1\n# fail 0",
      ),
    );
    expect(first).not.toContain("quote-total");
    expect(first).not.toBe(
      buildCommandEvidenceRef(
        "node --test quote-total.test.cjs",
        "Command completed with exit code 1.\n# pass 0\n# fail 1",
      ),
    );
  });

  it("requires an observed runtime exit code, not a success word or output text", () => {
    expect(
      commandResultExitCode(
        "Command completed with exit code 0.\nOutput: tests failed",
      ),
    ).toBe(0);
    expect(commandResultExitCode("Command executed with exit code 7.")).toBe(7);
    expect(
      commandResultExitCode("Command executed.\nOutput: exit code 0"),
    ).toBeUndefined();
    expect(
      commandResultExitCode("Command is still running in the user's terminal."),
    ).toBeUndefined();
    expect(commandResultExitCode("Tests passed; build clean.")).toBeUndefined();
  });

  it("does not claim separate gates from compound shell commands", () => {
    expect(verificationGateForCommand("npm test")).toBe("tests");
    expect(verificationGateForCommand("npm run check-types")).toBe("typecheck");
    expect(verificationGateForCommand("npm run build")).toBe("build");
    expect(verificationGateForCommand("npm run lint")).toBe("lint");
    expect(verificationGateForCommand("echo tests passed")).toBeUndefined();
    expect(
      verificationGateForCommand("npm test && npm run build"),
    ).toBeUndefined();
  });
});
