"use client";

import { fetchWorkerCached } from "./hooks/useCachedFetch";
import type { WeatherData } from "@/components/WeatherWidget";

const WEATHER_LABELS: Record<number, string> = {
  0: "Ciel dégagé",
  1: "Plutôt dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine",
  55: "Bruine dense",
  56: "Bruine verglaçante",
  57: "Bruine verglaçante dense",
  61: "Pluie légère",
  63: "Pluie",
  65: "Pluie forte",
  66: "Pluie verglaçante",
  67: "Pluie verglaçante forte",
  71: "Neige légère",
  73: "Neige",
  75: "Neige forte",
  77: "Grains de neige",
  80: "Averses légères",
  81: "Averses",
  82: "Averses violentes",
  85: "Averses de neige légères",
  86: "Averses de neige fortes",
  95: "Orage",
  96: "Orage avec grêle",
  99: "Orage avec grêle forte",
};

export async function fetchDirectOpenMeteo(city: string): Promise<WeatherData | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`
    );
    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const place = geoData?.results?.[0];
    if (!place) return null;

    const { latitude, longitude, name: cityName, country } = place;

    const [forecastRes, aqiRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm10,pm2_5&timezone=auto`
      ).catch(() => null),
    ]);

    if (!forecastRes.ok) return null;
    const forecast = await forecastRes.json();
    const aqiData = aqiRes && aqiRes.ok ? await aqiRes.json().catch(() => null) : null;

    const current = forecast.current || {};
    const daily = forecast.daily || {};
    const hourly = forecast.hourly || {};

    const hourlyList = (hourly.time || []).slice(0, 24).map((t: string, i: number) => ({
      time: t,
      temperature: hourly.temperature_2m?.[i],
      weatherCode: hourly.weather_code?.[i],
      precipitation: hourly.precipitation?.[i],
      precipitationProbability: hourly.precipitation_probability?.[i],
      isDay: Boolean(hourly.is_day?.[i]),
    }));

    const dailyList = (daily.time || []).map((d: string, i: number) => ({
      date: d,
      max: daily.temperature_2m_max?.[i],
      min: daily.temperature_2m_min?.[i],
      weatherCode: daily.weather_code?.[i],
      precipitationProbability: daily.precipitation_probability_max?.[i],
      sunrise: daily.sunrise?.[i],
      sunset: daily.sunset?.[i],
    }));

    const weatherCode = current.weather_code ?? 0;

    return {
      updatedAt: new Date().toISOString(),
      latitude,
      longitude,
      city: cityName,
      country,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      weatherCode,
      description: WEATHER_LABELS[weatherCode] || "Conditions variables",
      windSpeedKmh: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      windGustsKmh: current.wind_gusts_10m,
      humidityPercent: current.relative_humidity_2m,
      pressure: current.surface_pressure,
      isDay: Boolean(current.is_day),
      sunrise: daily.sunrise?.[0],
      sunset: daily.sunset?.[0],
      precipitation: current.precipitation,
      precipitationProbability: daily.precipitation_probability_max?.[0] ?? 0,
      airQuality: aqiData?.current?.european_aqi,
      airQualityDetails: {
        aqi: aqiData?.current?.european_aqi,
        pm10: aqiData?.current?.pm10,
        pm25: aqiData?.current?.pm2_5,
      },
      hourly: hourlyList,
      daily: dailyList,
      forecast: dailyList.slice(0, 5),
    };
  } catch {
    return null;
  }
}

export async function fetchWeatherSafe(city: string): Promise<WeatherData | null> {
  const cleanCity = city.trim();
  if (!cleanCity) return null;

  try {
    const res = (await fetchWorkerCached(`/api/weather?city=${encodeURIComponent(cleanCity)}`)) as { data?: WeatherData } | null;
    if (res?.data && typeof res.data.temperature === "number") {
      return res.data;
    }
  } catch {
    // Worker request failed, try direct fallback seamlessly
  }

  return await fetchDirectOpenMeteo(cleanCity);
}
