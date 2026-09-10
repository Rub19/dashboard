"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

export type ForecastDay = {
  date?: string;
  min?: number;
  max?: number;
  condition?: string;
  weatherCode?: number;
};

export type HourlyForecast = {
  time: string;
  temperature?: number;
  weatherCode?: number;
  precipitation?: number;
  precipitationProbability?: number;
  isDay?: boolean;
};

export type DailyForecast = {
  date: string;
  min?: number;
  max?: number;
  weatherCode?: number;
  precipitationProbability?: number;
  sunrise?: string;
  sunset?: string;
};

export type AirQualityDetails = {
  aqi?: number;
  pm10?: number;
  pm25?: number;
};

export type WeatherData = {
  updatedAt?: string;
  latitude?: number;
  longitude?: number;
  temperature?: number;
  temperatureC?: number;
  apparentTemperature?: number;
  feelsLike?: number;
  weatherCode?: number;
  condition?: string;
  description?: string;
  location?: string;
  city?: string;
  country?: string;
  humidityPercent?: number;
  windSpeedKmh?: number;
  windSpeed?: number;
  windDirection?: number;
  windGustsKmh?: number;
  isDay?: boolean;
  uvIndex?: number;
  uv?: number;
  precipitationProbability?: number;
  precipitation?: number;
  visibility?: number;
  dewPoint?: number;
  sunrise?: string;
  sunset?: string;
  pressure?: number;
  surfacePressure?: number;
  airQuality?: number;
  airQualityIndex?: number;
  airQualityLabel?: string;
  airQualityDetails?: AirQualityDetails;
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
  forecast?: ForecastDay[];
  iconUrl?: string;
};

type WeatherWidgetProps = {
  data?: WeatherData | null;
  loading?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
  className?: string;
};

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

function weatherIconFromCondition(condition?: string): string | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("orage")) return "cloudLightning";
  if (c.includes("rain") || c.includes("pluie") || c.includes("drizzle") || c.includes("bruine") || c.includes("averse")) return "cloudRain";
  if (c.includes("snow") || c.includes("neige")) return "snowflake";
  if (c.includes("fog") || c.includes("mist") || c.includes("brouillard")) return "cloud";
  if (c.includes("cloud") || c.includes("nuage")) return c.includes("sun") || c.includes("clair") ? "cloudSun" : "cloud";
  if (c.includes("clear") || c.includes("sun") || c.includes("soleil") || c.includes("dégagé")) return "sun";
  return null;
}

export function weatherIconFromCode(code?: number, condition?: string, isDay?: boolean): string {
  if (typeof code === "number") {
    if (code === 0) return isDay === false ? "moon" : "sun";
    if (code >= 1 && code <= 3) return isDay === false ? "cloudMoon" : "cloudSun";
    if (code === 45 || code === 48) return "cloudFog";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "cloudRain";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "cloudSnow";
    if (code >= 95) return "cloudLightning";
  }
  return weatherIconFromCondition(condition || "") || (isDay === false ? "cloudMoon" : "cloudSun");
}

/**
 * Kept for API compatibility with existing callers. The old per-condition
 * rainbow gradient + neon glow washes were the biggest "generic AI dashboard"
 * tell on the weather surface — now a no-op: panels use the flat theme surface.
 */
export function weatherAmbience(_code?: number, _isDay?: boolean): { gradient: string; border: string; glow: string } {
  return { gradient: "", border: "border-[var(--panel-border)]", glow: "" };
}

/**
 * Monochrome weather icons — reads correctly on every one of the 16 themes
 * (light included) instead of hardcoded amber/sky/indigo that only worked on
 * the near-black default.
 */
export function weatherIconColor(_code?: number, _isDay?: boolean): string {
  return "text-[var(--text-primary)]";
}

function formatShortDay(iso?: string, locale = "fr"): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
}

