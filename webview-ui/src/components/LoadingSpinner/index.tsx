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

type SpinnerSize = number | "sm" | "md" | "lg";

const presetSizes: Record<Exclude<SpinnerSize, number>, number> = {
  sm: 24,
  md: 48,
  lg: 72,
};

const resolveSize = (size: SpinnerSize | undefined): number => {
  if (typeof size === "number") {
    return size;
  }
  if (!size) {
    return 64;
  }
  return presetSizes[size] ?? 64;
};

export const LoadingSpinner: React.FC<
  { label?: string; size?: SpinnerSize } & React.HTMLAttributes<HTMLDivElement>
> = ({ label = "Loading…", size = 64, style, ...rest }) => {
  if (typeof window !== "undefined") injectKeyframes();
  const resolved = resolveSize(size);
  const s = Math.max(12, resolved);
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
        ...(resolved < 32 ? { minHeight: 0, gap: 8 } : {}),
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
