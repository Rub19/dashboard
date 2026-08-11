"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { fetchWorker } from "@/lib/api";
import Card3D from "@/components/Card3D";

type Forecast = {
  date?: string;
  min?: number;
  max?: number;
  condition?: string;
  iconUrl?: string;
};

type WeatherData = {
  temperature?: number;
  temperatureC?: number;
  condition?: string;
  description?: string;
  location?: string;
  city?: string;
  humidityPercent?: number;
  windSpeedKmh?: number;
  iconUrl?: string;
  forecast?: Forecast[];
};

export default function WeatherPage() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const [city, setCity] = useState(settings.liveWeatherCity || "Paris");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const res = await fetchWorker(`/api/weather?city=${encodeURIComponent(city)}`);
        if (!cancelled) setWeather((res?.data as WeatherData) || null);
      } catch {
        if (!cancelled) setError(i18n("weatherError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [city, i18n]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    update({ liveWeatherCity: city });
  }

  const temp = weather?.temperature ?? weather?.temperatureC;
  const condition = weather?.condition || weather?.description || "—";
  const displayCity = weather?.location || weather?.city || city;
  const details = [
    weather?.humidityPercent !== undefined && `${weather.humidityPercent}% ${i18n("humidity")}`,
    weather?.windSpeedKmh !== undefined && `${weather.windSpeedKmh} km/h ${i18n("wind")}`,
  ].filter(Boolean) as string[];

  const forecast = weather?.forecast || [];

  return (
    <div className="p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("weather")}</h1>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={i18n("city")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("search")}
          </button>
        </form>
      </header>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-raised)]" />
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card3D>
            <div className="flex items-center gap-4">
              {weather?.iconUrl ? (
                <Image src={weather.iconUrl} alt="" width={80} height={80} unoptimized className="h-20 w-20 object-contain" />
              ) : (
                <Icon name="cloudSun" className="h-20 w-20 text-amber-400" />
              )}
              <div>
                <p className="text-4xl font-bold">{temp !== undefined ? `${temp}°C` : "—"}</p>
                <p className="text-lg font-medium capitalize">{condition}</p>
                <p className="text-sm text-[var(--muted)]">{displayCity}</p>
              </div>
            </div>
            {details.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {details.map((d, i) => (
                  <span key={i} className="rounded-lg bg-[var(--surface)] px-2 py-1 text-xs">{d}</span>
                ))}
              </div>
            )}
          </Card3D>

          <Card3D>
            <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">{i18n("forecast")}</h2>
            {forecast.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{i18n("noForecast")}</p>
            ) : (
              <div className="space-y-2">
                {forecast.slice(0, 5).map((day, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-3 py-2 text-sm">
                    <span className="text-[var(--muted)]">{day.date ? new Date(day.date).toLocaleDateString(undefined, { weekday: "short" }) : "—"}</span>
                    <span className="font-medium">{day.condition || "—"}</span>
                    <span className="tabular-nums">{day.min ?? "—"}° / {day.max ?? "—"}°</span>
                  </div>
                ))}
              </div>
            )}
          </Card3D>
        </div>
      )}
    </div>
  );
}
