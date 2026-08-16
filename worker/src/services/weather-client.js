import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import { safeNumber, safeText } from "../utils/normalize.js";

const GEOCODE_ORIGIN = "https://geocoding-api.open-meteo.com";
const FORECAST_ORIGIN = "https://api.open-meteo.com";
const AIR_QUALITY_ORIGIN = "https://air-quality-api.open-meteo.com";

const WEATHER_LABELS = Object.freeze({
  0: "Ciel degage",
  1: "Plutot degage",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine legere",
  53: "Bruine",
  55: "Bruine dense",
  56: "Bruine verglacante",
  57: "Bruine verglacante dense",
  61: "Pluie legere",
  63: "Pluie",
  65: "Pluie forte",
  66: "Pluie verglacante",
  67: "Pluie verglacante forte",
  71: "Neige legere",
  73: "Neige",
  75: "Neige forte",
  77: "Grains de neige",
  80: "Averses legeres",
  81: "Averses",
  82: "Averses violentes",
  85: "Averses de neige legeres",
  86: "Averses de neige fortes",
  95: "Orage",
  96: "Orage avec grele",
  99: "Orage avec grele forte"
});

function weatherLabel(code) {
  return WEATHER_LABELS[Number(code)] || "Conditions inconnues";
}

function formatIsoTime(value) {
  const iso = String(value || "");
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString();
}

function firstDailyValue(values) {
  return Array.isArray(values) ? values[0] : undefined;
}

async function geocodeSearch(env, name) {
  const geocodeUrl = new URL("/v1/search", GEOCODE_ORIGIN);
  geocodeUrl.searchParams.set("name", name);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "fr");
  geocodeUrl.searchParams.set("format", "json");
  const geocode = await requestExternal(geocodeUrl, {
    env,
    expectedOrigin: GEOCODE_ORIGIN,
    service: "weather",
    dedupeKey: `geocode:${name.toLowerCase()}`,
    retries: 1,
    maxBytes: 64 * 1024
  });
  return geocode.data?.results?.[0] || null;
}

async function fetchAirQuality(env, latitude, longitude) {
  const url = new URL("/v1/air-quality", AIR_QUALITY_ORIGIN);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "european_aqi,us_aqi");
  url.searchParams.set("timezone", "auto");
  try {
    const res = await requestExternal(url, {
      env,
      expectedOrigin: AIR_QUALITY_ORIGIN,
      service: "weather",
      dedupeKey: `aqi:${latitude},${longitude}`,
      retries: 0,
      maxBytes: 64 * 1024,
      timeoutMs: 4000
    });
    const current = res.data?.current || {};
    return safeNumber(current.european_aqi ?? current.us_aqi, 0, 500);
  } catch {
    return undefined;
  }
}

export async function getWeather(env, city) {
  let place = await geocodeSearch(env, city);
  if (!place && city.includes(" ")) place = await geocodeSearch(env, city.replace(/\s+/g, "-"));
  if (!place) throw httpError("PROVIDER_NOT_FOUND", 404);
  const latitude = safeNumber(place.latitude, -90, 90);
  const longitude = safeNumber(place.longitude, -180, 180);

  const forecastUrl = new URL("/v1/forecast", FORECAST_ORIGIN);
  forecastUrl.searchParams.set("latitude", String(latitude));
  forecastUrl.searchParams.set("longitude", String(longitude));
  forecastUrl.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day,apparent_temperature,surface_pressure,uv_index");
  forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,sunrise,sunset");
  forecastUrl.searchParams.set("forecast_days", "5");
  forecastUrl.searchParams.set("timezone", "auto");
  const forecast = await requestExternal(forecastUrl, {
    env,
    expectedOrigin: FORECAST_ORIGIN,
    service: "weather",
    dedupeKey: `forecast:${latitude},${longitude}`,
    retries: 1,
    maxBytes: 128 * 1024
  });
  const current = forecast.data?.current || {};
  const daily = forecast.data?.daily || {};

  const airQuality = await fetchAirQuality(env, latitude, longitude);

  return Object.freeze({
    city: safeText(place.name, 80),
    country: safeText(place.country, 80),
    temperature: safeNumber(current.temperature_2m, -90, 60),
    apparentTemperature: safeNumber(current.apparent_temperature, -90, 60),
    weatherCode: safeNumber(current.weather_code, 0, 99),
    description: weatherLabel(current.weather_code),
    windSpeedKmh: safeNumber(current.wind_speed_10m, 0, 400),
    humidityPercent: safeNumber(current.relative_humidity_2m, 0, 100),
    pressure: safeNumber(current.surface_pressure, 800, 1100),
    uvIndex: safeNumber(current.uv_index, 0, 25),
    isDay: current.is_day !== 0,
    sunrise: formatIsoTime(firstDailyValue(daily.sunrise)),
    sunset: formatIsoTime(firstDailyValue(daily.sunset)),
    airQuality,
    forecast: Object.freeze((Array.isArray(daily.time) ? daily.time : []).slice(0, 5).map((date, index) => Object.freeze({
      date: safeText(date, 10),
      max: safeNumber(daily.temperature_2m_max?.[index], -90, 60),
      min: safeNumber(daily.temperature_2m_min?.[index], -90, 60)
    })))
  });
}
