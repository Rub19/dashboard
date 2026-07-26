function safeText(value, fallback = "", limit = 80) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function boundedNumber(value, minimum, maximum, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

export function normalizeWeatherPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const city = connected ? safeText(input.city) : "";
  const available = connected && Boolean(city);
  const forecast = available && Array.isArray(input.forecast)
    ? Object.freeze(input.forecast.slice(0, 3).map((day) => Object.freeze({
      date: safeText(day?.date, "", 10),
      max: Math.round(boundedNumber(day?.max, -90, 60)),
      min: Math.round(boundedNumber(day?.min, -90, 60))
    })))
    : Object.freeze([]);
  return Object.freeze({
    connected,
    available,
    city,
    country: available ? safeText(input.country) : "",
    temperature: available ? Math.round(boundedNumber(input.temperature, -90, 60)) : 0,
    description: available ? safeText(input.description, "", 60) : "",
    weatherCode: available ? Math.round(boundedNumber(input.weatherCode, 0, 99)) : 0,
    windSpeedKmh: available ? Math.round(boundedNumber(input.windSpeedKmh, 0, 400)) : 0,
    humidityPercent: available ? Math.round(boundedNumber(input.humidityPercent, 0, 100)) : 0,
    isDay: available ? input.isDay !== false : true,
    forecast,
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createWeatherLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getCity = typeof options.getCity === "function" ? options.getCity : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(300000, Number(options.pollIntervalMs) || 900000);
  const subscribers = new Set();
  let state = normalizeWeatherPresence({}, { connected: false });
  let timer = 0;
  let started = false;
  let destroyed = false;
  let inflight = null;

  function publish(next) {
    if (JSON.stringify(next) === JSON.stringify(state)) return state;
    state = next;
    subscribers.forEach((subscriber) => {
      try { subscriber(state); } catch {}
    });
    return state;
  }

  async function poll() {
    if (destroyed) return state;
    const connected = isConnected() === true;
    const city = connected ? safeText(getCity(), "", 80) : "";
    if (!connected || !city || !externalServices?.weather?.forecast) {
      return publish(normalizeWeatherPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.weather.forecast(city);
    try {
      const response = await inflight;
      return publish(normalizeWeatherPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeWeatherPresence({}, { connected }));
    } finally {
      inflight = null;
    }
  }

  function schedule() {
    if (destroyed) return;
    timer = runtime.setTimeout?.(() => {
      timer = 0;
      poll().finally(schedule);
    }, pollIntervalMs) || 0;
  }

  function start() {
    if (destroyed || started) return false;
    started = true;
    poll().finally(schedule);
    return true;
  }

  function subscribe(subscriber, config = {}) {
    if (destroyed || typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    if (config.immediate !== false) {
      try { subscriber(state); } catch {}
    }
    return () => subscribers.delete(subscriber);
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    if (timer) runtime.clearTimeout?.(timer);
    timer = 0;
    subscribers.clear();
    return true;
  }

  return Object.freeze({
    start,
    refresh: () => poll(),
    subscribe,
    state: () => state,
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, city: state.city, subscribers: subscribers.size }),
    destroy
  });
}
