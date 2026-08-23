"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal } from "@floating-ui/react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import Card3D from "@/components/Card3D";
import { useLayer } from "@/components/LayerProvider";

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
      <Image
        src={iconUrl}
        alt=""
        width={40}
        height={40}
        unoptimized
        className={`${className || ""} object-contain`}
      />
    );
  }

  const iconName = weatherIconFromCode(code, condition, isDay);
  return <Icon name={iconName} className={className} />;
}

function dayLabel(isoDate: string | undefined, lang: string): string {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang || "fr", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function ForecastRow({ day, lang }: { day: WeatherData; lang: string }) {
  const date = asStr(day.date);
  const min = asNum(day.min);
  const max = asNum(day.max);
  const condition = asStr(day.condition);
  const code = asNum(day.weatherCode);

  return (
    <div className="flex items-center justify-between rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm">
      <span className="text-[var(--muted)]">{dayLabel(date, lang)}</span>
      <div className="flex items-center gap-2">
        <Icon name={weatherIconFromCode(code, condition)} className="h-4 w-4" />
        <span className="font-medium tabular-nums">
          {min !== undefined ? `${min}°` : "—"} / {max !== undefined ? `${max}°` : "—"}
        </span>
      </div>
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
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles, placement: actualPlacement } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    placement,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8, crossAxis: false }), shift({ padding: 8, crossAxis: false })],
    elements: { reference: referenceRef },
  });

  useLayer(open, onClose, {
    boundary: panelRef,
    anchor: referenceRef,
    kind: "popover",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    initialFocus: true,
    trapFocus: false,
  });

  const city = asStr(weather?.city) || asStr(weather?.location);
  const country = asStr(weather?.country);
  const displayLocation = city ? (country ? `${city}, ${country}` : city) : i18n("missingCity");
  const temp = asNum(weather?.temperature) ?? asNum(weather?.temperatureC);
  const condition = asStr(weather?.description) || asStr(weather?.condition);
  const humidity = asNum(weather?.humidityPercent);
  const wind = asNum(weather?.windSpeedKmh) ?? asNum(weather?.windSpeed);
  const forecast = (
    Array.isArray(weather?.forecast) ? (weather.forecast as WeatherData[]) : []
  ).slice(0, 5);

  const setRefs = (el: HTMLDivElement | null) => {
    panelRef.current = el;
    refs.setFloating(el as unknown as HTMLElement);
  };

  const lang = settings.language || "fr";

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            style={floatingStyles}
            className="z-[90] w-80 max-w-[calc(100vw-1rem)]"
            role="dialog"
            aria-modal="true"
            aria-label={i18n("weather")}
            data-weather-placement={actualPlacement}
          >
            <Card3D>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <WeatherIcon weather={weather} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--foreground)]" translate="no">
                      {displayLocation}
                    </p>
                    {condition && (
                      <p className="text-sm text-[var(--muted)] capitalize" translate="no">
                        {condition}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
                      {temp !== undefined ? `${temp}°C` : "—"}
                    </p>
                  </div>
                </div>

                {(humidity !== undefined || wind !== undefined) && (
                  <div className="grid grid-cols-2 gap-2">
                    {humidity !== undefined && (
                      <div className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm">
                        <Icon name="droplets" className="h-4 w-4 text-sky-400" />
                        <span className="font-medium">{humidity}%</span>
                        <span className="text-[var(--muted)]">{i18n("humidity")}</span>
                      </div>
                    )}
                    {wind !== undefined && (
                      <div className="flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2 text-sm">
                        <Icon name="wind" className="h-4 w-4 text-[--accent-primary]" />
                        <span className="font-medium">{wind} km/h</span>
                        <span className="text-[var(--muted)]">{i18n("wind")}</span>
                      </div>
                    )}
                  </div>
                )}

                {forecast.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      {i18n("forecast")}
                    </p>
                    <div className="space-y-1.5">
                      {forecast.map((day, i) => (
                        <ForecastRow key={i} day={day} lang={lang} />
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href="/weather"
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {i18n("weatherSeePage")}
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </div>
            </Card3D>
          </motion.div>
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

