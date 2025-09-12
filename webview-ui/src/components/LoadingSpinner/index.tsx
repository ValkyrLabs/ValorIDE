import React from "react";

const spinnerStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  border: "6px solid rgba(255,255,255,0.15)",
  borderTopColor: "#60a5fa",
  borderRadius: "50%",
  animation: "vl-spin 0.8s linear infinite",
  boxShadow: "0 0 20px rgba(96,165,250,0.35)",
};

const container: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 16,
  minHeight: 120,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  letterSpacing: 0.3,
  opacity: 0.85,
};

// Add a keyframes tag once per document
const injectKeyframes = () => {
  if (document.getElementById("vl-spin-style")) return;
  const style = document.createElement("style");
  style.id = "vl-spin-style";
  style.innerHTML = `@keyframes vl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
};

export const LoadingSpinner: React.FC<
  { label?: string; size?: number } & React.HTMLAttributes<HTMLDivElement>
> = ({ label = "Loading…", size = 64, style, ...rest }) => {
  if (typeof window !== "undefined") injectKeyframes();
  const s = Math.max(12, size);
  const spinner: React.CSSProperties = {
    ...spinnerStyle,
    width: s,
    height: s,
    borderWidth: Math.max(3, Math.floor(s / 12)),
  };
  return (
    <div
      style={{
        ...container,
        ...(size < 32 ? { minHeight: 0, gap: 8 } : {}),
        ...style,
      }}
      {...rest}
    >
      <div style={spinner} />
      <div style={labelStyle}>{label}</div>
    </div>
  );
};

export default LoadingSpinner;
