import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Droplets, Eye, Gauge, Leaf, MapPin, Moon, Search, Star, Sun, Sunrise, Sunset, Thermometer, Wind, X } from "lucide-react";
import { apiData } from "./api";
import { readJson, write } from "./settings";
import { lang, tr } from "./i18n";
import { ErrorBox, PageHead, useLoad } from "./kit";
import { airLevel, cityTime, compass, hourOf, nextRain, rangeBar, toggleCity, uvLevel, weatherKind } from "./weather";

interface Hour { time?: string; temperature?: number | null; weatherCode?: number | null; precipitation?: number | null; precipitationProbability?: number | null; isDay?: boolean }
interface Day { date?: string; max?: number | null; min?: number | null; weatherCode?: number | null; precipitationProbability?: number | null; sunrise?: string | null; sunset?: string | null }
interface WeatherData {
  city?: string; country?: string; utcOffsetSeconds?: number; temperature?: number | null; apparentTemperature?: number | null; weatherCode?: number | null; description?: string; isDay?: boolean;
  windSpeedKmh?: number | null; windDirection?: number | null; windGustsKmh?: number | null; humidityPercent?: number | null; pressure?: number | null; uvIndex?: number | null; visibility?: number | null; dewPoint?: number | null;
  sunrise?: string | null; sunset?: string | null; precipitation?: number | null; precipitationProbability?: number | null; airQuality?: number | null; airQualityDetails?: { pm10?: number | null; pm25?: number | null } | null; hourly?: Hour[]; daily?: Day[];
}
interface Place { name: string; country?: string; admin1?: string }

const has = (value: number | null | undefined): value is number => value !== null && value !== undefined;
const degrees = (value: number | null | undefined) => (has(value) ? `${Math.round(value)}°` : "–");

function WeatherIcon({ code, day = true, size = 18 }: { code?: number | null; day?: boolean; size?: number }) {
  const kind = weatherKind(code);
  const props = { size, "aria-hidden": true };
  if (kind === "clear") return day ? <Sun {...props} className="wx-sun" /> : <Moon {...props} className="wx-moon" />;
  if (kind === "partly") return day ? <CloudSun {...props} className="wx-sun" /> : <CloudMoon {...props} className="wx-moon" />;
  if (kind === "cloudy") return <Cloud {...props} className="wx-cloud" />;
  if (kind === "fog") return <CloudFog {...props} className="wx-cloud" />;
  if (kind === "drizzle") return <CloudDrizzle {...props} className="wx-rain" />;
  if (kind === "snow") return <CloudSnow {...props} className="wx-snow" />;
  if (kind === "storm") return <CloudLightning {...props} className="wx-storm" />;
  return <CloudRain {...props} className="wx-rain" />;
}

function dayName(date: string | undefined, index: number) {
  if (index === 0) return tr("Aujourd'hui", "Today");
  return date ? new Date(`${date}T12:00`).toLocaleDateString(lang, { weekday: "long" }) : "";
}

function Tile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <li className="wx-tile">
      <span className="wx-tile-label">{icon}{label}</span>
      <b>{value}</b>
      {hint && <small>{hint}</small>}
    </li>
  );
}

const UV_NAMES = { low: () => tr("Faible", "Low"), moderate: () => tr("Modéré", "Moderate"), high: () => tr("Élevé", "High"), very: () => tr("Très élevé", "Very high") };
const AIR_NAMES = { good: () => tr("Bon", "Good"), fair: () => tr("Correct", "Fair"), moderate: () => tr("Moyen", "Moderate"), poor: () => tr("Médiocre", "Poor"), bad: () => tr("Mauvais", "Bad") };

