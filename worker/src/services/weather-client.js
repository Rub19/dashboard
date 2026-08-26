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

function currentHourIndex(hourlyTimes, currentTime) {
  if (!Array.isArray(hourlyTimes) || !hourlyTimes.length) return 0;
  if (!currentTime) return 0;
  const idx = hourlyTimes.findIndex((t) => String(t) === String(currentTime));
  return idx >= 0 ? idx : 0;
}

function nextHours(values, startIndex, count = 24) {
  if (!Array.isArray(values) || startIndex < 0) return [];
  return values.slice(startIndex, startIndex + count);
}

async function geocodeSearch(env, name, count = 1) {
  const geocodeUrl = new URL("/v1/search", GEOCODE_ORIGIN);
  geocodeUrl.searchParams.set("name", name);
  geocodeUrl.searchParams.set("count", String(count));
  geocodeUrl.searchParams.set("language", "fr");
  geocodeUrl.searchParams.set("format", "json");
  const geocode = await requestExternal(geocodeUrl, {
    env,
    expectedOrigin: GEOCODE_ORIGIN,
    service: "weather",
    dedupeKey: `geocode:${name.toLowerCase()}:${count}`,
    retries: 1,
    maxBytes: 64 * 1024
  });
  return geocode.data?.results?.[0] || null;
}

export async function geocodeSuggestions(env, query, limit = 5) {
  const geocodeUrl = new URL("/v1/search", GEOCODE_ORIGIN);
  geocodeUrl.searchParams.set("name", query);
  geocodeUrl.searchParams.set("count", String(limit));
  geocodeUrl.searchParams.set("language", "fr");
  geocodeUrl.searchParams.set("format", "json");
  const geocode = await requestExternal(geocodeUrl, {
    env,
    expectedOrigin: GEOCODE_ORIGIN,
    service: "weather",
    dedupeKey: `geocode:suggest:${query.toLowerCase()}:${limit}`,
    retries: 1,
    maxBytes: 64 * 1024
  });
  return Object.freeze((geocode.data?.results || []).slice(0, limit).map((place) => Object.freeze({
    name: safeText(place.name, 80),
    country: safeText(place.country, 80),
    admin1: safeText(place.admin1, 80),
    latitude: safeNumber(place.latitude, -90, 90),
    longitude: safeNumber(place.longitude, -180, 180)
  })));
}

async function fetchAirQuality(env, latitude, longitude) {
  const url = new URL("/v1/air-quality", AIR_QUALITY_ORIGIN);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "european_aqi,us_aqi,pm10,pm2_5");
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
    const aqi = safeNumber(current.european_aqi ?? current.us_aqi, 0, 500);
    return Object.freeze({
      aqi,
      pm10: safeNumber(current.pm10, 0, 1000),
      pm25: safeNumber(current.pm2_5, 0, 1000),
    });
  } catch {
    return Object.freeze({ aqi: undefined, pm10: undefined, pm25: undefined });
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
  forecastUrl.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,is_day,apparent_temperature,surface_pressure,uv_index,visibility,dew_point_2m");
  forecastUrl.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability,precipitation,is_day");
  forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code,precipitation_probability_max");
  forecastUrl.searchParams.set("forecast_days", "7");
  forecastUrl.searchParams.set("timezone", "auto");
  const forecast = await requestExternal(forecastUrl, {
    env,
    expectedOrigin: FORECAST_ORIGIN,
    service: "weather",
    dedupeKey: `forecast:${latitude},${longitude}`,
    retries: 1,
    maxBytes: 256 * 1024
  });
  const current = forecast.data?.current || {};
  const hourly = forecast.data?.hourly || {};
  const daily = forecast.data?.daily || {};

  const airQualityData = await fetchAirQuality(env, latitude, longitude);
  const aqi = airQualityData?.aqi;

  const hIndex = currentHourIndex(hourly.time, current.time);
  const next24 = 24;

  const precipitation = safeNumber(hourly.precipitation?.[hIndex], 0, 1000);
  const precipitationProbability = safeNumber(hourly.precipitation_probability?.[hIndex], 0, 100);

  return Object.freeze({
    updatedAt: new Date().toISOString(),
    latitude,
    longitude,
    city: safeText(place.name, 80),
    country: safeText(place.country, 80),
    temperature: safeNumber(current.temperature_2m, -90, 60),
    apparentTemperature: safeNumber(current.apparent_temperature, -90, 60),
    weatherCode: safeNumber(current.weather_code, 0, 99),
    description: weatherLabel(current.weather_code),
    windSpeedKmh: safeNumber(current.wind_speed_10m, 0, 400),
    windDirection: safeNumber(current.wind_direction_10m, 0, 360),
    windGustsKmh: safeNumber(current.wind_gusts_10m, 0, 400),
    humidityPercent: safeNumber(current.relative_humidity_2m, 0, 100),
    pressure: safeNumber(current.surface_pressure, 800, 1100),
    uvIndex: safeNumber(current.uv_index, 0, 25),
    isDay: current.is_day !== 0,
    visibility: safeNumber(current.visibility, 0, 100000),
    dewPoint: safeNumber(current.dew_point_2m, -90, 60),
    sunrise: formatIsoTime(firstDailyValue(daily.sunrise)),
    sunset: formatIsoTime(firstDailyValue(daily.sunset)),
    precipitation,
    precipitationProbability,
    airQuality: aqi,
    airQualityDetails: airQualityData,
    hourly: Object.freeze(nextHours(hourly.time, hIndex, next24).map((time, i) => Object.freeze({
      time: safeText(time, 24),
      temperature: safeNumber(hourly.temperature_2m?.[hIndex + i], -90, 60),
      weatherCode: safeNumber(hourly.weather_code?.[hIndex + i], 0, 99),
      precipitation: safeNumber(hourly.precipitation?.[hIndex + i], 0, 1000),
      precipitationProbability: safeNumber(hourly.precipitation_probability?.[hIndex + i], 0, 100),
      isDay: hourly.is_day?.[hIndex + i] !== 0,
    }))),
    daily: Object.freeze((Array.isArray(daily.time) ? daily.time : []).slice(0, 7).map((date, index) => Object.freeze({
      date: safeText(date, 10),
      max: safeNumber(daily.temperature_2m_max?.[index], -90, 60),
      min: safeNumber(daily.temperature_2m_min?.[index], -90, 60),
      weatherCode: safeNumber(daily.weather_code?.[index], 0, 99),
      precipitationProbability: safeNumber(daily.precipitation_probability_max?.[index], 0, 100),
      sunrise: formatIsoTime(daily.sunrise?.[index]),
      sunset: formatIsoTime(daily.sunset?.[index]),
    }))),
    forecast: Object.freeze((Array.isArray(daily.time) ? daily.time : []).slice(0, 5).map((date, index) => Object.freeze({
      date: safeText(date, 10),
      max: safeNumber(daily.temperature_2m_max?.[index], -90, 60),
      min: safeNumber(daily.temperature_2m_min?.[index], -90, 60)
    })))
  });
}
