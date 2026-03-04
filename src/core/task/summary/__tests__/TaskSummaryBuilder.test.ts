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

  it("filters out generated files from changes summary", () => {
    const changesSummaryWithGenerated: ValorIDEChangesSummary = {
      totalFiles: 5,
      totalInsertions: 30,
      totalDeletions: 10,
      files: [
        {
          relativePath: "src/index.ts",
          absolutePath: "/workspace/src/index.ts",
          insertions: 6,
          deletions: 1,
          status: "modified",
        },
        {
          relativePath: "src/generated/models.ts",
          absolutePath: "/workspace/src/generated/models.ts",
          insertions: 100,
          deletions: 50,
          status: "modified",
        },
        {
          relativePath: "src/thorapi/client.ts",
          absolutePath: "/workspace/src/thorapi/client.ts",
          insertions: 200,
          deletions: 100,
          status: "modified",
        },
        {
          relativePath: "docs/README.md",
          absolutePath: "/workspace/docs/README.md",
          insertions: 4,
          deletions: 2,
          status: "added",
        },
        {
          relativePath: "src/services/api/controller.ts",
          absolutePath: "/workspace/src/services/api/controller.ts",
          insertions: 20,
          deletions: 7,
          status: "added",
        },
      ],
    };

    const markdown = buildTaskSummary({
      taskId: "task-456",
      title: "Generated files test",
      status: "completed",
      changesSummary: changesSummaryWithGenerated,
    });

    // Non-generated files should be in the output
    expect(markdown).toContain("src/index.ts");
    expect(markdown).toContain("docs/README.md");
    expect(markdown).toContain("src/services/api/controller.ts");

    // Generated files should NOT be in the output
    expect(markdown).not.toContain("src/generated/models.ts");
    expect(markdown).not.toContain("src/thorapi/client.ts");

    // Count should reflect only non-generated files (3 files)
    expect(markdown).toContain("Files: 3");
    // Insertions/deletions should be from non-generated files only (6+4+20, 1+2+7)
    expect(markdown).toContain("(+30 / -10)");
  });

  it("returns message when all changes are in generated files", () => {
    const changesSummaryAllGenerated: ValorIDEChangesSummary = {
      totalFiles: 2,
      totalInsertions: 300,
      totalDeletions: 150,
      files: [
        {
          relativePath: "src/generated/models.ts",
          absolutePath: "/workspace/src/generated/models.ts",
          insertions: 100,
          deletions: 50,
          status: "modified",
        },
        {
          relativePath: "src/thorapi/client.ts",
          absolutePath: "/workspace/src/thorapi/client.ts",
          insertions: 200,
          deletions: 100,
          status: "modified",
        },
      ],
    };

    const markdown = buildTaskSummary({
      taskId: "task-789",
      title: "Only generated files",
      status: "completed",
      changesSummary: changesSummaryAllGenerated,
    });

    // Should show message about no changes (generated files excluded)
    expect(markdown).toContain(
      "No file changes detected (generated files excluded).",
    );

    // Generated files should NOT be in the output
    expect(markdown).not.toContain("src/generated/models.ts");
    expect(markdown).not.toContain("src/thorapi/client.ts");
  });
});
