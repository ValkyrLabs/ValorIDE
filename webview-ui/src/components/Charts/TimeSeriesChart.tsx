import React from "react";

type DataObject = Record<string, unknown>;

type TimeSeriesChartProps = {
  data: DataObject[];
};

/**
 * Lightweight placeholder chart to keep generated Redux Query views type-safe.
 * Replace with a real chart implementation as needed.
 */
const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
  return (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 12 }}>
      <strong>TimeSeriesChart</strong>
      <pre style={{ maxHeight: 200, overflow: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default TimeSeriesChart;
