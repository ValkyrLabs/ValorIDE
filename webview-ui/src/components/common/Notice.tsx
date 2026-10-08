import type { CSSProperties, ReactNode } from "react";

export const Notice = ({ children, kind = "info", action, style }: { children: ReactNode; kind?: "info" | "warn" | "error"; action?: ReactNode; style?: CSSProperties }) => (
  <div className={`valoride-notice valoride-notice--${kind}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"} style={style}>
    <span>{children}</span>{action}
  </div>
);
