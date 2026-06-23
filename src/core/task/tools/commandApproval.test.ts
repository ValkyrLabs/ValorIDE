import { resolveCommandRequiresApproval } from "./commandApproval";

describe("resolveCommandRequiresApproval", () => {
  it("defaults omitted requires_approval to true", () => {
    expect(resolveCommandRequiresApproval(undefined)).toBe(true);
  });

  it("honors explicit false and true values", () => {
    expect(resolveCommandRequiresApproval("false")).toBe(false);
    expect(resolveCommandRequiresApproval("true")).toBe(true);
  });

  it("treats non-false or padded false values safely", () => {
    expect(resolveCommandRequiresApproval(" false ")).toBe(false);
    expect(resolveCommandRequiresApproval("maybe")).toBe(true);
  });

  it("requires approval for destructive or production commands even when marked safe", () => {
    expect(
      resolveCommandRequiresApproval("false", "rm -rf /tmp/build-output"),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval(
        "false",
        "valkyr deploy --target production --app digital-product-pro",
      ),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval("false", "terraform apply -auto-approve"),
    ).toBe(true);
  });

  it("requires approval for billing, email send, and public MCP publication", () => {
    expect(
      resolveCommandRequiresApproval(
        "false",
        "stripe refund charge ch_123",
      ),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval(
        "false",
        "gmail send --to customer@example.com",
      ),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval(
        "false",
        "mcp publish --public private-valkyr-workflows",
      ),
    ).toBe(true);
  });

  it("requires approval for shell file writes even when marked safe", () => {
    expect(
      resolveCommandRequiresApproval("false", "echo ok > docs/report.md"),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval("false", "printf ok >> docs/report.md"),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval("false", "sed -i 's/a/b/' src/index.ts"),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval("false", "echo ok | tee docs/report.md"),
    ).toBe(true);
    expect(resolveCommandRequiresApproval("false", "touch .env")).toBe(true);
    expect(resolveCommandRequiresApproval("false", "mv a.txt b.txt")).toBe(
      true,
    );
  });

  it("does not require approval for descriptor-only or null output redirection", () => {
    expect(resolveCommandRequiresApproval("false", "npm test 2>&1")).toBe(
      false,
    );
    expect(resolveCommandRequiresApproval("false", "npm test > /dev/null")).toBe(
      false,
    );
  });

  it("requires approval for inline interpreter file mutations", () => {
    expect(
      resolveCommandRequiresApproval(
        "false",
        "node -e \"require('fs').writeFileSync('src/out.ts', 'x')\"",
      ),
    ).toBe(true);
    expect(
      resolveCommandRequiresApproval(
        "false",
        "python -c \"open('src/out.py', 'w').write('x')\"",
      ),
    ).toBe(true);
  });
});
