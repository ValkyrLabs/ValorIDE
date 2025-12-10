import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./TaskThermometer.css";
import { TASK_PHASES, phaseToIndex } from "@thorapi/utils/taskPhase";
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export default function TaskThermometer({
  phase,
  ratio = 0,
  tone = "normal",
  phaseAnchors,
  onPhaseSelect,
}) {
  const activeIndex = phaseToIndex(phase);
  const clampedRatio = clamp(ratio, 0, 1);
  const fillPct =
    ((activeIndex + clampedRatio) / (TASK_PHASES.length - 1 || 1)) * 100;
  const hasAnchor = (p) => phaseAnchors != null && phaseAnchors[p] != null;
  return _jsxs("div", {
    className: `task-thermo ${tone === "warning" ? "task-thermo--warning" : ""}`,
    title: `Task phase: ${phase}`,
    children: [
      _jsx("div", {
        className: "task-thermo__labels",
        children: TASK_PHASES.map((p, idx) =>
          _jsx(
            "span",
            {
              className: `task-thermo__label ${idx <= activeIndex ? "on" : ""} ${hasAnchor(p) && onPhaseSelect ? "clickable" : ""}`,
              role: onPhaseSelect && hasAnchor(p) ? "button" : undefined,
              onClick: () => {
                if (onPhaseSelect && hasAnchor(p)) {
                  onPhaseSelect(p);
                }
              },
              children: p,
            },
            p
          )
        ),
      }),
      _jsx("div", {
        className: "task-thermo__bar",
        "aria-hidden": true,
        children: _jsx("div", {
          className: "task-thermo__fill",
          style: { width: `${fillPct}%` },
          "aria-label": `Progress: ${Math.round(fillPct)}%`,
        }),
      }),
    ],
  });
}
//# sourceMappingURL=TaskThermometer.js.map
