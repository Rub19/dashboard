"use client";

import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";

type Forecast = {
  date: string;
  min: number;
  max: number;
};

type WeatherData = {
  temperature: number;
  temperatureC?: number;
  weatherCode: number;
  condition: string;
  description?: string;
  location?: string;
  city: string;
  country?: string;
  humidityPercent: number;
  windSpeedKmh: number;
  isDay: boolean;
  forecast: Forecast[];
};

function weatherIcon(code = 0, isDay = true): string {
  if (code === 0) return isDay ? "sun" : "moon";
  if ([1, 2].includes(code)) return isDay ? "cloudSun" : "cloudMoon";
  if (code === 3) return "cloud";
  if ([45, 48].includes(code)) return "cloudFog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "cloudRain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "cloudSnow";
  if ([95, 96, 99].includes(code)) return "cloudLightning";
  return isDay ? "cloudSun" : "cloudMoon";
}

function weatherColor(code = 0): string {
  if (code === 0) return "text-amber-400";
  if ([1, 2].includes(code)) return "text-amber-300";
  if (code === 3) return "text-zinc-300";
  if ([45, 48].includes(code)) return "text-slate-400";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "text-sky-400";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "text-cyan-200";
  if ([95, 96, 99].includes(code)) return "text-violet-400";
  return "text-amber-400";
}

function dayName(date: string) {
  return new Date(date).toLocaleDateString(undefined, { weekday: "short" });
}

export default function WeatherPage() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const initial = settings.liveWeatherCity || "Paris";
  const [query, setQuery] = useState(initial);
  const [searchTerm, setSearchTerm] = useState(initial);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedTerm = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedTerm.length >= 2) setSearchTerm(debouncedTerm);
    }, 600);
    return () => clearTimeout(timer);
  }, [debouncedTerm]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const res = await fetchWorker(`/api/weather?city=${encodeURIComponent(searchTerm)}`);
        if (!cancelled) setWeather((res?.data as WeatherData) || null);
      } catch {
        if (!cancelled) setError(i18n("weatherError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [searchTerm, i18n]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    setSearchTerm(term);
    update({ liveWeatherCity: term });
  }

  const temp = weather?.temperature ?? weather?.temperatureC;
  const condition = weather?.condition || weather?.description || "—";
  const displayCity = weather?.city || weather?.location || searchTerm;
  const displayCountry = weather?.country;
  const iconName = weatherIcon(weather?.weatherCode, weather?.isDay);
  const iconColor = weatherColor(weather?.weatherCode);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n("weather")}</h1>
          <p className="text-sm text-[var(--muted)]">{i18n("weatherDescription")}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={i18n("city")}
            icon="mapPin"
          />
          <button
            type="submit"
            className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("search")}
          </button>
        </form>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="col-span-full h-64 animate-pulse rounded-[var(--panel-radius)] bg-[var(--panel-bg)]" />
        </div>
      ) : error ? (
        <Card3D className="p-5" radius="1.5rem">
          <p className="text-red-400">{error}</p>
        </Card3D>
      ) : weather ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card3D className="col-span-full p-5" radius="1.5rem">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-center gap-5">
                <div className={`flex h-24 w-24 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] ${iconColor}`}>
                  <Icon name={iconName} className="h-14 w-14" />
                </div>
                <div>
                  <p className="text-5xl font-bold tabular-nums sm:text-6xl">
                    {temp !== undefined ? `${Math.round(temp)}°` : "—"}
                  </p>
                  <p className="text-lg font-medium capitalize">{condition}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {displayCity}{displayCountry ? `, ${displayCountry}` : ""}
                  </p>
                </div>
              </div>
              <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2">
                  <Icon name="droplets" className="h-4 w-4 text-sky-400" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">{i18n("humidity")}</p>
                    <p className="text-sm font-semibold">{weather.humidityPercent}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2">
                  <Icon name="wind" className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">{i18n("wind")}</p>
                    <p className="text-sm font-semibold">{weather.windSpeedKmh} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2">
                  <Icon name={weather.isDay ? "sun" : "moon"} className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">{i18n("dayNight")}</p>
                    <p className="text-sm font-semibold">{weather.isDay ? i18n("day") : i18n("night")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-3 py-2">
                  <Icon name="thermometer" className="h-4 w-4 text-rose-400" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">{i18n("temperature")}</p>
                    <p className="text-sm font-semibold">{temp !== undefined ? `${Math.round(temp)}°C` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card3D>

          {weather.forecast.map((day, i) => (
            <Card3D key={i} className="p-4" radius="1.5rem">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] ${weatherColor(weather.weatherCode)}`}>
                  <Icon name={weatherIcon(weather.weatherCode, true)} className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{dayName(day.date)}</p>
                  <p className="text-xs text-[var(--muted)]">{condition}</p>
                </div>
                <p className="tabular-nums text-lg font-bold">
                  {Math.round(day.max)}° <span className="text-sm font-normal text-[var(--muted)]">/ {Math.round(day.min)}°</span>
                </p>
              </div>
            </Card3D>
          ))}
        </div>
      ) : null}
    </div>
  );
}
