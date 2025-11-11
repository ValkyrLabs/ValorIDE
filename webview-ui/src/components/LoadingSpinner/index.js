import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const spinnerStyle = {
    width: 64,
    height: 64,
    border: "6px solid rgba(255,255,255,0.15)",
    borderTopColor: "#60a5fa",
    borderRadius: "50%",
    animation: "vl-spin 0.8s linear infinite",
    boxShadow: "0 0 20px rgba(96,165,250,0.35)",
};
const container = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 16,
    minHeight: 120,
};
const labelStyle = {
    fontWeight: 600,
    letterSpacing: 0.3,
    opacity: 0.85,
};
// Add a keyframes tag once per document
const injectKeyframes = () => {
    if (document.getElementById("vl-spin-style"))
        return;
    const style = document.createElement("style");
    style.id = "vl-spin-style";
    style.innerHTML = `@keyframes vl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
};
export const LoadingSpinner = ({ label = "Loading…", size = 64, style, ...rest }) => {
    if (typeof window !== "undefined")
        injectKeyframes();
    const s = Math.max(12, size);
    const spinner = {
        ...spinnerStyle,
        width: s,
        height: s,
        borderWidth: Math.max(3, Math.floor(s / 12)),
    };
    return (_jsxs("div", { style: {
            ...container,
            ...(size < 32 ? { minHeight: 0, gap: 8 } : {}),
            ...style,
        }, ...rest, children: [_jsx("div", { style: spinner }), _jsx("div", { style: labelStyle, children: label })] }));
};
export default LoadingSpinner;
//# sourceMappingURL=index.js.map