import assert from "node:assert/strict";
import test from "node:test";
import { getWeather } from "../src/services/weather-client.js";
import { json, testEnv } from "./helpers.mjs";

function forecastResponse(extra = {}) {
  return json({
    utc_offset_seconds: 7200,
    ...extra,
    current: {
      temperature_2m: 12,
      apparent_temperature: 11,
      weather_code: 1,
      wind_speed_10m: 8,
      relative_humidity_2m: 60,
      is_day: 1,
      surface_pressure: 1012,
      uv_index: 3
    },
    daily: {
      time: ["2026-07-30", "2026-07-31", "2026-08-01"],
      temperature_2m_max: [15, 16, 18],
      temperature_2m_min: [8, 9, 10],
      sunrise: ["2026-07-30T06:30:00", "2026-07-31T06:31:00", "2026-08-01T06:32:00"],
      sunset: ["2026-07-30T21:00:00", "2026-07-31T20:59:00", "2026-08-01T20:58:00"]
    }
  });
}

function airQualityResponse() {
  return json({ current: { european_aqi: 42 } });
}

test("getWeather falls back to a hyphenated query when the plain-space name has no geocoding match", async () => {
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "geocoding-api.open-meteo.com") {
        calls.push(url.searchParams.get("name"));
        if (url.searchParams.get("name") === "Brive-la-Gaillarde") {
          return json({ results: [{ name: "Brive-la-Gaillarde", country: "France", latitude: 45.16, longitude: 1.53 }] });
        }
        return json({});
      }
      if (url.hostname === "api.open-meteo.com") return forecastResponse();
      if (url.hostname === "air-quality-api.open-meteo.com") return airQualityResponse();
      throw new Error(`Unexpected destination: ${url.href}`);
    }
  });
  const weather = await getWeather(env, "Brive la Gaillarde");
  assert.equal(weather.city, "Brive-la-Gaillarde");
  assert.equal(weather.apparentTemperature, 11);
  assert.equal(weather.pressure, 1012);
  assert.equal(weather.uvIndex, 3);
  assert.equal(weather.airQuality, 42);
  // Heure murale de la ville (UTC+2) -> instant UTC réel, quel que soit le fuseau de la machine.
  assert.equal(weather.sunrise, "2026-07-30T04:30:00.000Z");
  assert.equal(weather.utcOffsetSeconds, 7200);
  assert.equal(weather.forecast.length, 3);
  assert.deepEqual(calls, ["Brive la Gaillarde", "Brive-la-Gaillarde"]);
});

test("getWeather does not retry when the plain-space query already resolves", async () => {
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "geocoding-api.open-meteo.com") {
        calls.push(url.searchParams.get("name"));
        return json({ results: [{ name: "Saint Etienne", country: "France", latitude: 45.43, longitude: 4.39 }] });
      }
      if (url.hostname === "api.open-meteo.com") return forecastResponse();
      if (url.hostname === "air-quality-api.open-meteo.com") return airQualityResponse();
      throw new Error(`Unexpected destination: ${url.href}`);
    }
  });
  const weather = await getWeather(env, "Saint Etienne");
  assert.equal(weather.city, "Saint Etienne");
  assert.equal(weather.apparentTemperature, 11);
  assert.equal(weather.uvIndex, 3);
  assert.deepEqual(calls, ["Saint Etienne"]);
});

test("getWeather starts the hourly strip at the current hour even when current.time is mid-hour", async () => {
  const hours = Array.from({ length: 48 }, (_, i) => `2026-07-30T${String(i % 24).padStart(2, "0")}:00`).map((t, i) => (i < 24 ? t : t.replace("07-30", "07-31")));
  const env = testEnv({
    __TEST_FETCH__: async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "geocoding-api.open-meteo.com") return json({ results: [{ name: "Paris", country: "France", latitude: 48.85, longitude: 2.35 }] });
      if (url.hostname === "api.open-meteo.com") {
        const body = await forecastResponse().json();
        body.current.time = "2026-07-30T21:15";
        body.hourly = { time: hours, temperature_2m: hours.map((_, i) => i) };
        return json(body);
      }
      if (url.hostname === "air-quality-api.open-meteo.com") return airQualityResponse();
      throw new Error(`Unexpected destination: ${url.href}`);
    }
  });
  const weather = await getWeather(env, "Paris");
  assert.equal(weather.hourly[0].time, "2026-07-30T21:00");
  assert.equal(weather.hourly[0].temperature, 21);
  assert.equal(weather.hourly.length, 24);
  assert.equal(weather.description, "Plutôt dégagé");
});
