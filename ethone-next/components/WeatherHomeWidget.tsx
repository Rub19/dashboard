"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import Card from "@/components/ui/Card";
import { weatherIconFromCode, weatherIconColor, type WeatherData } from "@/components/WeatherWidget";

function toNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function toStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function formatMinMax(forecast: WeatherData["forecast"]): string {
  if (!forecast || !forecast[0]) return "— / —";
  const min = toNum(forecast[0].min);
  const max = toNum(forecast[0].max);
  return `${min !== undefined ? Math.round(min) : "—"}° / ${max !== undefined ? Math.round(max) : "—"}°`;
}

function WeatherSkeleton() {
  return (
    <Card variant="widget" padding="sm" className="h-full">
      <div className="flex h-full items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--text-primary)]/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-16 rounded bg-[var(--text-primary)]/[0.06]" />
          <div className="h-3 w-24 rounded bg-[var(--text-primary)]/[0.04]" />
        </div>
      </div>
    </Card>
  );
}

type WeatherHomeWidgetProps = {
  data?: WeatherData | null;
  loading?: boolean;
  className?: string;
};

export default function WeatherHomeWidget({ data, loading, className }: WeatherHomeWidgetProps) {
  const i18n = useI18n();
  const { settings } = useSettings();

  if (loading && !data) {
    return <WeatherSkeleton />;
  }

  if (!data && !settings.liveWeatherCity) {
    return (
      <Link href="/settings/appearance" className="group block h-full outline-none">
        <Card
          variant="widget"
          padding="sm"
          className={cn(
            "flex h-full items-center justify-between gap-3 transition-[box-shadow,transform] duration-200 ease-out group-hover:shadow-md",
            className,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--text-primary)]/[0.04]">
              <Icon name="cloud" className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{i18n("weather", "Météo")}</p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                {i18n("configureCity", "Configurer la ville")}
              </p>
            </div>
          </div>
          <Icon name="chevron-right" className="h-4 w-4 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]" />
        </Card>
      </Link>
    );
  }

  if (!data) {
    return (
      <Link href="/weather" className="group block h-full outline-none">
        <Card
          variant="widget"
          padding="sm"
          className={cn(
            "flex h-full items-center justify-between gap-3 transition-[box-shadow,transform] duration-200 ease-out group-hover:shadow-md",
            className,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--text-primary)]/[0.04]">
              <Icon name="cloud" className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{i18n("weather", "Météo")}</p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                {i18n("weatherEmptyHint", "Données météo indisponibles")}
              </p>
            </div>
          </div>
          <Icon name="chevron-right" className="h-4 w-4 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]" />
        </Card>
      </Link>
    );
  }

  const temp = toNum(data?.temperature) ?? toNum(data?.temperatureC);
  const condition = toStr(data?.condition) || toStr(data?.description) || "—";
  const city = toStr(data?.city) || toStr(data?.location) || i18n("weather", "Météo");
  const code = toNum(data?.weatherCode);
  const isDay = data?.isDay;
  const icon = weatherIconFromCode(code, condition, isDay);
  const color = weatherIconColor(code, isDay);
  const uv = toNum(data?.uvIndex) ?? toNum(data?.uv);
  const rain = toNum(data?.precipitationProbability) ?? toNum(data?.precipitation);

  return (
    <Link href="/weather" className="group block h-full outline-none" aria-label={i18n("weather", "Météo")}>
      <Card
        variant="widget"
        padding="sm"
        className={cn(
          "h-full transition-[box-shadow,transform] duration-200 ease-out group-hover:shadow-md",
          className,
        )}
      >
        <div className="flex h-full min-h-0 items-center gap-3">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="shrink-0"
          >
            <Icon name={icon} className={cn("h-10 w-10", color)} />
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {temp !== undefined ? `${Math.round(temp)}°` : "—"}
              </span>
              <span className="truncate text-xs font-medium capitalize text-[var(--text-muted)]">
                {condition}
              </span>
            </div>
            <p className="truncate text-[11px] text-[var(--text-muted)]">{city}</p>
            <p className="text-[10px] tabular-nums text-[var(--text-muted)]">
              {formatMinMax(data?.forecast)}
              {uv !== undefined && (
                <span className="ml-2">· UV {Math.round(uv)}</span>
              )}
              {rain !== undefined && (
                <span className="ml-2">· {Math.round(rain)}% pluie</span>
              )}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
