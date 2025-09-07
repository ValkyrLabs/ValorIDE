import React from "react";
import { useCommunicationService } from "@/context/CommunicationServiceContext";

const OfflineBanner: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const svc: any = useCommunicationService();
  const isNoop = !!svc?.isNoop;
  if (!isNoop) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: "0 10px 6px 10px",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 12,
        color: "var(--vscode-editor-foreground)",
        background: "var(--vscode-editor-background)",
        border: "1px solid var(--vscode-inputValidation-warningBorder)",
        ...style,
      }}
    >
      Communication service unreachable. Features limited.
    </div>
  );
};

export default OfflineBanner;

