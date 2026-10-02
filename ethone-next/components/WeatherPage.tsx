"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { fetchWeatherSafe } from "@/lib/weather-service";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { EASE_SNAP } from "@/lib/ease";
import { Icon } from "@/lib/icons";
import { Navigation } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { weatherIconFromCode, weatherIconColor, type WeatherData } from "@/components/WeatherWidget";

function toNum(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function toStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

// Toutes les heures s'affichent dans le fuseau de la VILLE (utcOffsetSeconds), pas celui du navigateur :
// on décale l'instant puis on formate en UTC.
const hm = (d: Date) => new Intl.DateTimeFormat("fr", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d);

/** Instant réel (ISO avec Z) -> "07:51" à l'heure de la ville. */
function cityTime(iso: string | undefined, offset: number | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  if (offset === undefined) return new Intl.DateTimeFormat("fr", { hour: "2-digit", minute: "2-digit" }).format(ms);
  return hm(new Date(ms + offset * 1000));
}

/** Heure murale de la ville sans fuseau ("2026-10-02T21:00") -> "21 h". */
function wallHour(wall: string | undefined): string {
  if (!wall) return "—";
  const ms = Date.parse(`${wall.slice(0, 16)}Z`);
  return Number.isNaN(ms) ? "—" : `${new Date(ms).getUTCHours()} h`;
}

/** Date "2026-10-02" -> "ven. 2 oct." sans glisser d'un jour selon le fuseau du navigateur. */
function dayLabel(date: string | undefined, part: "weekday" | "date"): string {
  if (!date) return "—";
  const ms = Date.parse(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(ms)) return "—";
  const opts: Intl.DateTimeFormatOptions = part === "weekday" ? { weekday: "short" } : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat("fr", { ...opts, timeZone: "UTC" }).format(ms);
}

function uvLabel(uv: number): string {
  if (uv <= 2) return "Faible";
  if (uv <= 5) return "Modéré";
  if (uv <= 7) return "Fort";
  if (uv <= 10) return "Très fort";
  return "Extrême";
}

// Indice européen (EAQI) : 0-20 bon … >100 extrêmement mauvais.
function aqiInfo(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: "Bon", color: "var(--success)" };
  if (aqi <= 40) return { label: "Correct", color: "var(--success)" };
  if (aqi <= 60) return { label: "Moyen", color: "var(--warning)" };
  if (aqi <= 80) return { label: "Médiocre", color: "var(--warning)" };
  if (aqi <= 100) return { label: "Mauvais", color: "var(--danger)" };
  return { label: "Très mauvais", color: "var(--danger)" };
}

function windDirectionLabel(deg?: number): string {
  if (deg === undefined) return "—";
  return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(deg / 45) % 8];
}

function advice(weather: WeatherData, nextRain: number | undefined): { icon: string; text: string } {
  const temp = toNum(weather.temperature);
  const uv = toNum(weather.uvIndex);
  const wind = toNum(weather.windSpeedKmh);
  if (nextRain !== undefined && nextRain >= 60) return { icon: "umbrella", text: "Pluie probable dans les 3 prochaines heures. Prends un parapluie." };
  if (temp !== undefined && temp > 30) return { icon: "thermometer-hot", text: "Très chaud. Hydrate-toi et évite le soleil aux heures chaudes." };
  if (temp !== undefined && temp < 5) return { icon: "thermometer-cold", text: "Il fait froid dehors. Prévois une veste chaude." };
  if (uv !== undefined && uv > 7) return { icon: "sun", text: "UV très forts. Crème solaire et lunettes recommandées." };
  if (wind !== undefined && wind > 40) return { icon: "wind", text: "Vent fort. Prudence pour les activités en plein air." };
  return { icon: "sparkle", text: "Conditions agréables pour sortir." };
}

/** Nombre qui roule vers sa nouvelle valeur (changement de ville, actualisation). Démarre sur la vraie
 * valeur : un onglet en arrière-plan gèle requestAnimationFrame, il ne doit jamais rester sur un faux chiffre. */
