"use client";

import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { fetchWeatherSafe } from "@/lib/weather-service";
import type { WeatherData } from "@/components/WeatherWidget";

// Consumers that only ever read `.weather` (DockWeatherFlyout, SystemStatusPills)
// used to call the full useLiveData(), which fetches ~26 unrelated endpoints
// on its own interval just to expose this one field. This hook fetches only
// the weather, on its own lightweight interval. fetchWeatherSafe already
// routes through fetchWorkerCached with a 300s TTL (lib/weather-service.ts),
// so multiple simultaneous callers of this hook still collapse to one real
// network request — no extra caching needed here.
export function useWeatherOnly(pollMs = 300_000) {
  const { settings } = useSettings();
  const city = settings.liveWeatherCity || "Paris";

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchWeatherSafe(city);
      setWeather(data);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) load();
    }, pollMs);
    return () => clearInterval(interval);
  }, [pollMs, load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  return { weather, loading };
}
