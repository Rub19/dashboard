"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartPalette } from "./useChartPalette";

export interface BarChartPoint {
  label: string;
  value: number;
}

export default function AnalyticsBarChart({
  data,
  color,
  height = 180,
  valueSuffix = "",
  seriesLabel = "",
  decimals = false,
}: {
  data: BarChartPoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
  /** Nom de la série dans l'infobulle (ex. « Messages »). Vide : seule la valeur est affichée. */
  seriesLabel?: string;
  /** Graduations décimales (ex. heures) ; sinon uniquement des entiers. */
  decimals?: boolean;
}) {
  const palette = useChartPalette();
  const barColor = color || palette.accent;

  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: palette.textMuted, fontSize: 11 }}
          axisLine={{ stroke: palette.panelBorder }}
          tickLine={false}
        />
        <YAxis tick={{ fill: palette.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={44} allowDecimals={decimals} tickFormatter={(v: number) => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v)} />
        <Tooltip
          cursor={{ fill: palette.panelBorder, opacity: 0.4 }}
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
        <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmptyChart({ height = 180, label = "Pas encore de données" }: { height?: number; label?: string }) {
  return (
    <div
      className="flex w-full items-center justify-center text-xs text-[var(--text-muted)]"
      style={{ height }}
    >
      {label}
    </div>
  );
}
