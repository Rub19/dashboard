"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartPalette } from "./useChartPalette";
import { EmptyChart } from "./AnalyticsBarChart";

export interface LineChartPoint {
  label: string;
  value: number;
}

export default function AnalyticsLineChart({
  data,
  color,
  height = 180,
  valueSuffix = "",
}: {
  data: LineChartPoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}) {
  const palette = useChartPalette();
  const lineColor = color || palette.accent;

  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={palette.panelBorder} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: palette.textMuted, fontSize: 11 }}
          axisLine={{ stroke: palette.panelBorder }}
          tickLine={false}
        />
        <YAxis tick={{ fill: palette.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{
            background: "var(--panel-bg, #18181b)",
            border: `1px solid ${palette.panelBorder}`,
            borderRadius: "var(--inset-radius, 8px)",
            color: palette.textPrimary,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}${valueSuffix}`, ""]}
          labelStyle={{ color: palette.textMuted }}
        />
        <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={{ r: 3, fill: lineColor }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
