import React from "react";

type StatusKind = "ok" | "warn" | "error" | "idle";

export const StatusBadge: React.FC<{
  label: string;
  value?: string;
  kind?: StatusKind;
  title?: string;
  style?: React.CSSProperties;
}> = ({ label, value, kind = "idle", title, style }) => {
  const { bg, fg, dot } = (() => {
    switch (kind) {
      case "ok":
        return {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-terminal-ansiGreen, #4ec9b0)",
          dot: "var(--vscode-terminal-ansiGreen, #4ec9b0)",
        };
      case "warn":
        return {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-inputValidation-warningForeground, #cca700)",
          dot: "#cca700",
        };
      case "error":
        return {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-inputValidation-errorForeground, #f48771)",
          dot: "#f48771",
        };
      default:
        return {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-descriptionForeground)",
          dot: "var(--vscode-descriptionForeground)",
        };
    }
  })();

  return (
    <span
      title={title}
      className={`valoride-status valoride-status--${kind}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        lineHeight: 1,
        padding: "3px 7px",
        borderRadius: 999,
        background: "var(--valoride-surface, " + bg + ")",
        color: "var(--vscode-foreground, " + fg + ")",
        border: 0,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
          boxShadow: "none",
        }}
      />
      <span style={{ opacity: 0.75 }}>{label}:</span>
      {value && <span style={{ fontWeight: 600 }}>{value}</span>}
    </span>
  );
};

export default StatusBadge;
