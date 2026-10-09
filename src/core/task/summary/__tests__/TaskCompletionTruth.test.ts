import { buildTaskSummary } from "../TaskSummaryBuilder";
import { classifyTaskCompletion } from "@shared/TaskLifecycle";
import { it } from "@jest/globals";

const blockedResult = [
  "# Tool Usage Reliability — Blocked",
  "No files changed or tests run. This session has no callable filesystem, terminal, browser, or worker tools.",
  "Production-ready: No — implementation and verification are blocked.",
].join("\n\n");

describe("completion reporting truth", () => {
  it("keeps the supplied blocked result blocked despite a checkpoint", () => {
    expect(
      classifyTaskCompletion({
        summary: blockedResult,
        evidenceRefs: ["valoride-checkpoint:other-owner-change"],
      }).kind,
    ).toBe("blocked");
    const report = buildTaskSummary({
      taskId: "tool-reliability",
      title: "fix all tool usage issues and failures",
      status: "completed",
      resultText: blockedResult,
    });
    expect(report).toContain("— BLOCKED");
    expect(report).not.toContain("✅ SHIPPED");
    expect(report).not.toContain("**Production-ready:** Yes");
    expect(report).not.toContain("✅ Tests passing");
  });

  it.each([
    "No tests run. Build failed; TypeScript and lint were not checked.",
    "Run tests, lint, typecheck and build before deployment.",
    "Tests passing, build clean, TypeScript clean, lint clean.",
  ])("does not turn prose into passing runtime gates: %s", (resultText) => {
    const report = buildTaskSummary({
      taskId: "prose",
      status: "completed",
      resultText,
    });
    expect(report).not.toContain("✅ Tests passing");
    expect(report).not.toContain("✅ Build: zero errors");
    expect(report).not.toContain("✅ TypeScript: clean");
    expect(report).not.toContain("✅ Lint: clean");
    expect(report).not.toContain("**Production-ready:** Yes");
  });

  it("labels a shared workspace diff without attributing its files to the task", () => {
    const report = buildTaskSummary({
      taskId: "tool-reliability",
      status: "completed",
      resultText: blockedResult,
      changesSummary: {
        totalFiles: 1,
        totalInsertions: 4,
        totalDeletions: 0,
        files: [
          {
            relativePath: "ChatRow.graymatter.ts",
            absolutePath: "/workspace/ChatRow.graymatter.ts",
            status: "modified",
            insertions: 4,
            deletions: 0,
          },
        ],
      },
    });
    expect(report).toContain("task attribution unverified");
    expect(report).not.toContain("**Files created/modified:** 1");
    expect(report).not.toContain(
      "**Integration points:** `ChatRow.graymatter.ts`",
    );
  });

  it("shows only the individually recorded runtime command gates", () => {
    const evidenceRef = `valoride-command:${"a".repeat(64)}`;
    const report = buildTaskSummary({
      taskId: "observed",
      status: "completed",
      resultText: "Verified the repair.",
      evidenceRefs: [evidenceRef],
      verificationEvidence: [{ gate: "tests", exitCode: 0, evidenceRef }],
    });
    expect(report).toContain("— COMPLETE");
    expect(report).toContain("✅ Tests command: observed exit code 0");
    expect(report).toContain("Build: no runtime verification recorded");
    expect(report).not.toContain("**Production-ready:** Yes");
  });

  it("does not turn a failed recorded gate green", () => {
    const report = buildTaskSummary({
      taskId: "failed",
      status: "failed",
      resultText: "Build failed.",
      verificationEvidence: [
        {
          gate: "build",
          exitCode: 7,
          evidenceRef: `valoride-command:${"b".repeat(64)}`,
        },
      ],
    });
    expect(report).toContain("— FAILED");
    expect(report).toContain("❌ Build command: observed exit code 7");
    expect(report).not.toContain("✅ Build");
  });
});
