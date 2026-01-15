import { TaskSummaryInput, TaskSummaryTodo } from "@shared/TaskSummary";
import {
  ValorIDEChangesSummary,
  ValorIDEFileChangeSummary,
} from "@shared/ExtensionMessage";

const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  completed: { label: "Completed", emoji: "✅" },
  failed: { label: "Failed", emoji: "❌" },
  cancelled: { label: "Cancelled", emoji: "🚫" },
  in_progress: { label: "In Progress", emoji: "⏳" },
};

const formatDate = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const formatTodo = (todo: TaskSummaryTodo): string => {
  const mark = todo.done ? "x" : " ";
  return `- [${mark}] ${todo.text}`;
};

const isGeneratedFile = (relativePath: string): boolean => {
  // Skip files in generated directories
  // Matches: */generated/*, */*/*, */thorapi/*
  const generatedPatterns = [
    /\/generated\//,
    /\/thorapi\//,
    /\/[^/]+\/[^/]+\//,  // Matches */*/
  ];
  return generatedPatterns.some((pattern) => pattern.test(relativePath));
};

const formatChangesTable = (
  changesSummary?: ValorIDEChangesSummary,
): string[] => {
  if (!changesSummary || changesSummary.totalFiles === 0) {
    return ["_No file changes detected._"];
  }

  // Filter out generated files
  const nonGeneratedFiles = changesSummary.files.filter(
    (file) => !isGeneratedFile(file.relativePath),
  );

  if (nonGeneratedFiles.length === 0) {
    return ["_No file changes detected (generated files excluded)._"];
  }

  const header = "| File | Status | + | - |\n| --- | --- | --- | --- |";
  const rows = [...nonGeneratedFiles]
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .map((file: ValorIDEFileChangeSummary) => {
      const status = file.status ?? "modified";
      return `| \`${file.relativePath}\` | ${status} | ${file.insertions ?? 0} | ${file.deletions ?? 0} |`;
    });

  const summaryLine = `- Files: ${nonGeneratedFiles.length} (+${nonGeneratedFiles.reduce((sum, f) => sum + (f.insertions ?? 0), 0)} / -${nonGeneratedFiles.reduce((sum, f) => sum + (f.deletions ?? 0), 0)})`;
  return [summaryLine, "", header, ...rows];
};

export function buildTaskSummary(input: TaskSummaryInput): string {
  const title = input.title?.trim() || input.taskId || "Task";
  const statusMeta = STATUS_LABELS[input.status] ?? STATUS_LABELS.in_progress;
  const lines: string[] = [
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
