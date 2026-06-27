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
  const generatedPatterns = [/(^|\/)generated\//, /(^|\/)thorapi\//];
  return generatedPatterns.some((pattern) => pattern.test(relativePath));
};

const getNonGeneratedFiles = (
  changesSummary?: ValorIDEChangesSummary,
): ValorIDEFileChangeSummary[] => {
  if (!changesSummary || changesSummary.totalFiles === 0) {
    return [];
  }
  return changesSummary.files.filter(
    (file) => !isGeneratedFile(file.relativePath),
  );
};

const formatChangesTable = (
  changesSummary?: ValorIDEChangesSummary,
): string[] => {
  if (!changesSummary || changesSummary.totalFiles === 0) {
    return ["_No file changes detected._"];
  }

  const nonGeneratedFiles = getNonGeneratedFiles(changesSummary);

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
  return singleLine.length > 220
    ? `${singleLine.slice(0, 217)}...`
    : singleLine;
};

const formatVerificationStatus = (matched: boolean, label: string): string =>
  matched ? `✅ ${label}` : `⚠️ ${label} not reported`;

export function buildTaskSummary(input: TaskSummaryInput): string {
  const title = input.title?.trim() || input.taskId || "Task";
  const statusMeta = STATUS_LABELS[input.status] ?? STATUS_LABELS.in_progress;
  const statusWord =
    input.status === "completed" ? "COMPLETE" : statusMeta.label.toUpperCase();
  const nonGeneratedFiles = getNonGeneratedFiles(input.changesSummary);
  const nonGeneratedInsertions = nonGeneratedFiles.reduce(
    (sum, file) => sum + (file.insertions ?? 0),
    0,
  );
  const nonGeneratedDeletions = nonGeneratedFiles.reduce(
    (sum, file) => sum + (file.deletions ?? 0),
    0,
  );
  const resultText = input.resultText?.trim();
  const lowerResult = resultText?.toLowerCase() ?? "";
  const mentionsTests = /\b(test|tests|vitest|jest|pytest|playwright)\b/.test(
    lowerResult,
  );
  const mentionsTypecheck = /\b(typecheck|type-check|tsc|typescript)\b/.test(
    lowerResult,
  );
  const mentionsLint = /\b(lint|eslint)\b/.test(lowerResult);
  const mentionsBuild = /\b(build|compile|compiled)\b/.test(lowerResult);

  const lines: string[] = [
    `# 🎯 ${title} — ${statusWord}`,
    "",
    "## 📊 Executive Summary",
    `- **What was built:** ${summarizeResultText(input.resultText)}`,
    `- **Impact/value delivered:** ${input.status === "completed" ? "The requested work is implemented and captured in the final workspace state." : "The task did not reach completed status."}`,
    `- **Status:** ${input.status === "completed" ? "✅ SHIPPED" : `${statusMeta.emoji} ${statusMeta.label}`}`,
  ];

  const completedDate = formatDate(input.completedAt);
  if (completedDate) {
    lines.push(`- **Completed:** ${completedDate}`);
  }

  lines.push(
    "",
    "## 🔧 Implementation Details",
    `- **Files created/modified:** ${nonGeneratedFiles.length} non-generated file${nonGeneratedFiles.length === 1 ? "" : "s"} (+${nonGeneratedInsertions} / -${nonGeneratedDeletions})`,
    `- **Integration points:** ${
      nonGeneratedFiles.length
        ? nonGeneratedFiles
            .slice(0, 5)
            .map((file) => `\`${file.relativePath}\``)
            .join(", ")
        : "No hand-written file changes detected."
    }`,
    `- **Quality gates passed:** ${
      [
        mentionsTests ? "tests" : undefined,
        mentionsTypecheck ? "TypeScript" : undefined,
        mentionsLint ? "lint" : undefined,
        mentionsBuild ? "build" : undefined,
      ]
        .filter(Boolean)
        .join(", ") ||
      "No explicit verification evidence was attached by the agent."
    }`,
  );

  if (resultText) {
    lines.push("", "### Completion Notes", resultText);
  }

  lines.push(
    "",
    "### Changed Files",
    ...formatChangesTable(input.changesSummary),
  );

  lines.push(
    "",
    "## ✅ Quality Gates",
    `- ${formatVerificationStatus(mentionsTests, "Tests passing")}`,
    `- ${formatVerificationStatus(mentionsBuild, "Build: zero errors")}`,
    `- ${formatVerificationStatus(mentionsTypecheck, "TypeScript: clean")}`,
    `- ${formatVerificationStatus(mentionsLint, "Lint: clean")}`,
    input.changesSummary?.totalFiles
      ? "- ✅ Changed-file summary captured"
      : "- ⚠️ Changed-file summary unavailable",
  );

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
    "## 📈 Before/After Comparison",
    "| Metric | Before | After |",
    "|--------|--------|-------|",
    `| Task status | ❌ Not complete | ${input.status === "completed" ? "✅ Complete" : `${statusMeta.emoji} ${statusMeta.label}`} |`,
    `| Feature/work request | ❌ Pending | ${input.status === "completed" ? "✅ Delivered" : "⚠️ Needs follow-up"} |`,
    `| Changed files | 0 tracked in report | ${nonGeneratedFiles.length} non-generated file${nonGeneratedFiles.length === 1 ? "" : "s"} |`,
    `| Verification evidence | ❌ Not attached | ${mentionsTests || mentionsBuild || mentionsTypecheck || mentionsLint ? "✅ Reported" : "⚠️ Not reported"} |`,
  );

  lines.push(
    "",
    "## 🚀 Ship Status",
    input.status === "completed"
      ? "**Production-ready:** Yes"
      : "**Production-ready:** No. Resolve the open status before merge/deploy.",
  );

  lines.push(""); // trailing newline for Markdown
  return lines.join("\n");
}
