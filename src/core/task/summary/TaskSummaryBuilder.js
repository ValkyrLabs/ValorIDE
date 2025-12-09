const STATUS_LABELS = {
  completed: { label: "Completed", emoji: "✅" },
  failed: { label: "Failed", emoji: "❌" },
  cancelled: { label: "Cancelled", emoji: "🚫" },
  in_progress: { label: "In Progress", emoji: "⏳" },
};
const formatDate = (iso) => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};
const formatTodo = (todo) => {
  const mark = todo.done ? "x" : " ";
  return `- [${mark}] ${todo.text}`;
};
const formatChangesTable = (changesSummary) => {
  if (!changesSummary || changesSummary.totalFiles === 0) {
    return ["_No file changes detected._"];
  }
  const header = "| File | Status | + | - |\n| --- | --- | --- | --- |";
  const rows = [...changesSummary.files]
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .map((file) => {
      const status = file.status ?? "modified";
      return `| \`${file.relativePath}\` | ${status} | ${file.insertions ?? 0} | ${file.deletions ?? 0} |`;
    });
  const summaryLine = `- Files: ${changesSummary.totalFiles} (+${changesSummary.totalInsertions} / -${changesSummary.totalDeletions})`;
  return [summaryLine, "", header, ...rows];
};
export function buildTaskSummary(input) {
  const title = input.title?.trim() || input.taskId || "Task";
  const statusMeta = STATUS_LABELS[input.status] ?? STATUS_LABELS.in_progress;
  const lines = [
    `# Task: ${title}`,
    "",
    `Status: ${statusMeta.label} ${statusMeta.emoji}`,
  ];
  const completedDate = formatDate(input.completedAt);
  if (completedDate) {
    lines.push(`Completed: ${completedDate}`);
  }
  if (input.resultText) {
    lines.push("", "## Result", input.resultText.trim());
  }
  lines.push("", "## Changes", ...formatChangesTable(input.changesSummary));
  if (input.decisions?.length) {
    lines.push("", "## Decisions");
    input.decisions.forEach((decision) => {
      lines.push(`- ${decision}`);
    });
  }
  if (input.todos?.length) {
    lines.push("", "## TODOs");
    input.todos.forEach((todo) => lines.push(formatTodo(todo)));
  }
  if (input.checkpoints?.length) {
    lines.push("", "## Checkpoints");
    input.checkpoints.forEach((checkpoint) => {
      const label = checkpoint.label || "Checkpoint";
      const hash = checkpoint.hash ? ` (${checkpoint.hash})` : "";
      lines.push(`- ${label}${hash}`);
    });
  }
  if (input.attachments?.length) {
    lines.push("", "## Attachments");
    input.attachments.forEach((attachment) => lines.push(`- ${attachment}`));
  }
  lines.push(""); // trailing newline for Markdown
  return lines.join("\n");
}
//# sourceMappingURL=TaskSummaryBuilder.js.map
