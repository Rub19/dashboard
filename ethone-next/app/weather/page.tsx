"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { fetchWorker } from "@/lib/api";
import WeatherWidget, { type WeatherData } from "@/components/WeatherWidget";
import Input from "@/components/Input";

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
        if (!cancelled) setWeather((res?.data as WeatherData) || null);
      } catch {
        if (!cancelled) setError(i18n("weatherError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [searchTerm, i18n]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    setSearchTerm(term);
    update({ liveWeatherCity: term });
  }

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

      {error ? (
        <div className="rounded-[var(--panel-radius)] border border-red-500/20 bg-red-500/10 p-5 text-red-400">
          {error}
        </div>
      ) : (
        <WeatherWidget data={weather} loading={loading} onRefresh={load} />
      )}
    </div>
  );
}
