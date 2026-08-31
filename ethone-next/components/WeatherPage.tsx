"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { fetchWeatherSafe } from "@/lib/weather-service";
import { Icon } from "@/lib/icons";
import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
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

function formatTime(iso?: string, locale = "fr"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

function formatHour(iso?: string, locale = "fr"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(locale, { hour: "numeric" });
}

function formatDay(dateStr?: string, locale = "fr"): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { weekday: "short" });
}

function formatFullDate(dateStr?: string, locale = "fr"): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
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

function aqiColor(aqi: number): string {
  if (aqi <= 20) return "var(--success)";
  if (aqi <= 50) return "var(--accent-primary)";
  if (aqi <= 100) return "var(--warning)";
  return "var(--danger)";
}

function windDirectionLabel(deg?: number): string {
  if (deg === undefined) return "—";
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

function weatherAmbience(code?: number, isDay?: boolean) {
  if (code === undefined) return "from-transparent to-transparent";
  if (!isDay) return "from-indigo-500/[0.08] to-transparent";
  if (code <= 1) return "from-amber-500/[0.10] via-amber-500/[0.03] to-transparent";
  if (code <= 3) return "from-slate-400/[0.10] to-transparent";
  if ([45, 48].includes(code)) return "from-slate-400/[0.12] to-transparent";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "from-blue-500/[0.12] to-transparent";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "from-cyan-400/[0.10] to-transparent";
  if ([95, 96, 99].includes(code)) return "from-violet-500/[0.15] to-transparent";
  return "from-slate-400/[0.08] to-transparent";
}

function brainAdvice(weather: WeatherData | null): string {
  if (!weather) return "—";
  const temp = toNum(weather.temperature);
  const uv = toNum(weather.uvIndex);
  const rain = toNum(weather.precipitationProbability);
  const wind = toNum(weather.windSpeedKmh);
  if (rain !== undefined && rain > 60) return "Risque de pluie dans l'heure. Prenez un parapluie.";
  if (temp !== undefined && temp > 30) return "Très chaud aujourd'hui. Hydratez-vous.";
  if (temp !== undefined && temp < 5) return "Frais dehors. Pensez à une veste.";
  if (uv !== undefined && uv > 7) return "UV très fort. Protégez-vous du soleil.";
  if (wind !== undefined && wind > 40) return "Vent fort. Évitez les activités en plein air.";
  return "Les conditions sont agréables pour sortir.";
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function WeatherPageSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-12 gap-4">
      <div className="col-span-12 min-h-[280px] rounded-2xl bg-[var(--text-primary)]/[0.03] lg:col-span-8" />
      <div className="col-span-12 min-h-[280px] rounded-2xl bg-[var(--text-primary)]/[0.03] lg:col-span-4" />
      <div className="col-span-12 rounded-2xl bg-[var(--text-primary)]/[0.03]" />
      <div className="col-span-12 rounded-2xl bg-[var(--text-primary)]/[0.03] lg:col-span-8" />
      <div className="col-span-12 min-h-[200px] rounded-2xl bg-[var(--text-primary)]/[0.03] lg:col-span-4" />
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUserEditingRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    async function run() {
      try {
        const data = await fetchWeatherSafe(searchTerm);
        if (cancelled) return;
        if (!data) throw new Error("Weather not found");
        setWeather(data);
        setLastUpdated(new Date());
        if (data?.city && settings.liveWeatherCity !== searchTerm) {
          update({ liveWeatherCity: searchTerm });
        }
      } catch {
        if (!cancelled) setError(i18n("weatherError", "Impossible de charger la météo"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
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
      showError(i18n("geolocationNotSupported", "Géolocalisation non supportée"));
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
          success(i18n("cityFound", "Ville trouvée"));
        } catch {
          showError(i18n("geolocationError", "Géolocalisation impossible"));
        }
      },
      () => showError(i18n("geolocationError", "Géolocalisation impossible"))
    );
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchWeatherSafe(searchTerm);
      if (!data) throw new Error("Weather not found");
      setWeather(data);
      setLastUpdated(new Date());
      success(i18n("weatherRefreshed", "Météo actualisée"));
    } catch {
      setError(i18n("weatherError", "Impossible d'actualiser la météo"));
    } finally {
      setRefreshing(false);
    }
  }

  const code = weather?.weatherCode;
  const isDay = weather?.isDay;
  const condition = toStr(weather?.description) || i18n("noForecast", "Pas de données");
  const city = toStr(weather?.city) || "—";
  const country = toStr(weather?.country);
  const temp = toNum(weather?.temperature);
  const feelsLike = toNum(weather?.apparentTemperature);
  const humidity = toNum(weather?.humidityPercent);
  const wind = toNum(weather?.windSpeedKmh);
  const windGusts = toNum(weather?.windGustsKmh);
  const windDir = toNum(weather?.windDirection);
  const uv = toNum(weather?.uvIndex);
  const pressure = toNum(weather?.pressure) ?? toNum(weather?.surfacePressure);
  const aqi = toNum(weather?.airQuality) ?? toNum(weather?.airQualityIndex);
  const aqiText = aqi !== undefined ? aqiLabel(aqi) : undefined;
  const sunrise = toStr(weather?.sunrise);
  const sunset = toStr(weather?.sunset);
  const dewPoint = toNum(weather?.dewPoint);
  const visibility = toNum(weather?.visibility);
  const precipProb = toNum(weather?.precipitationProbability);
  const advice = brainAdvice(weather);

  const today = weather?.daily?.[0];
  const todayMin = toNum(today?.min);
  const todayMax = toNum(today?.max);

  const hourly = useMemo(() => weather?.hourly?.slice(0, 24) || [], [weather?.hourly]);
  const daily = useMemo(() => weather?.daily?.slice(0, 7) || [], [weather?.daily]);

  const dailyRange = useMemo(() => {
    if (!daily.length) return { min: 0, max: 1 };
    const values = daily.flatMap((d) => [d.min, d.max].filter((v): v is number => typeof v === "number"));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    return { min, max: Math.max(max, min + 1) };
  }, [daily]);

  const iconName = weatherIconFromCode(code, condition, isDay);
  const iconColor = weatherIconColor(code, isDay);
  const ambience = weatherAmbience(code, isDay);

  const conditions = useMemo(
    () => [
      { icon: "wind", color: "text-[var(--info)]", label: i18n("wind", "Vent"), value: wind !== undefined ? `${Math.round(wind)} km/h` : "—", sub: windGusts !== undefined ? `Rafales ${Math.round(windGusts)}` : undefined },
      { icon: "droplets", color: "text-blue-400", label: i18n("humidity", "Humidité"), value: humidity !== undefined ? `${Math.round(humidity)}%` : "—", sub: "Relative" },
      { icon: "sun", color: "text-amber-400", label: i18n("weatherUV", "UV"), value: uv !== undefined ? `${Math.round(uv)}` : "—", sub: uv !== undefined ? uvLabel(uv) : undefined },
      { icon: "gauge", color: "text-purple-400", label: i18n("weatherPressure", "Pression"), value: pressure !== undefined ? `${Math.round(pressure)} hPa` : "—", sub: "Tendance stable" },
      { icon: "cloud", color: "text-cyan-400", label: i18n("dewPoint", "Point de rosée"), value: dewPoint !== undefined ? `${Math.round(dewPoint)}°` : "—", sub: "Humidité ressentie" },
      { icon: "eye", color: "text-emerald-400", label: i18n("visibility", "Visibilité"), value: visibility !== undefined ? `${(visibility / 1000).toFixed(1)} km` : "—", sub: "Portée" },
      { icon: "leaf", color: "text-[var(--accent-primary)]", label: i18n("weatherAirQuality", "Air"), value: aqi !== undefined ? `${Math.round(aqi)}` : "—", sub: aqiText || undefined },
      { icon: "sunrise", color: "text-amber-300", label: i18n("weatherSun", "Soleil"), value: `${formatTime(sunrise)} / ${formatTime(sunset)}`, sub: `${i18n("sunrise", "Lever")} / ${i18n("sunset", "Coucher")}` },
    ],
    [i18n, wind, windGusts, humidity, uv, pressure, dewPoint, visibility, aqi, aqiText, sunrise, sunset]
  );

  const sunProgress = useMemo(() => {
    if (!sunrise || !sunset) return null;
    const now = new Date();
    const sr = new Date(sunrise);
    const ss = new Date(sunset);
    if (Number.isNaN(sr.getTime()) || Number.isNaN(ss.getTime())) return null;
    if (now < sr) return 0;
    if (now > ss) return 100;
    const total = ss.getTime() - sr.getTime();
    const elapsed = now.getTime() - sr.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [sunrise, sunset]);

  const [lastUpdatedText, setLastUpdatedText] = useState(i18n("notUpdated", "—"));
  useEffect(() => {
    function compute() {
      if (!lastUpdated) {
        setLastUpdatedText(i18n("notUpdated", "—"));
        return;
      }
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      if (diff < 1) setLastUpdatedText(i18n("justNow", "à l'instant"));
      else if (diff < 60) setLastUpdatedText(`il y a ${diff} min`);
      else setLastUpdatedText(`il y a ${Math.floor(diff / 60)} h`);
    }
    compute();
    const timer = window.setInterval(compute, 60000);
    return () => window.clearInterval(timer);
  }, [lastUpdated, i18n]);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <Card variant="default" padding="md" className="mb-3 shrink-0 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shadow-sm">
                <Icon pack="phosphor" name="cloudSun" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{i18n("weather", "Météo")}</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{i18n("lastUpdated", "Mis à jour")} : <strong className="text-[var(--text-primary)] font-semibold">{lastUpdatedText}</strong></span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{i18n("weatherDescription", "Météo actuelle et prévisions en temps réel")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <SearchInput
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onSearch={(value) => {
                    const term = value.trim();
                    if (term.length < 2) return;
                    isUserEditingRef.current = true;
                    setSearchTerm(term);
                  }}
                  placeholder={i18n("city", "Ville")}
                  inputSize="compact"
                  className="min-w-0 w-40 sm:w-56"
                />

                <IconButton type="button" variant="ghost" size="sm" onClick={handleGeolocate} aria-label={i18n("geolocate", "Géolocalisation")} haptic="light">
                  <Icon pack="phosphor" name="navigation" className="h-4 w-4" />
                </IconButton>

                <Button type="submit" variant="primary" size="sm" haptic="light">
                  {i18n("search", "Rechercher")}
                </Button>
              </form>

              <Button type="button" variant="liquid" size="sm" onClick={handleRefresh} isLoading={refreshing} leftIcon={<Icon pack="phosphor" name="arrowsClockwise" className="h-3.5 w-3.5" />}>
                {i18n("refresh", "Actualiser")}
              </Button>
            </div>
          </div>
        </Card>

        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1">
          {error ? (
            <Card variant="status" className="mt-4">
              <div className="flex items-center gap-3 text-[var(--danger)]">
                <Icon pack="phosphor" name="warning" className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            </Card>
          ) : loading && !weather ? (
            <WeatherPageSkeleton />
          ) : !weather ? (
            <Card variant="status" className="mt-4 flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
              <Icon pack="phosphor" name="cloud" className="h-10 w-10 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">{i18n("noForecast", "Aucune prévision disponible")}</p>
            </Card>
          ) : (
            <div className="mt-4 grid grid-cols-12 gap-4 pb-6">
              <motion.div
                className="col-span-12 lg:col-span-8"
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                <Card variant="primary" padding="lg" className={cn("relative overflow-hidden", ambience)}>
                  <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", ambience)} />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                          <Icon pack="phosphor" name="mapPin" className="h-4 w-4 text-[var(--text-muted)]" />
                          <span>
                            {city}
                            {country ? `, ${country}` : ""}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)] capitalize">{condition}</p>
                      </div>
                      <Icon pack="phosphor" name={iconName} className={cn("h-16 w-16", iconColor)} />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-6xl font-bold tracking-tighter text-[var(--text-primary)]">
                          {temp !== undefined ? `${Math.round(temp)}°` : "—"}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {feelsLike !== undefined ? `Ressenti ${Math.round(feelsLike)}°` : "—"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {todayMin !== undefined && (
                          <span className="rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.05] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                            Min {Math.round(todayMin)}°
                          </span>
                        )}
                        {todayMax !== undefined && (
                          <span className="rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.05] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                            Max {Math.round(todayMax)}°
                          </span>
                        )}
                        {precipProb !== undefined && (
                          <span className="rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.05] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                            {Math.round(precipProb)}% pluie
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                className="col-span-12 lg:col-span-4"
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.05 }}
                variants={itemVariants}
              >
                <Card variant="default" padding="md" className="h-full">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{i18n("brainAdvice", "Conseil")}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">{advice}</p>
                </Card>
              </motion.div>

              <motion.div
                className="col-span-12"
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                variants={itemVariants}
              >
                <Card variant="default" padding="md">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{i18n("hourlyForecast", "Aujourd'hui")}</h3>
                  <div className="-mx-1 flex gap-2 overflow-x-auto os-scroll px-1 pb-1">
                    {hourly.length ? (
                      hourly.map((h, i) => {
                        const hIcon = weatherIconFromCode(h.weatherCode, undefined, h.isDay);
                        const hColor = weatherIconColor(h.weatherCode, h.isDay);
                        return (
                          <div
                            key={h.time}
                            className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-center transition-colors hover:bg-[var(--text-primary)]/[0.03]"
                          >
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{i === 0 ? i18n("now", "Maintenant") : formatHour(h.time)}</span>
                            <Icon pack="phosphor" name={hIcon} className={cn("h-5 w-5", hColor)} />
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {h.temperature !== undefined ? `${Math.round(h.temperature)}°` : "—"}
                            </span>
                            {(h.precipitationProbability ?? 0) > 0 && (
                              <span className="text-[10px] text-blue-400">{Math.round(h.precipitationProbability ?? 0)}%</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>
                    )}
                  </div>
                </Card>
              </motion.div>

              <motion.div
                className="col-span-12 lg:col-span-8"
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.15 }}
                variants={itemVariants}
              >
                <Card variant="default" padding="md" className="h-full">
                  <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{i18n("dailyForecast", "7 prochains jours")}</h3>
                  <div className="space-y-3">
                    {daily.map((d) => {
                      const dIcon = weatherIconFromCode(d.weatherCode, undefined, true);
                      const dColor = weatherIconColor(d.weatherCode, true);
                      const min = d.min ?? 0;
                      const max = d.max ?? min + 1;
                      const left = ((min - dailyRange.min) / (dailyRange.max - dailyRange.min)) * 100;
                      const width = ((max - min) / (dailyRange.max - dailyRange.min)) * 100;
                      return (
                        <div key={d.date} className="grid grid-cols-[4rem_1.5rem_1fr_2.5rem] items-center gap-2 sm:grid-cols-[5rem_2rem_1fr_3rem]">
                          <div>
                            <p className="text-xs font-medium text-[var(--text-primary)]">{formatDay(d.date)}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{formatFullDate(d.date)}</p>
                          </div>
                          <Icon pack="phosphor" name={dIcon} className={cn("h-5 w-5", dColor)} />
                          <div className="relative h-5">
                            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-[var(--text-primary)]/[0.04]" />
                            <motion.div
                              className="absolute inset-y-0 rounded-full bg-[var(--accent-primary)]/[0.25]"
                              initial={{ left: "0%", width: "0%" }}
                              animate={{ left: `${left}%`, width: `${width}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--text-muted)]">{Math.round(min)}°</span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[var(--text-primary)]">{Math.round(max)}°</span>
                          </div>
                          <div className="text-right text-xs text-[var(--text-muted)]">
                            {(d.precipitationProbability ?? 0) > 0 ? `${Math.round(d.precipitationProbability ?? 0)}%` : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>

              <motion.div
                className="col-span-12 flex flex-col gap-4 lg:col-span-4"
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                variants={itemVariants}
              >
                <Card variant="default" padding="md">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{i18n("precipitations", "Précipitations")}</h3>
                  <div className="flex h-32 items-end gap-1.5">
                    {hourly.slice(0, 12).map((h) => {
                      const prob = h.precipitationProbability ?? 0;
                      const height = Math.max(4, Math.min(100, prob));
                      return (
                        <div key={h.time} className="group flex flex-1 flex-col items-center gap-1">
                          <div className="w-full rounded-t-sm bg-[var(--info)]/[0.25] transition-all group-hover:bg-[var(--info)]/[0.4]" style={{ height: `${height}%` }} />
                          <span className="text-[9px] text-[var(--text-muted)]">{formatHour(h.time)}</span>
                        </div>
                      );
                    })}
                    {!hourly.length && <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>}
                  </div>
                </Card>

                <Card variant="default" padding="md">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{i18n("wind", "Vent")}</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-inner">
                      {/* Cardinal direction markers */}
                      <span className="absolute top-1 text-[8px] font-bold text-[var(--text-muted)]">N</span>
                      <span className="absolute right-1.5 text-[8px] font-bold text-[var(--text-muted)]">E</span>
                      <span className="absolute bottom-1 text-[8px] font-bold text-[var(--text-muted)]">S</span>
                      <span className="absolute left-1.5 text-[8px] font-bold text-[var(--text-muted)]">O</span>

                      {/* Compass crosshairs */}
                      <div className="absolute inset-0 m-auto h-px w-3/4 bg-[var(--text-primary)]/[0.08]" />
                      <div className="absolute inset-0 m-auto h-3/4 w-px bg-[var(--text-primary)]/[0.08]" />

                      {/* Directional needle */}
                      <div
                        className="relative z-10 flex items-center justify-center transition-transform duration-700 ease-out"
                        style={{ transform: `rotate(${windDir ?? 0}deg)` }}
                      >
                        <Navigation className="h-6 w-6 text-emerald-400 fill-emerald-400/25 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">
                        {wind !== undefined ? `${Math.round(wind)}` : "—"}{" "}
                        <span className="text-sm font-medium text-[var(--text-muted)]">km/h</span>
                      </div>
                      {windGusts !== undefined && (
                        <p className="text-xs text-[var(--text-muted)]">Rafales {Math.round(windGusts)} km/h</p>
                      )}
                      <p className="text-xs font-semibold text-emerald-400">{windDirectionLabel(windDir)}</p>
                    </div>
                  </div>
                </Card>

                <Card variant="default" padding="md">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{i18n("weatherAirQuality", "Qualité de l'air")}</h3>
                  {aqi !== undefined ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" style={{ color: aqiColor(aqi) }}>{Math.round(aqi)}</span>
                        <span className="text-sm font-medium" style={{ color: aqiColor(aqi) }}>{aqiText}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                        <span>PM2.5 : {weather.airQualityDetails?.pm25 !== undefined ? Math.round(weather.airQualityDetails.pm25) : "—"}</span>
                        <span>PM10 : {weather.airQualityDetails?.pm10 !== undefined ? Math.round(weather.airQualityDetails.pm10) : "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>
                  )}
                </Card>

                <Card variant="default" padding="md">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{i18n("sun", "Soleil")}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{i18n("sunrise", "Lever")} {formatTime(sunrise)}</span>
                      <span>{i18n("sunset", "Coucher")} {formatTime(sunset)}</span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-[var(--text-primary)]/[0.06]">
                      <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${sunProgress ?? 0}%` }} />
                      <div className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-primary)] shadow" style={{ left: `${sunProgress ?? 0}%` }} />
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{i18n("dayProgress", "Avancée de la journée")}</p>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                className="col-span-12"
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.25 }}
                variants={itemVariants}
              >
                <Card variant="default" padding="md">
                  <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{i18n("conditions", "Conditions")}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {conditions.map((c) => (
                      <div
                        key={c.label}
                        className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-colors hover:border-[var(--accent-primary)]/20"
                      >
                        <Icon pack="phosphor" name={c.icon} className={cn("mt-0.5 h-5 w-5", c.color)} />
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--text-muted)]">{c.label}</p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{c.value}</p>
                          {c.sub && <p className="text-[10px] text-[var(--text-muted)]">{c.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
