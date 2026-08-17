"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import { Icon } from "@/lib/icons";
import WeatherMetricCard from "@/components/WeatherMetricCard";
import WeatherForecastList from "@/components/WeatherForecastList";
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

function formatTime(iso?: string, locale = "fr"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

function uvLabel(uv: number): string {
  if (uv <= 2) return "Faible";
  if (uv <= 5) return "Modéré";
  if (uv <= 7) return "Fort";
  if (uv <= 10) return "Très fort";
  return "Extrême";
}

function aqiLabel(aqi: number): string {
  if (aqi <= 20) return "Excellent";
  if (aqi <= 50) return "Bon";
  if (aqi <= 100) return "Moyen";
  if (aqi <= 150) return "Médiocre";
  return "Mauvais";
}

function WeatherPageSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-12 gap-4">
      <div className="col-span-12 min-h-[260px] rounded-2xl bg-white/[0.03] lg:col-span-8" />
      <div className="col-span-12 min-h-[260px] rounded-2xl bg-white/[0.03] lg:col-span-4" />
      <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings, update } = useSettings();
  const initial = settings.liveWeatherCity || "Paris";

  const [query, setQuery] = useState(initial);
  const [searchTerm, setSearchTerm] = useState(initial);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isUserEditingRef = useRef(false);

  const cityFromSettings = settings.liveWeatherCity || "Paris";

  useEffect(() => {
    if (isUserEditingRef.current) return;
    if (cityFromSettings !== searchTerm) {
      setQuery(cityFromSettings);
      setSearchTerm(cityFromSettings);
    }
  }, [cityFromSettings, searchTerm]);

  function handleQueryChange(value: string) {
    isUserEditingRef.current = true;
    setQuery(value);
  }

  const debouncedTerm = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedTerm.length >= 2) setSearchTerm(debouncedTerm);
    }, 600);
    return () => clearTimeout(timer);
  }, [debouncedTerm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker(`/api/weather?city=${encodeURIComponent(searchTerm)}`);
      setWeather((res?.data as WeatherData) || null);
    } catch {
      setError(i18n("weatherError"));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, i18n]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    async function run() {
      try {
        const res = await fetchWorker(`/api/weather?city=${encodeURIComponent(searchTerm)}`);
        if (cancelled) return;
        if (res?.data) {
          setWeather(res.data as WeatherData);
          isUserEditingRef.current = false;
          if (settings.liveWeatherCity !== searchTerm) {
            update({ liveWeatherCity: searchTerm });
          }
        } else {
          setWeather(null);
        }
      } catch {
        if (!cancelled) setError(i18n("weatherError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [searchTerm, i18n, settings.liveWeatherCity, update]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    isUserEditingRef.current = true;
    setSearchTerm(term);
  }

  function handleGeolocate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showError(i18n("error"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${settings.language || "fr"}`
          );
          const data = await res.json();
          const city = data.city || data.locality || data.town || data.municipality || data.village;
          if (!city) throw new Error("city not found");
          isUserEditingRef.current = true;
          setQuery(city);
          setSearchTerm(city);
          success(i18n("cityFound"));
        } catch {
          showError(i18n("weatherError"));
        }
      },
      () => showError(i18n("weatherError"))
    );
  }

  const code = weather?.weatherCode;
  const isDay = weather?.isDay;
  const condition = toStr(weather?.condition) || toStr(weather?.description) || i18n("noForecast");
  const city = toStr(weather?.city) || toStr(weather?.location) || "—";
  const country = toStr(weather?.country);
  const temp = toNum(weather?.temperature) ?? toNum(weather?.temperatureC);
  const feelsLike = toNum(weather?.apparentTemperature) ?? toNum(weather?.feelsLike);
  const humidity = toNum(weather?.humidityPercent);
  const wind = toNum(weather?.windSpeedKmh) ?? toNum(weather?.windSpeed);
  const uv = toNum(weather?.uvIndex) ?? toNum(weather?.uv);
  const pressure = toNum(weather?.pressure) ?? toNum(weather?.surfacePressure);
  const aqi = toNum(weather?.airQuality) ?? toNum(weather?.airQualityIndex);
  const aqiLabelText = toStr(weather?.airQualityLabel) || (aqi !== undefined ? aqiLabel(aqi) : undefined);
  const sunrise = toStr(weather?.sunrise);
  const sunset = toStr(weather?.sunset);
  const forecast = weather?.forecast || [];

  const iconColor = weatherIconColor(code, isDay);
  const iconName = weatherIconFromCode(code, condition, isDay);

  const today = forecast[0];
  const todayMin = toNum(today?.min);
  const todayMax = toNum(today?.max);

  const locale = i18n("daysShort")?.includes(",") ? "fr" : "en";
  const localTime = new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const metrics: { icon: string; iconColor: string; label: string; value: string; sub?: string }[] = [];
  if (wind !== undefined) {
    metrics.push({ icon: "wind", iconColor: "text-cyan-400", label: i18n("wind"), value: `${Math.round(wind)} km/h`, sub: i18n("weatherWindSub") || "Vitesse" });
  }
  if (humidity !== undefined) {
    metrics.push({ icon: "droplets", iconColor: "text-blue-400", label: i18n("humidity"), value: `${Math.round(humidity)}%`, sub: i18n("weatherHumiditySub") || "Humidité relative" });
  }
  if (uv !== undefined) {
    metrics.push({ icon: "sun", iconColor: "text-amber-400", label: i18n("weatherUV") || "UV", value: `${Math.round(uv)}`, sub: uvLabel(uv) });
  }
  if (aqi !== undefined) {
    metrics.push({ icon: "leaf", iconColor: "text-emerald-400", label: i18n("weatherAirQuality") || "Qualité de l'air", value: `${Math.round(aqi)}`, sub: aqiLabelText || aqiLabel(aqi) });
  }
  if (pressure !== undefined) {
    metrics.push({ icon: "gauge", iconColor: "text-purple-400", label: i18n("weatherPressure") || "Pression", value: `${Math.round(pressure)} hPa`, sub: i18n("weatherPressureUnit") || "Tendance stable" });
  }
  if (sunrise || sunset) {
    metrics.push({
      icon: "sunrise",
      iconColor: "text-amber-300",
      label: i18n("weatherSun") || "Soleil",
      value: `${sunrise ? formatTime(sunrise, locale) : "—"} / ${sunset ? formatTime(sunset, locale) : "—"}`,
      sub: `${i18n("sunrise") || "Lever"} / ${i18n("sunset") || "Coucher"}`,
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{i18n("weather")}</h1>
          <p className="text-sm text-zinc-500">{i18n("weatherDescription")}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="group flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 transition-all focus-within:border-white/20">
            <Icon name="mapPin" className="h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={i18n("city")}
              className="w-48 bg-transparent text-xs text-white outline-none placeholder-zinc-500 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={handleGeolocate}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-colors hover:text-white"
            aria-label={i18n("geolocate")}
          >
            <Icon name="navigation" className="h-3.5 w-3.5" />
          </button>

          <button
            type="submit"
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
            style={{ background: "var(--accent-color, #10b981)", color: "#09090b" }}
          >
            {i18n("search")}
          </button>
        </form>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-400">{error}</div>
      ) : loading && !weather ? (
        <WeatherPageSkeleton />
      ) : !weather ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] p-6 text-center">
          <Icon name="cloud" className="h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">{i18n("noForecast")}</p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-12 gap-4">
          {/* Hero */}
          <div className="relative col-span-12 overflow-hidden rounded-2xl border border-white/[0.08] p-6 lg:col-span-8">

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-bold text-white">
                    <Icon name="mapPin" className="h-4 w-4 text-zinc-500" />
                    <span>
                      {city}
                      {country ? `, ${country}` : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium capitalize text-zinc-300">{condition}</p>
                  <p className="text-[10px] text-zinc-500">{localTime}</p>
                </div>
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-white disabled:opacity-50"
                  aria-label={i18n("refresh")}
                >
                  <Icon name="refresh-cw" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="mt-6 flex items-start gap-3">
                <span className="text-6xl font-mono font-bold tracking-tight text-white sm:text-7xl">
                  {temp !== undefined ? `${Math.round(temp)}°` : "—"}
                </span>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="h-10 w-10 sm:h-12 sm:w-12"
                >
                  <Icon name={iconName} className={`h-full w-full ${iconColor}`} />
                </motion.div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                {feelsLike !== undefined && (
                  <span className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
                    Ressenti {Math.round(feelsLike)}°
                  </span>
                )}
                {todayMin !== undefined && todayMax !== undefined && (
                  <span className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
                    Min: {Math.round(todayMin)}° • Max: {Math.round(todayMax)}°
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className="col-span-12 rounded-2xl border border-white/[0.08] p-5 lg:col-span-4">
            <h3 className="mb-2 text-sm font-semibold text-white">{i18n("weatherForecast") || "Prévisions"}</h3>
            <WeatherForecastList days={forecast} />
          </div>

          {/* Metrics */}
          <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {metrics.map((m, i) => (
              <WeatherMetricCard key={i} {...m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
