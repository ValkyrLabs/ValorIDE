import React from "react";

type StatusKind = "ok" | "warn" | "error" | "idle";

export const StatusBadge: React.FC<{
  label: string;
  value?: string;
  kind?: StatusKind;
  title?: string;
  style?: React.CSSProperties;
}> = ({ label, value, kind = "idle", title, style }) => {
  const { bg, fg, border } = (() => {
    switch (kind) {
      case "ok":
        return {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-editor-foreground)",
          border: "1px solid var(--vscode-inputValidation-warningBorder)"
        };
      case "warn":
        return {
          bg: "var(--vscode-inputValidation-warningBackground)",
          fg: "var(--vscode-inputValidation-warningForeground)",
          border: "var(--vscode-inputValidation-warningBorder)"
        };
      case "error":
        return {
          bg: "var(--vscode-inputValidation-errorBackground)",
          fg: "var(--vscode-inputValidation-errorForeground)",
          border: "var(--vscode-inputValidation-errorBorder)"
        };
      default:
        return {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-editor-foreground)",
          border: "1px solid var(--vscode-inputValidation-warningBorder)"
        };
    }
  })();


  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        lineHeight: 1,
        padding: "4px 8px",
        borderRadius: 6,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        ...style,
      }}
    >
      <span style={{ opacity: 0.8 }}>{label}</span>
      {value && (
        <span
          style={{
            fontWeight: 600,
          }}
        >
          {value}
        </span>
      )}
    </span>
  );
};

export default StatusBadge;