export default function WeatherPage() {
  const [city, setCity] = useState(() => readJson<string>("ethone-weather-city") ?? "Paris");
  const [saved, setSaved] = useState<string[]>(() => readJson<string[]>("ethone-weather-cities") ?? []);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const state = useLoad(() => apiData<WeatherData>(`api/weather?city=${encodeURIComponent(city)}`), [city]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setPlaces([]);
      return;
    }
    const timer = setTimeout(() => {
      apiData<Place[]>(`api/geocode?q=${encodeURIComponent(text)}`).then((found) => setPlaces(Array.isArray(found) ? found : []), () => setPlaces([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = (name: string) => {
    setCity(name);
    write("ethone-weather-city", JSON.stringify(name));
    setQuery("");
    setPlaces([]);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length >= 2) choose(places[0]?.name ?? query.trim());
  };
  const toggleSaved = (name: string) => {
    const next = toggleCity(saved, name);
    setSaved(next);
    write("ethone-weather-cities", JSON.stringify(next));
  };

  const data = state.data;
  const shownCity = data?.city ?? city;
  const days = data?.daily ?? [];
  const lowest = Math.min(...days.map((day) => day.min ?? Infinity));
  const highest = Math.max(...days.map((day) => day.max ?? -Infinity));
  const rain = nextRain(data?.hourly ?? []);
  const offset = data?.utcOffsetSeconds;

  return (
    <div className="wx">
      <PageHead title={tr("Météo", "Weather")} onRefresh={state.reload} refreshing={state.loading} />
      <form className="wx-search" role="search" onSubmit={submit}>
        <Search size={15} aria-hidden="true" />
        <input value={query} placeholder={tr("Changer de ville", "Change city")} aria-label={tr("Changer de ville", "Change city")} maxLength={80} autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
        {places.length > 0 && (
          <ul className="wx-places">
            {places.map((place, index) => (
              <li key={`${place.name}-${place.admin1}-${index}`}>
                <button type="button" onClick={() => choose(place.name)}><MapPin size={14} aria-hidden="true" /><b>{place.name}</b><small>{[place.admin1, place.country].filter(Boolean).join(", ")}</small></button>
              </li>
            ))}
          </ul>
        )}
      </form>
      {saved.length > 0 && (
        <ul className="wx-saved">
          {saved.map((name) => (
            <li key={name} className={name === city ? "on" : undefined}>
              <button type="button" onClick={() => choose(name)}>{name}</button>
              <button type="button" aria-label={tr(`Retirer ${name}`, `Remove ${name}`)} onClick={() => toggleSaved(name)}><X size={12} /></button>
            </li>
          ))}
        </ul>
      )}
      {state.error && <ErrorBox message={tr(`Impossible d'afficher la météo de ${city}.`, `Could not show the weather for ${city}.`)} />}
      {data && (
        <>
          <section className={data.isDay === false ? "wx-hero night" : "wx-hero"}>
            <div className="wx-now">
              <h2>{shownCity}{data.country ? <small>{data.country}</small> : null}</h2>
              <b className="wx-temp">{degrees(data.temperature)}</b>
              <p>{data.description}</p>
              <p className="wx-feels">
                {has(data.apparentTemperature) && tr(`Ressenti ${degrees(data.apparentTemperature)}`, `Feels like ${degrees(data.apparentTemperature)}`)}
                {days[0] && <span>{tr(`Max ${degrees(days[0].max)}, min ${degrees(days[0].min)}`, `High ${degrees(days[0].max)}, low ${degrees(days[0].min)}`)}</span>}
              </p>
            </div>
            <div className="wx-hero-side">
              <WeatherIcon code={data.weatherCode} day={data.isDay !== false} size={72} />
              <small>{rain ? tr(`Pluie probable vers ${hourOf(rain)}`, `Rain likely around ${hourOf(rain)}`) : tr("Pas de pluie prévue dans les 24 h", "No rain expected in the next 24 h")}</small>
              <button type="button" className={saved.includes(city) ? "wx-star on" : "wx-star"} aria-pressed={saved.includes(city)} onClick={() => toggleSaved(city)}><Star size={14} fill={saved.includes(city) ? "currentColor" : "none"} />{saved.includes(city) ? tr("Enregistrée", "Saved") : tr("Enregistrer", "Save")}</button>
            </div>
          </section>

          <section className="wx-card">
            <h3>{tr("Prochaines 24 heures", "Next 24 hours")}</h3>
            <ol className="wx-hours" tabIndex={0} aria-label={tr("Prévisions heure par heure", "Hourly forecast")}>
              {(data.hourly ?? []).map((hour, index) => (
                <li key={hour.time ?? index}>
                  <small>{index === 0 ? tr("Maint.", "Now") : hourOf(hour.time)}</small>
                  <WeatherIcon code={hour.weatherCode} day={hour.isDay !== false} />
                  <b>{degrees(hour.temperature)}</b>
                  <small className="wx-chance">{(hour.precipitationProbability ?? 0) > 0 ? `${hour.precipitationProbability} %` : " "}</small>
                </li>
              ))}
            </ol>
          </section>

          <div className="wx-columns">
            <section className="wx-card">
              <h3>{tr("7 prochains jours", "Next 7 days")}</h3>
              <ul className="wx-days">
                {days.map((day, index) => {
                  const bar = rangeBar(day.min ?? lowest, day.max ?? highest, lowest, highest);
                  return (
                    <li key={day.date ?? index} title={`${tr("Lever", "Sunrise")} ${cityTime(day.sunrise, offset)}, ${tr("coucher", "sunset")} ${cityTime(day.sunset, offset)}`}>
                      <span className="wx-day-name">{dayName(day.date, index)}</span>
                      <WeatherIcon code={day.weatherCode} />
                      <small className="wx-chance">{(day.precipitationProbability ?? 0) > 0 ? `${day.precipitationProbability} %` : ""}</small>
                      <small className="wx-min">{degrees(day.min)}</small>
                      <i className="wx-range"><em style={{ left: `${bar.left}%`, width: `${bar.width}%` }} /></i>
                      <b>{degrees(day.max)}</b>
                    </li>
                  );
                })}
              </ul>
            </section>
            <ul className="wx-tiles">
              {has(data.windSpeedKmh) && <Tile icon={<Wind size={14} />} label={tr("Vent", "Wind")} value={`${Math.round(data.windSpeedKmh)} km/h`} hint={[has(data.windDirection) ? compass(data.windDirection) : "", has(data.windGustsKmh) ? tr(`rafales ${Math.round(data.windGustsKmh)} km/h`, `gusts ${Math.round(data.windGustsKmh)} km/h`) : ""].filter(Boolean).join(", ")} />}
              {has(data.humidityPercent) && <Tile icon={<Droplets size={14} />} label={tr("Humidité", "Humidity")} value={`${Math.round(data.humidityPercent)} %`} hint={has(data.dewPoint) ? tr(`Point de rosée ${degrees(data.dewPoint)}`, `Dew point ${degrees(data.dewPoint)}`) : undefined} />}
              {has(data.uvIndex) && <Tile icon={<Sun size={14} />} label={tr("Indice UV", "UV index")} value={String(Math.round(data.uvIndex))} hint={UV_NAMES[uvLevel(data.uvIndex)]()} />}
              {has(data.airQuality) && <Tile icon={<Leaf size={14} />} label={tr("Qualité de l'air", "Air quality")} value={String(Math.round(data.airQuality))} hint={AIR_NAMES[airLevel(data.airQuality)]()} />}
              {has(data.pressure) && <Tile icon={<Gauge size={14} />} label={tr("Pression", "Pressure")} value={`${Math.round(data.pressure)} hPa`} />}
              {has(data.visibility) && <Tile icon={<Eye size={14} />} label={tr("Visibilité", "Visibility")} value={`${Math.round(data.visibility / 1000)} km`} />}
              {has(data.precipitationProbability) && <Tile icon={<CloudRain size={14} />} label={tr("Précipitations", "Precipitation")} value={`${data.precipitationProbability} %`} hint={has(data.precipitation) ? `${data.precipitation} mm` : undefined} />}
              {has(data.apparentTemperature) && <Tile icon={<Thermometer size={14} />} label={tr("Ressenti", "Feels like")} value={degrees(data.apparentTemperature)} />}
              {data.sunrise && <Tile icon={<Sunrise size={14} />} label={tr("Lever du soleil", "Sunrise")} value={cityTime(data.sunrise, offset)} />}
              {data.sunset && <Tile icon={<Sunset size={14} />} label={tr("Coucher du soleil", "Sunset")} value={cityTime(data.sunset, offset)} />}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
