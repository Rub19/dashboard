"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import type { ForecastDay } from "@/components/WeatherWidget";
import { weatherIconFromCode, weatherIconColor } from "@/components/WeatherWidget";

function toNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function formatShortDay(iso?: string, locale = "fr"): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
}

export default function WeatherForecastList({ days }: { days: ForecastDay[] }) {
  const i18n = useI18n();
  const locale = i18n("daysShort")?.includes(",") ? "fr" : "en";

  const list = useMemo(() => days.slice(0, 7), [days]);

  const allMin = useMemo(() => Math.min(...list.map((d) => toNum(d.min) ?? 0)), [list]);
  const allMax = useMemo(() => Math.max(...list.map((d) => toNum(d.max) ?? 100)), [list]);
  const range = allMax - allMin || 1;

  return (
    <div className="flex flex-col">
      {list.map((day, i) => {
        const min = toNum(day.min);
        const max = toNum(day.max);
        const icon = weatherIconFromCode(day.weatherCode, day.condition, true);
        const color = weatherIconColor(day.weatherCode, true);
        const left = min !== undefined ? ((min - allMin) / range) * 100 : 0;
        const width = min !== undefined && max !== undefined ? ((max - min) / range) * 100 : 100;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.04, ease: "easeOut" }}
            className="flex items-center justify-between border-b border-[var(--text-primary)]/[0.04] px-2 py-2.5 last:border-none hover:rounded-xl hover:bg-[var(--text-primary)]/[0.02] transition-colors"
          >
            <span className="w-12 text-xs font-medium text-[var(--text-primary)]">{formatShortDay(day.date, locale)}</span>
            <Icon pack="phosphor" name={icon} className={`h-4 w-4 ${color}`} />
            <div className="mx-3 h-1 flex-1 rounded-xl bg-[var(--text-primary)]/[0.04]">
              <div
                className="relative h-full rounded-xl bg-gradient-to-r from-[var(--info)] via-[var(--warning)] to-[var(--danger)]"
                style={{ marginLeft: `${left}%`, width: `${Math.max(width, 4)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {min !== undefined ? `${Math.round(min)}°` : "—"} / <span className="font-semibold text-[var(--text-primary)]">{max !== undefined ? `${Math.round(max)}°` : "—"}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
