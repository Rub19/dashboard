"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal } from "@floating-ui/react";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useLayer } from "@/components/LayerProvider";
import { MapPin, Droplets, Wind, Calendar, ArrowRight } from "@/components/icons/ph";

type WeatherData = Record<string, unknown>;

type WeatherDetailPopoverProps = {
  open: boolean;
  onClose: () => void;
  referenceRef: HTMLElement | null;
  weather?: WeatherData | null;
  placement?: "bottom-end" | "top-end";
};

type ContentProps = {
  open: boolean;
  onClose: () => void;
  referenceRef: HTMLElement | null;
  weather: WeatherData | null;
};

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function weatherIconFromCondition(condition?: string): string | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "cloud-lightning";
  if (c.includes("rain") || c.includes("drizzle")) return "cloud-rain";
  if (c.includes("snow")) return "snowflake";
  if (c.includes("fog") || c.includes("mist")) return "cloud";
  if (c.includes("cloud")) return "cloud-sun";
  if (c.includes("clear") || c.includes("sun")) return "sun";
  return null;
}

function weatherIconFromCode(code?: number, condition?: string, isDay?: boolean): string {
  if (typeof code === "number") {
    if (code === 0) return isDay === false ? "moon" : "sun";
    if (code >= 1 && code <= 3) return "cloud-sun";
    if (code === 45 || code === 48) return "cloud";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "cloud-rain";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snowflake";
    if (code >= 95) return "cloud-lightning";
  }
  return weatherIconFromCondition(condition || "") || "cloud-sun";
}

function getWeatherTheme(code?: number, isDay?: boolean) {
  if (isDay === false) {
    return {
      glow: "from-indigo-500/25 via-purple-500/15 to-transparent",
      iconColor: "text-indigo-300",
      accent: "text-indigo-400",
    };
  }
  if (typeof code === "number") {
    if (code === 0 || code === 1) {
      return {
        glow: "from-amber-500/25 via-orange-500/15 to-transparent",
        iconColor: "text-amber-400",
        accent: "text-amber-400",
      };
    }
    if (code >= 2 && code <= 48) {
      return {
        glow: "from-sky-500/20 via-blue-500/15 to-transparent",
        iconColor: "text-sky-300",
        accent: "text-sky-400",
      };
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return {
        glow: "from-blue-600/25 via-cyan-600/15 to-transparent",
        iconColor: "text-blue-400",
        accent: "text-blue-400",
      };
    }
    if (code >= 71 && code <= 86) {
      return {
        glow: "from-cyan-400/25 via-teal-500/15 to-transparent",
        iconColor: "text-cyan-300",
        accent: "text-cyan-400",
      };
    }
    if (code >= 95) {
      return {
        glow: "from-purple-600/30 via-amber-500/20 to-transparent",
        iconColor: "text-amber-300",
        accent: "text-purple-400",
      };
    }
  }
  return {
    glow: "from-amber-500/20 via-sky-500/15 to-transparent",
    iconColor: "text-amber-400",
    accent: "text-amber-400",
  };
}

function WeatherIcon({
  weather,
  className,
}: {
  weather: WeatherData | null | undefined;
  className?: string;
}) {
  const iconUrl = asStr(weather?.iconUrl);
  const code = asNum(weather?.weatherCode);
  const condition = asStr(weather?.description) || asStr(weather?.condition);
  const isDay = asBool(weather?.isDay);

  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        width={40}
        height={40}
        className={`${className || ""} object-contain`}
      />
    );
  }

  const iconName = weatherIconFromCode(code, condition, isDay);
  return <Icon pack="phosphor" name={iconName} className={className} />;
}

