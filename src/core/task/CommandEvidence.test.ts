import { buildCommandEvidenceRef } from "./CommandEvidence";

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
});
