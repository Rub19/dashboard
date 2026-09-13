"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useChartPalette } from "./useChartPalette";
import { EmptyChart } from "./AnalyticsBarChart";

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

const FALLBACK_SEQUENCE_KEYS = ["accent", "info", "success", "warning", "danger", "accentContrast"] as const;

export default function AnalyticsDonutChart({
  data,
  height = 180,
  centerLabel,
}: {
  data: DonutSlice[];
  height?: number;
  centerLabel?: string;
}) {
  const palette = useChartPalette();

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <EmptyChart height={height} />;
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
            {data.map((slice, index) => (
              <Cell
                key={slice.label}
                fill={slice.color || palette[FALLBACK_SEQUENCE_KEYS[index % FALLBACK_SEQUENCE_KEYS.length]]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--panel-bg, #18181b)",
              border: `1px solid ${palette.panelBorder}`,
              borderRadius: "var(--inset-radius, 8px)",
              color: palette.textPrimary,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-center text-sm font-semibold text-[var(--text-primary)]">{centerLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