function RollingNumber({ value, reduced }: { value: number; reduced: boolean }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) {
      from.current = value;
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, { duration: 0.9, ease: EASE_SNAP, onUpdate: setShown });
    from.current = value;
    return () => controls.stop();
  }, [value, reduced]);
  return <>{Math.round(shown)}</>;
}

function WeatherPageSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-12 gap-4" aria-busy="true">
      {["lg:col-span-8 min-h-[260px]", "lg:col-span-4 min-h-[260px]", "min-h-[150px]", "lg:col-span-8 min-h-[300px]", "lg:col-span-4 min-h-[300px]"].map((cls, i) => (
        <div key={i} className={cn("skeleton-shimmer col-span-12 rounded-[var(--panel-radius)] bg-[var(--text-primary)]/[0.03]", cls)} />
      ))}
    </div>
  );
}

const SLOT_W = 72; // largeur d'une heure dans la frise (px)
const SLOT_GAP = 8;

export default function WeatherPage() {
  const i18n = useI18n();
  const { reduced } = useMotionPref();
  const { success, error: showError } = useToast();
  const { settings, update } = useSettings();
  const settingsCity = settings.liveWeatherCity || "Paris";

  const [query, setQuery] = useState(settingsCity);
  const [city, setCity] = useState(settingsCity);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const userSearched = useRef(false);
  const saveCity = useRef(update);
  saveCity.current = update;

  // Ville changée ailleurs (réglages, widget) tant que l'utilisateur n'a rien cherché ici.
  useEffect(() => {
    if (userSearched.current) return;
    setCity(settingsCity);
    setQuery(settingsCity);
  }, [settingsCity]);

  // Une seule requête par ville. Avant : la recherche partait toutes les 600 ms pendant la frappe
  // ("Pa", "Par"…) et enregistrait parfois ces fragments comme ville par défaut, et l'enregistrement
  // de la ville relançait lui-même une requête.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWeatherSafe(city)
      .then((data) => {
        if (cancelled) return;
        if (!data) throw new Error("not found");
        setWeather(data);
        setLastUpdated(new Date());
        if (userSearched.current) saveCity.current({ liveWeatherCity: city });
      })
      .catch(() => {
        if (!cancelled) setError(`Ville introuvable ou météo indisponible : « ${city} ».`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  function search(value: string) {
    const term = value.trim();
    if (term.length < 2) return;
    userSearched.current = true;
    setCity(term);
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
          const found = data.city || data.locality || data.town || data.municipality || data.village;
          if (!found) throw new Error("city not found");
          setQuery(found);
          search(found);
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
      const data = await fetchWeatherSafe(city, { fresh: true });
      if (!data) throw new Error("not found");
      setWeather(data);
      setLastUpdated(new Date());
      setNow(Date.now());
      success(i18n("weatherRefreshed", "Météo actualisée"));
    } catch {
      setError(i18n("weatherError", "Impossible d'actualiser la météo"));
    } finally {
      setRefreshing(false);
    }
  }

  const offset = toNum(weather?.utcOffsetSeconds);
  const code = weather?.weatherCode;
  const condition = toStr(weather?.description) || "—";
  const cityName = toStr(weather?.city) || city;
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
  const sunrise = toStr(weather?.sunrise);
  const sunset = toStr(weather?.sunset);
  const dewPoint = toNum(weather?.dewPoint);
  const visibility = toNum(weather?.visibility);

  const hourly = useMemo(() => weather?.hourly?.slice(0, 24) || [], [weather?.hourly]);
  const daily = useMemo(() => weather?.daily?.slice(0, 7) || [], [weather?.daily]);
  const today = daily[0];
  const todayMin = toNum(today?.min);
  const todayMax = toNum(today?.max);
  const nextRain = hourly.length ? Math.max(...hourly.slice(0, 3).map((h) => h.precipitationProbability ?? 0)) : undefined;
  const tip = weather ? advice(weather, nextRain) : null;

  const localClock = offset !== undefined ? hm(new Date(now + offset * 1000)) : null;

  const dailyRange = useMemo(() => {
    const values = daily.flatMap((d) => [d.min, d.max].filter((v): v is number => typeof v === "number"));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    return { min, max: Math.max(max, min + 1) };
  }, [daily]);

  // Courbe de température alignée sur la frise horaire.
  const curve = useMemo(() => {
    const temps = hourly.map((h) => h.temperature).filter((t): t is number => typeof t === "number");
    if (temps.length < 2 || temps.length !== hourly.length) return null;
    const lo = Math.min(...temps);
    const hi = Math.max(...temps, lo + 1);
    const width = hourly.length * SLOT_W + (hourly.length - 1) * SLOT_GAP;
    const pts = temps.map((t, i) => [i * (SLOT_W + SLOT_GAP) + SLOT_W / 2, 50 - ((t - lo) / (hi - lo)) * 40] as const);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    return { width, d, area: `${d} L${pts[pts.length - 1][0]},56 L${pts[0][0]},56 Z` };
  }, [hourly]);

  // Position réelle du soleil entre lever et coucher (instants absolus, indépendants du fuseau).
  const sun = useMemo(() => {
    if (!sunrise || !sunset) return null;
    const sr = Date.parse(sunrise);
    const ss = Date.parse(sunset);
    if (Number.isNaN(sr) || Number.isNaN(ss) || ss <= sr) return null;
    const p = Math.min(1, Math.max(0, (now - sr) / (ss - sr)));
    const dayMinutes = Math.round((ss - sr) / 60000);
    const next = now < sr ? sr : Date.parse(toStr(daily[1]?.sunrise) || "");
    const inMin = Number.isNaN(next) || now <= sr ? Math.round((sr - now) / 60000) : Math.round((next - now) / 60000);
    return {
      p,
      up: now >= sr && now <= ss,
      length: `${Math.floor(dayMinutes / 60)} h ${String(dayMinutes % 60).padStart(2, "0")}`,
      nextRise: now >= sr && now <= ss || inMin < 0 ? null : `${Math.floor(inMin / 60)} h ${String(inMin % 60).padStart(2, "0")}`,
    };
  }, [sunrise, sunset, now, daily]);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return "—";
    const diff = Math.floor((now - lastUpdated.getTime()) / 60000);
    if (diff < 1) return "à l'instant";
    if (diff < 60) return `il y a ${diff} min`;
    return `il y a ${Math.floor(diff / 60)} h`;
  }, [lastUpdated, now]);

  const conditions = [
    { icon: "drop", label: "Humidité", value: humidity !== undefined ? `${Math.round(humidity)} %` : "—" },
    { icon: "sun", label: "Indice UV", value: uv !== undefined ? `${Math.round(uv)}` : "—", sub: uv !== undefined ? uvLabel(uv) : undefined },
    { icon: "gauge", label: "Pression", value: pressure !== undefined ? `${Math.round(pressure)} hPa` : "—" },
    { icon: "thermometer", label: "Point de rosée", value: dewPoint !== undefined ? `${Math.round(dewPoint)}°` : "—" },
    { icon: "eye", label: "Visibilité", value: visibility !== undefined ? `${(visibility / 1000).toFixed(visibility < 10000 ? 1 : 0)} km` : "—" },
    { icon: "thermometer-simple", label: "Ressenti", value: feelsLike !== undefined ? `${Math.round(feelsLike)}°` : "—" },
  ];

  const iconName = weatherIconFromCode(code, condition, weather?.isDay);
  const iconColor = weatherIconColor(code, weather?.isDay);
  const enter = reduced ? false : "initial";

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <Card variant="default" padding="md" className="rise-in mb-3 shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="icon-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Icon pack="phosphor" name="cloudSun" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{i18n("weather", "Météo")}</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-2)]/40 px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                    <span className={cn("h-1.5 w-1.5 rounded-full", error ? "bg-[var(--danger)]" : "status-breathe bg-[var(--success)]")} />
                    Mis à jour <strong className="font-semibold text-[var(--text-primary)]">{lastUpdatedText}</strong>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">Conditions actuelles et prévisions, à l&apos;heure locale de la ville.</p>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onSearch={search}
                shortcut=""
                placeholder={i18n("city", "Ville")}
                aria-label="Rechercher une ville"
                inputSize="compact"
                className="min-w-0 flex-1 sm:w-56 sm:flex-none"
              />
              <IconButton type="button" variant="ghost" size="sm" onClick={handleGeolocate} aria-label={i18n("geolocate", "Me localiser")} haptic="light">
                <Icon pack="phosphor" name="navigation" className="h-4 w-4" />
              </IconButton>
              <Button type="button" variant="primary" size="sm" haptic="light" onClick={() => search(query)}>
                {i18n("search", "Rechercher")}
              </Button>
              <IconButton type="button" variant="ghost" size="sm" onClick={handleRefresh} aria-label={i18n("refresh", "Actualiser")} disabled={refreshing || !weather}>
                <Icon pack="phosphor" name="arrows-clockwise" className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </IconButton>
            </div>
          </div>
        </Card>

        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1">
          {error && (
            <div role="alert" className="pop-in mt-3 flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              <Icon pack="phosphor" name="warning" className="h-5 w-5 shrink-0" />
              <p className="min-w-0 flex-1">{error}{weather ? " Dernières données conservées." : ""}</p>
            </div>
          )}

          {loading && !weather ? (
            <WeatherPageSkeleton />
          ) : !weather ? null : (
            <motion.div
              key={`${cityName}-${weather.updatedAt ?? ""}`}
              variants={pageStagger}
              initial={enter}
              animate="animate"
              className={cn("mt-4 grid grid-cols-12 gap-4 pb-6 transition-opacity duration-300", loading && "opacity-60")}
            >
              {/* Héros */}
              <motion.div variants={staggerItem} className="col-span-12 lg:col-span-8">
                <Card variant="primary" padding="lg" className="relative h-full overflow-hidden">
                  <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                          <Icon pack="phosphor" name="mapPin" className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                          <span className="truncate">
                            {cityName}
                            {country ? `, ${country}` : ""}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-muted)]">
                          {condition.charAt(0).toUpperCase() + condition.slice(1)}
                          {localClock ? ` · ${localClock} sur place` : ""}
                        </p>
                      </div>
                      <motion.div
                        animate={reduced ? undefined : { y: [0, -6, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="shrink-0"
                      >
                        <Icon pack="phosphor" name={iconName} className={cn("h-16 w-16 sm:h-20 sm:w-20", iconColor)} />
                      </motion.div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-6xl font-bold tabular-nums tracking-tighter text-[var(--text-primary)] sm:text-7xl">
                          {temp !== undefined ? <><RollingNumber value={temp} reduced={reduced} />°</> : "—"}
                        </div>
                        {feelsLike !== undefined && <div className="text-sm text-[var(--text-muted)]">Ressenti {Math.round(feelsLike)}°</div>}
                      </div>
                      <div className="stagger-children flex flex-wrap gap-2">
                        {todayMin !== undefined && todayMax !== undefined && (
                          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.05] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                            <Icon pack="phosphor" name="arrow-down" className="mr-1 inline h-3 w-3" />{Math.round(todayMin)}°
                            <Icon pack="phosphor" name="arrowUp" className="ml-2 mr-1 inline h-3 w-3" />{Math.round(todayMax)}°
                          </span>
                        )}
                        {nextRain !== undefined && (
                          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.05] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                            Pluie {Math.round(nextRain)} % (3 h)
                          </span>
                        )}
                        {wind !== undefined && (
                          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.05] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                            Vent {Math.round(wind)} km/h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Conseil */}
              <motion.div variants={staggerItem} className="col-span-12 lg:col-span-4">
                <Card variant="default" padding="md" className="flex h-full flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <span className="grid h-7 w-7 place-items-center rounded-[var(--inset-radius)] bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
                      <Icon pack="phosphor" name={tip?.icon || "sparkle"} className="h-4 w-4" />
                    </span>
                    Conseil du jour
                  </h2>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">{tip?.text}</p>
                  {sun && (
                    <p className="mt-auto text-xs text-[var(--text-muted)]">
                      Durée du jour : <strong className="font-semibold text-[var(--text-primary)]">{sun.length}</strong>
                    </p>
                  )}
                </Card>
              </motion.div>

              {/* Frise horaire + courbe */}
              <motion.div variants={staggerItem} className="col-span-12">
                <Card variant="default" padding="md">
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Prochaines 24 heures</h2>
                  {hourly.length ? (
                    <div className="-mx-1 overflow-x-auto os-scroll px-1 pb-1">
                      {curve && (
                        <svg width={curve.width} height={56} viewBox={`0 0 ${curve.width} 56`} className="block overflow-visible" aria-hidden>
                          <defs>
                            <linearGradient id="weather-curve" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <motion.path d={curve.area} fill="url(#weather-curve)" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
                          <motion.path
                            d={curve.d}
                            fill="none"
                            stroke="var(--accent-primary)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={reduced ? false : { pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.1, ease: EASE_SNAP, delay: 0.15 }}
                          />
                        </svg>
                      )}
                      <div className="flex" style={{ gap: SLOT_GAP }}>
                        {hourly.map((h, i) => {
                          const prob = h.precipitationProbability ?? 0;
                          return (
                            <div
                              key={h.time}
                              style={{ width: SLOT_W, animationDelay: `${Math.min(i, 14) * 25}ms` }}
                              className={cn(
                                "rise-in flex shrink-0 flex-col items-center gap-1.5 rounded-[var(--inset-radius)] border p-2 text-center transition-colors",
                                i === 0
                                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10"
                                  : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--input-border-hover)]"
                              )}
                            >
                              <span className={cn("text-[10px] font-medium", i === 0 ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>
                                {i === 0 ? "Maint." : wallHour(h.time)}
                              </span>
                              <Icon pack="phosphor" name={weatherIconFromCode(h.weatherCode, undefined, h.isDay)} className={cn("h-5 w-5", weatherIconColor(h.weatherCode, h.isDay))} />
                              <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                                {h.temperature !== undefined ? `${Math.round(h.temperature)}°` : "—"}
                              </span>
                              <span className={cn("text-[10px] tabular-nums", prob > 0 ? "text-[var(--info)]" : "text-transparent")}>{Math.round(prob)} %</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>
                  )}
                </Card>
              </motion.div>

              {/* 7 jours */}
              <motion.div variants={staggerItem} className="col-span-12 lg:col-span-8">
                <Card variant="default" padding="md">
                  <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">7 prochains jours</h2>
                  <div className="space-y-2">
                    {daily.map((d, i) => {
                      const min = d.min ?? dailyRange.min;
                      const max = d.max ?? min;
                      const span = dailyRange.max - dailyRange.min;
                      const left = ((min - dailyRange.min) / span) * 100;
                      const width = Math.max(4, ((max - min) / span) * 100);
                      return (
                        <div
                          key={d.date}
                          style={{ animationDelay: `${120 + i * 45}ms` }}
                          className={cn(
                            "rise-in grid grid-cols-[4.5rem_1.75rem_2.25rem_1fr_2.25rem_2.75rem] items-center gap-2 rounded-[var(--inset-radius)] px-2 py-1.5 transition-colors sm:grid-cols-[6rem_2rem_2.5rem_1fr_2.5rem_3rem]",
                            i === 0 ? "bg-[var(--accent-primary)]/[0.06]" : "hover:bg-[var(--text-primary)]/[0.03]"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold capitalize text-[var(--text-primary)]">{i === 0 ? "Aujourd'hui" : dayLabel(d.date, "weekday")}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{dayLabel(d.date, "date")}</p>
                          </div>
                          <Icon pack="phosphor" name={weatherIconFromCode(d.weatherCode, undefined, true)} className={cn("h-5 w-5", weatherIconColor(d.weatherCode, true))} />
                          <span className="text-right text-xs tabular-nums text-[var(--text-muted)]">{d.min !== undefined ? `${Math.round(d.min)}°` : "—"}</span>
                          <div className="relative h-1.5 rounded-full bg-[var(--text-primary)]/[0.06]">
                            <motion.div
                              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[var(--info)] to-[var(--warning)]"
                              style={{ left: `${left}%`, width: `${width}%`, originX: 0 }}
                              initial={reduced ? false : { scaleX: 0, opacity: 0 }}
                              animate={{ scaleX: 1, opacity: 1 }}
                              transition={{ duration: 0.7, ease: EASE_SNAP, delay: 0.2 + i * 0.05 }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">{d.max !== undefined ? `${Math.round(d.max)}°` : "—"}</span>
                          <span className={cn("text-right text-[11px] tabular-nums", (d.precipitationProbability ?? 0) > 0 ? "text-[var(--info)]" : "text-[var(--text-muted)]")}>
                            {(d.precipitationProbability ?? 0) > 0 ? `${Math.round(d.precipitationProbability ?? 0)} %` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>

              {/* Colonne droite */}
              <motion.div variants={staggerItem} className="col-span-12 grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-[auto_1fr]">
                <Card variant="default" padding="md">
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Précipitations (12 h)</h2>
                  {hourly.length ? (
                    <div className="relative flex h-28 items-stretch gap-1">
                      {hourly.slice(0, 12).every((h) => !h.precipitationProbability) && (
                        <p className="pop-in absolute inset-x-0 top-6 text-center text-xs text-[var(--text-muted)]">Pas de pluie prévue</p>
                      )}
                      {hourly.slice(0, 12).map((h, i) => {
                        const prob = Math.max(0, Math.min(100, h.precipitationProbability ?? 0));
                        return (
                          <div key={h.time} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${wallHour(h.time)} : ${Math.round(prob)} %`}>
                            <div className="flex w-full flex-1 items-end">
                              <motion.div
                                className="w-full rounded-t-sm bg-[var(--info)]/35 transition-colors group-hover:bg-[var(--info)]/60"
                                style={{ height: `${Math.max(3, prob)}%`, originY: 1 }}
                                initial={reduced ? false : { scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ duration: 0.6, ease: EASE_SNAP, delay: 0.25 + i * 0.03 }}
                              />
                            </div>
                            <span className="text-[9px] tabular-nums text-[var(--text-muted)]">{i % 3 === 0 ? wallHour(h.time).replace(" h", "h") : " "}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>
                  )}
                </Card>

                <Card variant="default" padding="md">
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Vent</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]">
                      <span className="absolute top-1 text-[8px] font-bold text-[var(--text-muted)]">N</span>
                      <span className="absolute right-1.5 text-[8px] font-bold text-[var(--text-muted)]">E</span>
                      <span className="absolute bottom-1 text-[8px] font-bold text-[var(--text-muted)]">S</span>
                      <span className="absolute left-1.5 text-[8px] font-bold text-[var(--text-muted)]">O</span>
                      <div className="absolute inset-0 m-auto h-px w-3/4 bg-[var(--text-primary)]/[0.08]" />
                      <div className="absolute inset-0 m-auto h-3/4 w-px bg-[var(--text-primary)]/[0.08]" />
                      {/* La direction météo indique d'OÙ vient le vent : la flèche pointe vers où il va (+180°).
                          L'icône pointe au nord-ouest au repos (-45°), d'où le +45°. */}
                      <motion.div
                        className="relative z-10"
                        initial={reduced ? false : { rotate: 0 }}
                        animate={{ rotate: ((windDir ?? 0) + 180 + 45) % 360 }}
                        transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.3 }}
                      >
                        <Navigation className="h-6 w-6 fill-[var(--accent-primary)]/20 text-[var(--accent-primary)]" />
                      </motion.div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                        {wind !== undefined ? Math.round(wind) : "—"} <span className="text-sm font-medium text-[var(--text-muted)]">km/h</span>
                      </div>
                      {windGusts !== undefined && <p className="text-xs text-[var(--text-muted)]">Rafales {Math.round(windGusts)} km/h</p>}
                      <p className="text-xs font-semibold text-[var(--text-primary)]">Vient du {windDirectionLabel(windDir)}</p>
                    </div>
                  </div>
                </Card>

              </motion.div>

              {/* Qualité de l'air, soleil, conditions */}
              <motion.div variants={staggerItem} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <Card variant="default" padding="md" className="h-full">
                  <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Qualité de l&apos;air</h2>
                  {aqi !== undefined ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums" style={{ color: aqiInfo(aqi).color }}>{Math.round(aqi)}</span>
                        <span className="text-sm font-medium" style={{ color: aqiInfo(aqi).color }}>{aqiInfo(aqi).label}</span>
                        <span className="ml-auto text-[10px] text-[var(--text-muted)]">indice européen</span>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-[var(--success)] via-[var(--warning)] to-[var(--danger)] opacity-80">
                        <motion.span
                          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-card)] bg-[var(--text-primary)]"
                          initial={reduced ? false : { left: "0%" }}
                          animate={{ left: `${Math.min(100, aqi)}%` }}
                          transition={{ duration: 0.9, ease: EASE_SNAP, delay: 0.3 }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                        <span>PM2.5 : {weather.airQualityDetails?.pm25 !== undefined ? Math.round(weather.airQualityDetails.pm25) : "—"} µg/m³</span>
                        <span>PM10 : {weather.airQualityDetails?.pm10 !== undefined ? Math.round(weather.airQualityDetails.pm10) : "—"} µg/m³</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>
                  )}
                </Card>

              </motion.div>

              <motion.div variants={staggerItem} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <Card variant="default" padding="md" className="h-full">
                  <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Soleil</h2>
                  {sun ? (
                    <>
                      <svg viewBox="0 0 200 84" className="w-full" aria-hidden>
                        <path d="M10 76 A90 70 0 0 1 190 76" fill="none" stroke="var(--text-primary)" strokeOpacity="0.12" strokeWidth="2" strokeDasharray="3 5" />
                        <motion.path
                          d="M10 76 A90 70 0 0 1 190 76"
                          fill="none"
                          stroke="var(--warning)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          initial={reduced ? false : { pathLength: 0 }}
                          animate={{ pathLength: sun.p }}
                          transition={{ duration: 1.2, ease: EASE_SNAP, delay: 0.3 }}
                        />
                        <line x1="0" x2="200" y1="76" y2="76" stroke="var(--text-primary)" strokeOpacity="0.1" />
                        {sun.up && (
                          <motion.circle
                            r="6"
                            fill="var(--warning)"
                            initial={reduced ? false : { cx: 10, cy: 76, opacity: 0 }}
                            animate={{ cx: 100 - 90 * Math.cos(Math.PI * sun.p), cy: 76 - 70 * Math.sin(Math.PI * sun.p), opacity: 1 }}
                            transition={{ duration: 1.2, ease: EASE_SNAP, delay: 0.3 }}
                          />
                        )}
                      </svg>
                      <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Lever <strong className="font-semibold text-[var(--text-primary)]">{cityTime(sunrise, offset)}</strong></span>
                        <span>Coucher <strong className="font-semibold text-[var(--text-primary)]">{cityTime(sunset, offset)}</strong></span>
                      </div>
                      {sun.nextRise && (
                        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                          Nuit · lever dans <strong className="font-semibold text-[var(--text-primary)]">{sun.nextRise}</strong>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">{i18n("noData", "Aucune donnée")}</p>
                  )}
                </Card>
              </motion.div>

              <motion.div variants={staggerItem} className="col-span-12 lg:col-span-4">
                <Card variant="default" padding="md" className="h-full">
                  <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Conditions</h2>
                  <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                    {conditions.map((c) => (
                      <div key={c.label} className="group flex items-start gap-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-colors hover:border-[var(--accent-primary)]/30">
                        <Icon pack="phosphor" name={c.icon} className="mt-0.5 h-5 w-5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-primary)]" />
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--text-muted)]">{c.label}</p>
                          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{c.value}</p>
                          {c.sub && <p className="text-[10px] text-[var(--text-muted)]">{c.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