function formatTime(iso?: string, locale = "fr"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

const SKELETON_PILLS = Array.from({ length: 4 });
const SKELETON_COMPACT_GRID = Array.from({ length: 3 });
const SKELETON_FULL_GRID = Array.from({ length: 5 });

const AnimatedWeatherIcon = memo(function AnimatedWeatherIcon({
  name,
  colorClass,
  compact,
}: {
  name: string;
  colorClass: string;
  compact?: boolean;
}) {
  return (
    <div className={`shrink-0 ${compact ? "h-10 w-10" : "h-14 w-14 md:h-16 md:w-16"}`}>
      <Icon name={name} className={`h-full w-full ${colorClass}`} />
    </div>
  );
});

const WeatherBadge = memo(function WeatherBadge({
  icon,
  label,
  value,
}: {
  icon: string;
  label?: string;
  value: string;
  /** retained for call-site compatibility; icons are monochrome now */
  tone?: "zinc" | "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  return (
    <div className="flex w-full items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]">
      <Icon name={icon} className="h-3 w-3 text-[var(--text-muted)]" />
      {label && <span className="text-[var(--text-muted)]">{label}</span>}
      <span>{value}</span>
    </div>
  );
});

const ForecastPill = memo(function ForecastPill({ day, icon, colorClass, compact }: { day: ForecastDay; icon: string; colorClass: string; compact?: boolean }) {
  const i18n = useI18n();
  const locale = i18n("daysShort")?.includes(",") ? "fr" : "en";
  const min = toNum(day.min);
  const max = toNum(day.max);

  return (
    <div className="v8-inset flex min-h-[64px] flex-col items-center gap-1 p-2.5 transition-colors hover:bg-[var(--surface-2)]/50">
      <span className="text-[11px] font-medium uppercase text-[var(--text-muted)]">{formatShortDay(day.date, locale)}</span>
      <Icon name={icon} className={`my-0.5 ${compact ? "h-4 w-4" : "h-5 w-5"} ${colorClass}`} />
      <span className={`font-semibold tabular-nums text-[var(--text-primary)] ${compact ? "text-[10px]" : "text-xs"}`}>
        {min !== undefined ? `${Math.round(min)}°` : "—"}{" "}
        <span className="text-[var(--text-muted)]">/ {max !== undefined ? `${Math.round(max)}°` : "—"}</span>
      </span>
    </div>
  );
});

const WeatherSkeleton = memo(function WeatherSkeleton({ compact }: { compact?: boolean }) {
  const grid = compact ? SKELETON_COMPACT_GRID : SKELETON_FULL_GRID;
  return (
    <div
      className={`v8-panel animate-pulse space-y-4 p-5 ${
        compact ? "min-h-[130px]" : "min-h-[260px]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`rounded-xl bg-[var(--text-primary)]/[0.06] ${compact ? "h-10 w-10" : "h-16 w-16"}`} />
          <div className="space-y-2">
            <div className={`rounded bg-[var(--text-primary)]/[0.06] ${compact ? "h-6 w-16" : "h-10 w-24"}`} />
            <div className="h-3 w-32 rounded bg-[var(--text-primary)]/[0.04]" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {SKELETON_PILLS.map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-xl bg-[var(--text-primary)]/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {grid.map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--text-primary)]/[0.04]" />
        ))}
      </div>
    </div>
  );
});

const WeatherWidget = memo(function WeatherWidget({ data, loading, onRefresh, compact, className }: WeatherWidgetProps) {
  const i18n = useI18n();

  const code = useMemo(() => toNum(data?.weatherCode), [data?.weatherCode]);
  const isDay = data?.isDay;
  const condition = toStr(data?.condition) || toStr(data?.description) || "—";
  const city = toStr(data?.city) || toStr(data?.location) || "—";
  const country = toStr(data?.country);
  const temp = toNum(data?.temperature) ?? toNum(data?.temperatureC);
  const feelsLike = toNum(data?.apparentTemperature) ?? toNum(data?.feelsLike);
  const humidity = toNum(data?.humidityPercent);
  const wind = toNum(data?.windSpeedKmh) ?? toNum(data?.windSpeed);
  const uv = toNum(data?.uvIndex) ?? toNum(data?.uv);
  const pressure = toNum(data?.pressure) ?? toNum(data?.surfacePressure);
  const aqi = toNum(data?.airQuality) ?? toNum(data?.airQualityIndex);
  const aqiLabel = toStr(data?.airQualityLabel);
  const sunrise = toStr(data?.sunrise);
  const sunset = toStr(data?.sunset);
  const forecast = useMemo(() => (data?.forecast || []).slice(0, 5), [data?.forecast]);

  const iconColor = weatherIconColor(code, isDay);
  const iconName = weatherIconFromCode(code, condition, isDay);
  const locale = i18n("daysShort")?.includes(",") ? "fr" : "en";

  if (loading && !data) {
    return <WeatherSkeleton compact={compact} />;
  }

  if (!data) {
    return (
      <div
        className={`v8-panel flex flex-col items-center justify-center gap-2 p-5 text-center ${
          compact ? "min-h-[130px]" : "min-h-[260px]"
        } ${className || ""}`}
      >
        <Icon name="cloud" className="h-9 w-9 text-[var(--text-muted)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">{i18n("noForecast", "Météo indisponible")}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{i18n("weatherEmptyHint", "Vérifiez la connexion ou configurez une ville.")}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/weather"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)]/[0.08] active:scale-95"
          >
            <Icon name="map-pin" className="h-3 w-3" />
            {i18n("configureCity", "Configurer la ville")}
          </Link>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)]/[0.08] active:scale-95"
            >
              <Icon name="refresh-cw" className="h-3 w-3" />
              {i18n("refresh")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`v8-panel group flex h-full min-h-0 flex-col overflow-hidden p-4 ${className || ""}`}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className={`flex gap-2 ${compact ? "items-center" : "flex-col items-start"}`}>
            <AnimatedWeatherIcon name={iconName} colorClass={iconColor} compact={compact} />
            <div className="min-w-0">
              <p className={`font-bold tracking-tight text-[var(--text-primary)] ${compact ? "text-2xl" : "text-3xl md:text-4xl"}`}>
                {temp !== undefined ? `${Math.round(temp)}°` : "—"}
              </p>
              <p className={`font-medium capitalize text-[var(--text-primary)] ${compact ? "text-[10px]" : "text-xs"}`}>{condition}</p>
              <p className={`truncate text-[var(--text-muted)] ${compact ? "text-[10px]" : "text-xs"}`}>
                {city}
                {country ? `, ${country}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-1.5">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                aria-label={i18n("refresh")}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <motion.span
                  className="inline-block"
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon name="refresh-cw" className="h-3 w-3" />
                </motion.span>
              </button>
            )}
          </div>
        </div>

        {/* Quick indicators */}
        <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${compact ? "mt-2" : "mt-4"}`}>
          {feelsLike !== undefined && (
            <WeatherBadge
              icon="thermometer"
              value={`${Math.round(feelsLike)}°C`}
              label={i18n("weatherFeelsLike") || "Ressenti"}
              tone="rose"
            />
          )}
          {humidity !== undefined && (
            <WeatherBadge icon="droplets" value={`${Math.round(humidity)}%`} label={i18n("humidity")} tone="cyan" />
          )}
          {wind !== undefined && (
            <WeatherBadge icon="wind" value={`${Math.round(wind)} km/h`} label={i18n("wind")} tone="emerald" />
          )}
          {uv !== undefined && (
            <WeatherBadge icon="sun" value={String(Math.round(uv))} label={i18n("weatherUV") || "UV"} tone="amber" />
          )}
        </div>

        {/* Extra indicators */}
        {!compact && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sunrise && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Icon name="sunrise" className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>{formatTime(sunrise, locale)}</span>
              </div>
            )}
            {sunset && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Icon name="sunset" className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>{formatTime(sunset, locale)}</span>
              </div>
            )}
            {pressure !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Icon name="gauge" className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>
                  {Math.round(pressure)} {i18n("weatherPressureUnit") || "hPa"}
                </span>
              </div>
            )}
            {aqi !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Icon name="wind" className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>
                  {aqiLabel || `${i18n("weatherAirQuality") || "AQI"} ${Math.round(aqi)}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Forecast pills */}
        {forecast.length > 0 && (
          <div className={`mt-auto ${compact ? "pt-2" : "pt-4"}`}>
            <div className="grid grid-cols-5 gap-2">
              {forecast.map((day, i) => {
                const dayCode = toNum(day.weatherCode);
                const dayIcon = weatherIconFromCode(dayCode, day.condition, true);
                return <ForecastPill key={i} day={day} icon={dayIcon} colorClass={weatherIconColor(dayCode, true)} compact={compact} />;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default WeatherWidget;