function dayLabel(isoDate: string | undefined, lang: string): string {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang || "fr", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

function ForecastRow({
  day,
  lang,
  isToday,
  currentTemp,
  overallMin,
  overallMax,
}: {
  day: WeatherData;
  lang: string;
  isToday?: boolean;
  currentTemp?: number;
  overallMin: number;
  overallMax: number;
}) {
  const date = asStr(day.date);
  const min = asNum(day.min);
  const max = asNum(day.max);
  const condition = asStr(day.condition);
  const code = asNum(day.weatherCode);

  const range = Math.max(1, overallMax - overallMin);
  const dayMin = min !== undefined ? min : overallMin;
  const dayMax = max !== undefined ? max : overallMax;
  const leftPercent = Math.max(0, Math.min(90, ((dayMin - overallMin) / range) * 100));
  const spanPercent = Math.max(8, Math.min(100 - leftPercent, ((dayMax - dayMin) / range) * 100));

  const label = isToday
    ? lang.startsWith("fr")
      ? "Aujourd'hui"
      : "Today"
    : dayLabel(date, lang);

  return (
    <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/[0.05]">
      <span className="w-20 truncate font-medium text-[var(--text-primary)]">
        {label}
      </span>
      <div className="flex w-6 shrink-0 justify-center">
        <Icon
          pack="phosphor"
          name={weatherIconFromCode(code, condition)}
          className="h-3.5 w-3.5 text-amber-300"
        />
      </div>
      <span className="w-7 text-right tabular-nums text-[var(--text-muted)]">
        {min !== undefined ? `${Math.round(min)}°` : "—"}
      </span>
      <div className="relative mx-2 h-1.5 flex-1 min-w-[50px] max-w-[76px] overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 opacity-90 transition-all duration-300"
          style={{
            left: `${leftPercent}%`,
            width: `${spanPercent}%`,
          }}
        />
        {isToday && currentTemp !== undefined && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-[#090d16] bg-white shadow-sm ring-1 ring-white/40"
            style={{
              left: `${Math.max(0, Math.min(100, ((currentTemp - overallMin) / range) * 100))}%`,
            }}
          />
        )}
      </div>
      <span className="w-7 text-left font-semibold tabular-nums text-[var(--text-primary)]">
        {max !== undefined ? `${Math.round(max)}°` : "—"}
      </span>
    </div>
  );
}

function WeatherDetailContent({
  open,
  onClose,
  referenceRef,
  weather,
  placement = "bottom-end",
}: ContentProps & { placement?: "bottom-end" | "top-end" }) {
  const i18n = useI18n();
  const { settings } = useSettings();

  const { refs, floatingStyles, placement: actualPlacement, isPositioned } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    placement,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ padding: 10, crossAxis: false }),
      shift({ padding: 10, crossAxis: false }),
    ],
    elements: { reference: referenceRef },
  });

  useLayer(open, onClose, {
    boundary: refs.floating,
    anchor: referenceRef,
    kind: "popover",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: false,
    closeOnScroll: false,
    initialFocus: false,
    trapFocus: false,
  });

  const city = asStr(weather?.city) || asStr(weather?.location);
  const country = asStr(weather?.country);
  const displayLocation = city ? (country ? `${city}, ${country}` : city) : i18n("missingCity");
  const temp = asNum(weather?.temperature) ?? asNum(weather?.temperatureC);
  const apparentTemp = asNum(weather?.apparentTemperature);
  const condition = asStr(weather?.description) || asStr(weather?.condition);
  const humidity = asNum(weather?.humidityPercent);
  const wind = asNum(weather?.windSpeedKmh) ?? asNum(weather?.windSpeed);
  const code = asNum(weather?.weatherCode);
  const isDay = asBool(weather?.isDay);

  const forecast = useMemo(
    () =>
      (
        Array.isArray(weather?.forecast)
          ? (weather.forecast as unknown[]).filter(
              (d): d is WeatherData => typeof d === "object" && d !== null
            )
          : []
      ).slice(0, 5),
    [weather?.forecast]
  );

  const { overallMin, overallMax } = useMemo(() => {
    let minVal = 999;
    let maxVal = -999;
    forecast.forEach((d) => {
      const mn = asNum(d.min);
      const mx = asNum(d.max);
      if (mn !== undefined && mn < minVal) minVal = mn;
      if (mx !== undefined && mx > maxVal) maxVal = mx;
    });
    if (minVal === 999) minVal = temp !== undefined ? temp - 5 : 10;
    if (maxVal === -999) maxVal = temp !== undefined ? temp + 5 : 20;
    return { overallMin: minVal, overallMax: maxVal };
  }, [forecast, temp]);

  const lang = settings.language || "fr";
  const theme = getWeatherTheme(code, isDay);

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[var(--z-popover)] pointer-events-auto"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("weather")}
            data-weather-placement={actualPlacement}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: actualPlacement?.startsWith("top") ? 14 : -14,
                scale: 0.94,
              }}
              animate={{
                opacity: isPositioned ? 1 : 0,
                y: isPositioned ? 0 : actualPlacement?.startsWith("top") ? 14 : -14,
                scale: isPositioned ? 1 : 0.94,
              }}
              exit={{
                opacity: 0,
                y: actualPlacement?.startsWith("top") ? 10 : -10,
                scale: 0.96,
                transition: { duration: 0.16, ease: "easeOut" },
              }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 30,
                mass: 0.75,
              }}
              style={{
                visibility: isPositioned ? "visible" : "hidden",
                transformOrigin: actualPlacement?.startsWith("top")
                  ? "bottom right"
                  : "top right",
              }}
            >
              <div className="relative w-88 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0c1017]/92 dark:bg-[#070b13]/96 p-4.5 text-[var(--text-primary)] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-3xl">
                {/* Dynamic breathing sky aura */}
                <motion.div
                  animate={{
                    scale: [1, 1.12, 1],
                    opacity: [0.55, 0.75, 0.55],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className={`pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-gradient-to-br ${theme.glow} blur-3xl`}
                  aria-hidden="true"
                />

                <div className="relative space-y-3.5">
                  {/* Top mini-bar: City & Live Indicator */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <span
                        className="truncate text-xs font-bold text-[var(--text-primary)]"
                        translate="no"
                        title={displayLocation}
                      >
                        {displayLocation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{i18n("live") || "En direct"}</span>
                      </div>
                      <motion.button
                        type="button"
                        onClick={onClose}
                        whileHover={{ scale: 1.12, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={i18n("close")}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        <Icon pack="phosphor" name="close" className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Hero Section: Temperature & Big Icon */}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight text-[var(--text-primary)] tabular-nums">
                          {temp !== undefined ? Math.round(temp * 10) / 10 : "—"}
                        </span>
                        <span className="text-2xl font-bold text-[var(--text-muted)]">°C</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                        {condition && (
                          <span className="capitalize font-semibold text-[var(--text-primary)]" translate="no">
                            {condition}
                          </span>
                        )}
                        {apparentTemp !== undefined && (
                          <span className="text-[var(--text-muted)] font-medium">
                            • {i18n("apparent") || "Ressenti"} {Math.round(apparentTemp)}°
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.div
                      animate={{ y: [-2, 3, -2] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="relative flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] shadow-inner backdrop-blur-md"
                    >
                      <WeatherIcon weather={weather} className="h-9 w-9 text-amber-300 drop-shadow-[0_4px_12px_rgba(251,191,36,0.35)]" />
                    </motion.div>
                  </div>

                  {/* Quick Stats: Humidity & Wind Bento Cards */}
                  {(humidity !== undefined || wind !== undefined) && (
                    <div className="grid grid-cols-2 gap-2">
                      {humidity !== undefined && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            <Droplets className="h-3.5 w-3.5" />
                            <span>{i18n("humidity")}</span>
                          </div>
                          <p className="mt-1 text-base font-bold tabular-nums text-[var(--text-primary)]">
                            {humidity}%
                          </p>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, humidity))}%` }}
                            />
                          </div>
                        </motion.div>
                      )}
                      {wind !== undefined && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5 transition-colors hover:border-sky-400/30 hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                            <Wind className="h-3.5 w-3.5" />
                            <span>{i18n("wind")}</span>
                          </div>
                          <p className="mt-1 text-base font-bold tabular-nums text-[var(--text-primary)]">
                            {wind} <span className="text-xs font-normal text-[var(--text-muted)]">km/h</span>
                          </p>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(0, (wind / 70) * 100))}%`,
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* 5-Day Forecast Apple Weather Style */}
                  {forecast.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>{i18n("forecast5Days") || i18n("forecast")}</span>
                      </div>
                      <div className="space-y-0.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1.5">
                        {forecast.map((day, i) => (
                          <ForecastRow
                            key={i}
                            day={day}
                            lang={lang}
                            isToday={i === 0}
                            currentTemp={i === 0 ? temp : undefined}
                            overallMin={overallMin}
                            overallMax={overallMax}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer CTA: Apple Glass Button */}
                  <Link
                    href="/weather"
                    onClick={onClose}
                    className="group flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/[0.18] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all duration-150 active:scale-[0.98]"
                  >
                    <span>{i18n("weatherSeePage")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}

function WeatherDetailPopoverWithLiveData(props: Omit<WeatherDetailPopoverProps, "weather">) {
  const { weather } = useLiveData();
  return <WeatherDetailContent {...props} weather={weather as WeatherData | null} />;
}

export default function WeatherDetailPopover(props: WeatherDetailPopoverProps) {
  if (props.weather === undefined) {
    return <WeatherDetailPopoverWithLiveData {...props} />;
  }
  return <WeatherDetailContent {...props} weather={props.weather} />;
}
