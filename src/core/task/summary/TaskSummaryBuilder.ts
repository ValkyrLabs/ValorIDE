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
  // Matches generated client/model output while preserving hand-written app code.
  const generatedPatterns = [
    /(^|\/)generated\//,
    /(^|\/)thorapi\//,
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

const summarizeResultText = (resultText?: string): string => {
  const trimmed = resultText?.trim();
  if (!trimmed) {
    return "ValorIDE completed the requested task and captured the final workspace state.";
  }

  const firstParagraph = trimmed
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!firstParagraph) {
    return "ValorIDE completed the requested task and captured the final workspace state.";
  }

  const singleLine = firstParagraph.replace(/\s+/g, " ");
  return singleLine.length > 220 ? `${singleLine.slice(0, 217)}...` : singleLine;
};

const formatQualityGates = (input: TaskSummaryInput): string[] => {
  const resultText = input.resultText?.toLowerCase() ?? "";
  const mentionsTests = /\b(test|tests|vitest|jest|pytest|playwright)\b/.test(
    resultText,
  );
  const mentionsTypecheck = /\b(typecheck|type-check|tsc|typescript)\b/.test(
    resultText,
  );
  const mentionsLint = /\b(lint|eslint)\b/.test(resultText);
  const mentionsBuild = /\b(build|compile|compiled)\b/.test(resultText);

  const lines = [
    input.changesSummary?.totalFiles
      ? "- [x] Changed-file summary captured"
      : "- [ ] No changed-file summary was available",
    mentionsTests
      ? "- [x] Test verification noted in completion result"
      : "- [ ] Test verification was not attached to the summary",
    mentionsTypecheck
      ? "- [x] TypeScript/typecheck verification noted"
      : "- [ ] Typecheck evidence was not attached to the summary",
    mentionsLint
      ? "- [x] Lint verification noted"
      : "- [ ] Lint evidence was not attached to the summary",
    mentionsBuild
      ? "- [x] Build/compile verification noted"
      : "- [ ] Build evidence was not attached to the summary",
  ];

  return lines;
};

export function buildTaskSummary(input: TaskSummaryInput): string {
  const title = input.title?.trim() || input.taskId || "Task";
  const statusMeta = STATUS_LABELS[input.status] ?? STATUS_LABELS.in_progress;
  const statusWord = statusMeta.label.toUpperCase();
  const changeCount = input.changesSummary?.totalFiles ?? 0;
  const changeLine = changeCount
    ? `${changeCount} file${changeCount === 1 ? "" : "s"} changed (+${input.changesSummary?.totalInsertions ?? 0} / -${input.changesSummary?.totalDeletions ?? 0}).`
    : "No file changes were detected.";
  const lines: string[] = [
    `# 🎯 ${title} — ${statusWord}`,
    "",
    "## 📊 Executive Summary",
    `- **Status:** ${statusMeta.label} ${statusMeta.emoji}`,
    `- **Outcome:** ${summarizeResultText(input.resultText)}`,
    `- **Workspace impact:** ${changeLine}`,
  ];

  const completedDate = formatDate(input.completedAt);
  if (completedDate) {
    lines.push(`- **Completed:** ${completedDate}`);
  }

  if (input.resultText) {
    lines.push(
      "",
      "## 🔧 Implementation Details",
      input.resultText.trim(),
    );
  } else {
    lines.push(
      "",
      "## 🔧 Implementation Details",
      "_No detailed completion narrative was provided by the agent._",
    );
  }

  lines.push("", "## 🗂 Changed Files", ...formatChangesTable(input.changesSummary));

  lines.push("", "## ✅ Quality Gates", ...formatQualityGates(input));

  if (input.decisions?.length) {
    lines.push("", "## 🧭 Decisions");
    input.decisions.forEach((decision) => {
      lines.push(`- ${decision}`);
    });
  }

  if (input.todos?.length) {
    lines.push("", "## 📌 Follow-ups");
    input.todos.forEach((todo) => lines.push(formatTodo(todo)));
  }

  if (input.checkpoints?.length) {
    lines.push("", "## 🧷 Checkpoints");
    input.checkpoints.forEach((checkpoint) => {
      const label = checkpoint.label || "Checkpoint";
      const hash = checkpoint.hash ? ` (${checkpoint.hash})` : "";
      lines.push(`- ${label}${hash}`);
    });
  }

  if (input.attachments?.length) {
    lines.push("", "## 📎 Attachments");
    input.attachments.forEach((attachment) => lines.push(`- ${attachment}`));
  }

  lines.push(
    "",
    "## 🚀 Ship Status",
    input.status === "completed"
      ? "**Ready for review:** Yes. Review the changed files and attached verification evidence before merge/deploy."
      : "**Ready for review:** Not yet. Resolve the open status before merge/deploy.",
  );

  lines.push(""); // trailing newline for Markdown
  return lines.join("\n");
}
