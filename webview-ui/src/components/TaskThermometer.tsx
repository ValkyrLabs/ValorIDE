import React from "react";
import "./TaskThermometer.css";
import {
  TaskConfidence,
  TaskPhase,
  TASK_PHASES,
  phaseToIndex,
} from "@/utils/taskPhase";

interface TaskThermometerProps {
  phase: TaskPhase;
  ratio?: number; // optional fill within the current segment, 0..1
  tone?: TaskConfidence;
  phaseAnchors?: Partial<Record<TaskPhase, number>>;
  onPhaseSelect?: (phase: TaskPhase) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function TaskThermometer({
  phase,
  ratio = 0,
  tone = "normal",
  phaseAnchors,
  onPhaseSelect,
}: TaskThermometerProps) {
  const activeIndex = phaseToIndex(phase);
  const clampedRatio = clamp(ratio, 0, 1);
  const fillPct =
    ((activeIndex + clampedRatio) / (TASK_PHASES.length - 1 || 1)) * 100;
  const hasAnchor = (p: TaskPhase) =>
    phaseAnchors != null && phaseAnchors[p] != null;

  return (
    <div
      className={`task-thermo ${tone === "warning" ? "task-thermo--warning" : ""}`}
      title={`Task phase: ${phase}`}
    >
      <div className="task-thermo__labels">
        {TASK_PHASES.map((p, idx) => (
          <span
            key={p}
            className={`task-thermo__label ${idx <= activeIndex ? "on" : ""} ${
              hasAnchor(p) && onPhaseSelect ? "clickable" : ""
            }`}
            role={onPhaseSelect && hasAnchor(p) ? "button" : undefined}
            onClick={() => {
              if (onPhaseSelect && hasAnchor(p)) {
                onPhaseSelect(p);
              }
            }}
          >
            {p}
          </span>
        ))}
      </div>
      <div className="task-thermo__bar" aria-hidden>
        <div
          className="task-thermo__fill"
          style={{ width: `${fillPct}%` }}
          aria-label={`Progress: ${Math.round(fillPct)}%`}
        />
      </div>
    </div>
  );
}
