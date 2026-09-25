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
  seriesLabel = "",
  decimals = false,
}: {
  data: LineChartPoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
  /** Nom de la série dans l'infobulle (ex. « Messages »). Vide : seule la valeur est affichée. */
  seriesLabel?: string;
  /** Graduations décimales (ex. heures) ; sinon uniquement des entiers. */
  decimals?: boolean;
}) {
  const palette = useChartPalette();
  const lineColor = color || palette.accent;

  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={palette.panelBorder} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: palette.textMuted, fontSize: 11 }}
          axisLine={{ stroke: palette.panelBorder }}
          tickLine={false}
        />
        <YAxis tick={{ fill: palette.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={44} allowDecimals={decimals} tickFormatter={(v: number) => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v)} />
        <Tooltip
          contentStyle={{
            background: "var(--panel-bg, #18181b)",
            border: `1px solid ${palette.panelBorder}`,
            borderRadius: "var(--inset-radius, 8px)",
            color: palette.textPrimary,
            fontSize: 12,
          }}
          separator={seriesLabel ? " : " : ""}
          formatter={(value) => [`${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value))}${valueSuffix}`, seriesLabel]}
          labelStyle={{ color: palette.textMuted }}
        />
        <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={{ r: 3, fill: lineColor }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
