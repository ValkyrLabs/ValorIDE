import type {
  TaskSummaryInput,
  TaskSummaryTodo,
  TaskVerificationGate,
} from "./TaskSummary";
import type {
  ValorIDEChangesSummary,
  ValorIDEFileChangeSummary,
} from "./ExtensionMessage";
import { classifyTaskCompletion } from "./TaskLifecycle";

const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  completed: { label: "Completed", emoji: "✅" },
  failed: { label: "Failed", emoji: "❌" },
  cancelled: { label: "Cancelled", emoji: "🚫" },
  in_progress: { label: "In Progress", emoji: "⏳" },
  blocked: { label: "Blocked", emoji: "⚠️" },
  "waiting-approval": { label: "Waiting for Approval", emoji: "⏳" },
  "outcome-uncertain": { label: "Outcome Unverified", emoji: "⚠️" },
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
    return "No completion notes were provided.";
  }

  const firstParagraph = trimmed
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!firstParagraph) {
    return "No completion notes were provided.";
  }

  const singleLine = firstParagraph.replace(/\s+/g, " ");
  return singleLine.length > 220
    ? `${singleLine.slice(0, 217)}...`
    : singleLine;
};

const formatVerificationStatus = (
  input: TaskSummaryInput,
  gate: TaskVerificationGate,
  label: string,
): string => {
  const observed = input.verificationEvidence
    ?.filter(
      (entry) =>
        entry.gate === gate &&
        Number.isInteger(entry.exitCode) &&
        /^valoride-command:[a-f0-9]{64}$/.test(entry.evidenceRef),
    )
    .at(-1);
  if (!observed) return `⚠️ ${label}: no runtime verification recorded`;
  return `${observed.exitCode === 0 ? "✅" : "❌"} ${label} command: observed exit code ${observed.exitCode}`;
};

export function buildTaskSummary(input: TaskSummaryInput): string {
  const title = input.title?.trim() || input.taskId || "Task";
  const outcome = classifyTaskCompletion({
    summary: input.resultText || "",
    evidenceRefs: input.evidenceRefs,
  });
  const status = input.status === "completed" ? outcome.kind : input.status;
  const statusMeta = STATUS_LABELS[status] ?? STATUS_LABELS.in_progress;
  const statusWord =
    status === "completed" ? "COMPLETE" : statusMeta.label.toUpperCase();
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
  const verificationLines = [
    formatVerificationStatus(input, "tests", "Tests"),
    formatVerificationStatus(input, "build", "Build"),
    formatVerificationStatus(input, "typecheck", "TypeScript"),
    formatVerificationStatus(input, "lint", "Lint"),
  ];

  const lines: string[] = [
    `# 🎯 ${title} — ${statusWord}`,
    "",
    "## 📊 Executive Summary",
    `- **Reported result:** ${summarizeResultText(input.resultText)}`,
    `- **Status:** ${statusMeta.emoji} ${statusMeta.label}`,
    "- Completion notes and workspace differences do not establish deployment or production readiness.",
  ];

  const completedDate = formatDate(input.completedAt);
  if (completedDate) {
    lines.push(
      `- **${status === "completed" ? "Completed" : "Reported"}:** ${completedDate}`,
    );
  }

  lines.push(
    "",
    "## 🔧 Implementation Details",
    `- **Workspace files observed:** ${nonGeneratedFiles.length} non-generated file${nonGeneratedFiles.length === 1 ? "" : "s"} (+${nonGeneratedInsertions} / -${nonGeneratedDeletions}); task attribution unverified.`,
    `- **Workspace paths:** ${
      nonGeneratedFiles.length
        ? nonGeneratedFiles
            .slice(0, 5)
            .map((file) => `\`${file.relativePath}\``)
            .join(", ")
        : "No workspace differences attached."
    }`,
    "- Quality gates below use recorded command outcomes, not words in the completion notes.",
  );

  if (resultText) {
    lines.push(
      "",
      "### Completion Notes",
      "_Agent-provided notes; claims are not runtime verification._",
      "",
      resultText,
    );
  }

  lines.push(
    "",
    "### Changed Files",
    "_Workspace diff; task attribution unverified. Concurrent and user edits may be included._",
    ...formatChangesTable(input.changesSummary),
  );

  lines.push(
    "",
    "## ✅ Quality Gates",
    ...verificationLines.map((line) => `- ${line}`),
    input.changesSummary?.totalFiles
      ? "- Workspace diff captured; task attribution unverified."
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
    `| Task outcome | Not established by this report | ${statusMeta.emoji} ${statusMeta.label} |`,
    `| Workspace differences | Baseline checkpoint | ${nonGeneratedFiles.length} non-generated file${nonGeneratedFiles.length === 1 ? "" : "s"}; attribution unverified |`,
    `| Verification evidence | Not inferred from prose | ${verificationLines.filter((line) => !line.includes("no runtime verification")).length} recorded command outcomes |`,
  );

  lines.push(
    "",
    "## 🚀 Ship Status",
    status === "completed"
      ? "**Production-ready:** Not verified by this report."
      : "**Production-ready:** No. Resolve the open outcome and verify before merge/deploy.",
  );

  lines.push(""); // trailing newline for Markdown
  return lines.join("\n");
}
