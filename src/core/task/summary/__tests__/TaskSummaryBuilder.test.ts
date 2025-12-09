import { buildTaskSummary } from "../TaskSummaryBuilder";
import { ValorIDEChangesSummary } from "@shared/ExtensionMessage";

describe("TaskSummaryBuilder", () => {
  const changesSummary: ValorIDEChangesSummary = {
    totalFiles: 2,
    totalInsertions: 10,
    totalDeletions: 3,
    files: [
      {
        relativePath: "src/index.ts",
        absolutePath: "/workspace/src/index.ts",
        insertions: 6,
        deletions: 1,
        status: "modified",
      },
      {
        relativePath: "docs/README.md",
        absolutePath: "/workspace/docs/README.md",
        insertions: 4,
        deletions: 2,
        status: "added",
      },
    ],
  };

  it("builds markdown with status, changes, decisions, todos, attachments", () => {
    const markdown = buildTaskSummary({
      taskId: "task-123",
      title: "Implement summary builder",
      status: "completed",
      resultText: "Implemented the summary builder feature.",
      changesSummary,
      decisions: ["Added markdown builder", "Included change table"],
      todos: [
        { text: "Ship it", done: false },
        { text: "Celebrate", done: true },
      ],
      checkpoints: [{ label: "final", hash: "abc123" }],
      attachments: ["shot.png"],
      completedAt: "2025-12-05T12:00:00.000Z",
    });

    expect(markdown).toContain("# Task: Implement summary builder");
    expect(markdown).toContain("Status: Completed");
    expect(markdown).toContain("## Changes");
    expect(markdown).toContain("src/index.ts");
    expect(markdown).toContain("docs/README.md");
    expect(markdown).toContain("- [ ] Ship it");
    expect(markdown).toContain("- [x] Celebrate");
    expect(markdown).toContain("shot.png");
    expect(markdown).toContain("2025-12-05");
  });
});
