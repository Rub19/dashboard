"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { TiltCard } from "@/components/ui/TiltCard";

export type ForecastDay = {
  date?: string;
  min?: number;
  max?: number;
  condition?: string;
  weatherCode?: number;
};

export type WeatherData = {
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
  isDay?: boolean;
  uvIndex?: number;
  uv?: number;
  sunrise?: string;
  sunset?: string;
  pressure?: number;
  surfacePressure?: number;
  airQuality?: number;
  airQualityIndex?: number;
  airQualityLabel?: string;
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

export function weatherAmbience(code?: number, isDay?: boolean): { gradient: string; border: string; glow: string } {
  const isNight = isDay === false;

  // Thunderstorm: violet / amber "orage" theme
  if (code !== undefined && code >= 95) {
    return {
      gradient: "bg-gradient-to-br from-violet-900/40 via-amber-950/20 to-zinc-950",
      border: "border-violet-500/30",
      glow: "bg-violet-500",
    };
  }

  // Clear / sunny
  if (code === 0) {
    return isNight
      ? {
          gradient: "bg-gradient-to-br from-indigo-900/30 via-zinc-950/80 to-zinc-950",
          border: "border-indigo-500/20",
          glow: "bg-indigo-500",
        }
      : {
          gradient: "bg-gradient-to-br from-amber-500/15 via-zinc-950/80 to-zinc-950",
          border: "border-amber-500/20",
          glow: "bg-amber-500",
        };
  }

  // Partly cloudy
  if (code !== undefined && code >= 1 && code <= 3) {
    return isNight
      ? {
          gradient: "bg-gradient-to-br from-indigo-800/20 via-zinc-950/80 to-zinc-950",
          border: "border-indigo-400/20",
          glow: "bg-indigo-400",
        }
      : {
          gradient: "bg-gradient-to-br from-sky-500/10 via-amber-500/5 to-zinc-950",
          border: "border-sky-500/20",
          glow: "bg-sky-400",
        };
  }

  // Fog / mist
  if (code === 45 || code === 48) {
    return {
      gradient: "bg-gradient-to-br from-slate-500/10 via-zinc-950/80 to-zinc-950",
      border: "border-slate-500/20",
      glow: "bg-slate-400",
    };
  }

  // Drizzle / rain
  if ((code !== undefined && code >= 51 && code <= 67) || (code !== undefined && code >= 80 && code <= 82)) {
    return {
      gradient: "bg-gradient-to-br from-sky-700/20 via-zinc-950/80 to-zinc-950",
      border: "border-sky-500/20",
      glow: "bg-sky-500",
    };
  }

  // Snow
  if ((code !== undefined && code >= 71 && code <= 77) || (code !== undefined && code >= 85 && code <= 86)) {
    return {
      gradient: "bg-gradient-to-br from-cyan-600/10 via-zinc-950/80 to-zinc-950",
      border: "border-cyan-500/20",
      glow: "bg-cyan-400",
    };
  }

  // Default
  return {
    gradient: "bg-gradient-to-br from-indigo-500/10 via-zinc-950/80 to-zinc-950",
    border: "border-indigo-500/20",
    glow: "bg-indigo-500",
  };
}

export function weatherIconColor(code?: number, isDay?: boolean): string {
  if (code === 0) return isDay === false ? "text-indigo-300" : "text-amber-400";
  if (code !== undefined && code >= 1 && code <= 3) return isDay === false ? "text-indigo-300" : "text-amber-300";
  if (code === 45 || code === 48) return "text-slate-400";
  if ((code !== undefined && code >= 51 && code <= 67) || (code !== undefined && code >= 80 && code <= 82)) return "text-sky-400";
  if ((code !== undefined && code >= 71 && code <= 77) || (code !== undefined && code >= 85 && code <= 86)) return "text-[--info]";
  if (code !== undefined && code >= 95) return "text-violet-400";
  return isDay === false ? "text-indigo-300" : "text-amber-400";
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

function AnimatedWeatherIcon({
  name,
  colorClass,
  compact,
}: {
  name: string;
  colorClass: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`shrink-0 ${compact ? "h-10 w-10" : "h-14 w-14 md:h-16 md:w-16"}`}
    >
      <Icon name={name} className={`h-full w-full ${colorClass}`} />
    </motion.div>
  );
}

function WeatherBadge({
  icon,
  label,
  value,
  tone = "zinc",
}: {
  icon: string;
  label?: string;
  value: string;
  tone?: "zinc" | "cyan" | "emerald" | "amber" | "rose" | "violet";
}) {
  const toneClass = {
    zinc: "text-zinc-300",
    cyan: "text-[--info]",
    emerald: "text-[--accent-primary]",
    amber: "text-amber-400",
    rose: "text-rose-400",
    violet: "text-violet-400",
  }[tone];

  return (
    <div className="flex w-full items-center gap-1.5 rounded-xl bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-inset ring-white/[0.06] backdrop-blur-sm">
      <Icon name={icon} className={`h-3 w-3 ${toneClass}`} />
      {label && <span className="text-zinc-500">{label}</span>}
      <span>{value}</span>
    </div>
  );
}

function ForecastPill({ day, icon, colorClass, compact }: { day: ForecastDay; icon: string; colorClass: string; compact?: boolean }) {
  const i18n = useI18n();
  const locale = i18n("daysShort")?.includes(",") ? "fr" : "en";
  const min = toNum(day.min);
  const max = toNum(day.max);

  return (
    <div className="v8-inset flex min-h-[64px] flex-col items-center gap-1 p-2.5 transition-colors hover:bg-black/50">
      <span className="text-[11px] font-medium uppercase text-zinc-400">{formatShortDay(day.date, locale)}</span>
      <Icon name={icon} className={`my-0.5 ${compact ? "h-4 w-4" : "h-5 w-5"} ${colorClass}`} />
      <span className={`font-mono font-semibold text-white ${compact ? "text-[10px]" : "text-xs"}`}>
        {min !== undefined ? `${Math.round(min)}°` : "—"}{" "}
        <span className="text-zinc-500">/ {max !== undefined ? `${Math.round(max)}°` : "—"}</span>
      </span>
    </div>
  );
}

function WeatherSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`animate-pulse space-y-4 rounded-2xl bg-white/[0.04] p-5 backdrop-blur-2xl ${
        compact ? "min-h-[130px]" : "min-h-[260px]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`rounded-xl bg-white/[0.06] ${compact ? "h-10 w-10" : "h-16 w-16"}`} />
          <div className="space-y-2">
            <div className={`rounded bg-white/[0.06] ${compact ? "h-6 w-16" : "h-10 w-24"}`} />
            <div className="h-3 w-32 rounded bg-white/[0.04]" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export default function WeatherWidget({ data, loading, onRefresh, compact, className }: WeatherWidgetProps) {
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

  const { gradient, glow } = weatherAmbience(code, isDay);
  const iconColor = weatherIconColor(code, isDay);
  const iconName = weatherIconFromCode(code, condition, isDay);
  const locale = i18n("daysShort")?.includes(",") ? "fr" : "en";

  if (loading && !data) {
    return <WeatherSkeleton compact={compact} />;
  }

  if (!data) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-zinc-950/60 p-5 text-center backdrop-blur-2xl ${
          compact ? "min-h-[130px]" : "min-h-[260px]"
        } ${className || ""}`}
      >
        <Icon name="cloud" className="h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-400">{i18n("noForecast")}</p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
          >
            <Icon name="refresh-cw" className="h-3 w-3" />
            {i18n("refresh")}
          </button>
        )}
      </div>
    );
  }

  return (
    <TiltCard
      className={`group h-full min-h-0 bg-zinc-950/70 p-4 shadow-xl shadow-black/50 backdrop-blur-2xl transition-colors ${gradient} ${
        className || ""
      }`}
    >
      {/* Ambient neon glow */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${glow} blur-2xl opacity-30 transition-opacity group-hover:opacity-40`}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className={`flex gap-2 ${compact ? "items-center" : "flex-col items-start"}`}>
            <AnimatedWeatherIcon name={iconName} colorClass={iconColor} compact={compact} />
            <div className="min-w-0">
              <p className={`font-bold tracking-tight text-white ${compact ? "text-2xl" : "text-3xl md:text-4xl"}`}>
                {temp !== undefined ? `${Math.round(temp)}°` : "—"}
              </p>
              <p className={`font-medium capitalize text-zinc-300 ${compact ? "text-[10px]" : "text-xs"}`}>{condition}</p>
              <p className={`truncate text-zinc-500 ${compact ? "text-[10px]" : "text-xs"}`}>
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
                className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
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
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Icon name="sunrise" className="h-3.5 w-3.5 text-amber-300" />
                <span>{formatTime(sunrise, locale)}</span>
              </div>
            )}
            {sunset && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Icon name="sunset" className="h-3.5 w-3.5 text-indigo-300" />
                <span>{formatTime(sunset, locale)}</span>
              </div>
            )}
            {pressure !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Icon name="gauge" className="h-3.5 w-3.5 text-[--accent-primary]" />
                <span>
                  {Math.round(pressure)} {i18n("weatherPressureUnit") || "hPa"}
                </span>
              </div>
            )}
            {aqi !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Icon name="wind" className="h-3.5 w-3.5 text-sky-400" />
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
    </TiltCard>
  );
}
