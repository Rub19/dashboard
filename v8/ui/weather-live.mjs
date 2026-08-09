import { attachFlipBehavior, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

const WEATHER_CONDITIONS = Object.freeze({
  clear: Object.freeze({
    key: "clear",
    icon: "sun",
    nightIcon: "moon-star",
    emoji: "☀️",
    nightEmoji: "🌙",
    tone: "#f59e0b",
    nightTone: "#6366f1",
    toneLight: "#fbbf24",
    nightToneLight: "#818cf8"
  }),
  partlyCloudy: Object.freeze({
    key: "partly-cloudy",
    icon: "cloud-sun",
    nightIcon: "cloud-moon",
    emoji: "⛅",
    nightEmoji: "🌙",
    tone: "#38bdf8",
    nightTone: "#4f46e5",
    toneLight: "#7dd3fc",
    nightToneLight: "#818cf8"
  }),
  cloudy: Object.freeze({
    key: "cloudy",
    icon: "cloud",
    emoji: "☁️",
    tone: "#64748b",
    toneLight: "#94a3b8"
  }),
  fog: Object.freeze({
    key: "fog",
    icon: "cloud-fog",
    emoji: "🌫️",
    tone: "#14b8a6",
    toneLight: "#5eead4"
  }),
  drizzle: Object.freeze({
    key: "drizzle",
    icon: "cloud-drizzle",
    emoji: "🌦️",
    tone: "#38bdf8",
    toneLight: "#7dd3fc"
  }),
  rain: Object.freeze({
    key: "rain",
    icon: "cloud-rain",
    emoji: "🌧️",
    tone: "#0ea5e9",
    toneLight: "#38bdf8"
  }),
  snow: Object.freeze({
    key: "snow",
    icon: "cloud-snow",
    emoji: "❄️",
    tone: "#22d3ee",
    toneLight: "#a5f3fc"
  }),
  thunder: Object.freeze({
    key: "thunder",
    icon: "cloud-lightning",
    emoji: "⛈️",
    tone: "#8b5cf6",
    toneLight: "#c4b5fd"
  }),
  unknown: Object.freeze({
    key: "unknown",
    icon: "cloud",
    emoji: "🌡️",
    tone: "#94a3b8",
    toneLight: "#cbd5e1"
  })
});

function baseCondition(code) {
  if (code === 0) return WEATHER_CONDITIONS.clear;
  if (code <= 2) return WEATHER_CONDITIONS.partlyCloudy;
  if (code === 3) return WEATHER_CONDITIONS.cloudy;
  if (code === 45 || code === 48) return WEATHER_CONDITIONS.fog;
  if (code >= 51 && code <= 57) return WEATHER_CONDITIONS.drizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return WEATHER_CONDITIONS.rain;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return WEATHER_CONDITIONS.snow;
  if (code >= 95) return WEATHER_CONDITIONS.thunder;
  return WEATHER_CONDITIONS.unknown;
}

export function weatherCondition(code, isDay) {
  const condition = baseCondition(code);
  const night = isDay !== true;
  return Object.freeze({
    key: condition.key,
    icon: night ? (condition.nightIcon || condition.icon) : condition.icon,
    emoji: night ? (condition.nightEmoji || condition.emoji) : condition.emoji,
    tone: night ? (condition.nightTone || condition.tone) : condition.tone,
    toneLight: night ? (condition.nightToneLight || condition.toneLight) : condition.toneLight
  });
}

export function weatherIcon(code, isDay) {
  return weatherCondition(code, isDay).icon;
}

export function weatherEmoji(code, isDay) {
  return weatherCondition(code, isDay).emoji;
}

function forecastRow(forecast) {
  if (!forecast.length) return null;
  return element("div", { className: "v8-weather-forecast" }, forecast.map((day) => element("span", {}, [
    element("small", { text: day.date.slice(5) }),
    element("b", { text: `${day.max}°` }),
    element("small", { text: `${day.min}°` })
  ])));
}

function forecastBack(forecast) {
  if (!forecast.length) return null;
  return element("div", { className: "v8-weather-back__forecast" }, [
    element("small", { text: "Prévisions" }),
    element("div", { className: "v8-weather-back__days" }, forecast.map((day) =>
      element("span", {}, [
        element("small", { text: day.date.slice(5) }),
        element("b", { text: `${day.max}°` }),
        element("small", { text: `${day.min}°` })
      ])
    ))
  ]);
}

function statTile(value, label, iconName) {
  return element("span", { className: "v8-weather-back__stat" }, [
    icon(iconName),
    element("b", { text: value }),
    element("small", { text: label })
  ]);
}

export function weatherIconBadge(condition, { size = "md" } = {}) {
  const className = size === "md" ? "v8-weather-icon" : `v8-weather-icon v8-weather-icon--${size}`;
  return element("span", { className }, [
    icon(condition.icon),
    element("span", { className: "v8-weather-emoji", text: condition.emoji, attributes: { "aria-hidden": "true" } }),
    size === "md" ? livePulseDot() : null
  ]);
}

export function weatherLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const detailable = options.detailable === true;
  const condition = weatherCondition(presence.weatherCode, presence.isDay);

  const body = element("div", { className: "v8-weather-live__body" }, [
    element("div", { className: "v8-weather-live__meta" }, [icon("map-pin"), element("small", { text: presence.country ? `${presence.city}, ${presence.country}` : presence.city, attributes: { translate: "no" } })]),
    element("strong", { text: `${presence.temperature}°C` }),
    element("p", { text: `${presence.description} - Vent ${presence.windSpeedKmh} km/h - ${presence.humidityPercent}% humidité` }),
    liveFreshnessNode(presence.updatedAt),
    detailable ? element("button", {
      className: "v8-icon-button v8-weather-detail__trigger",
      attributes: { type: "button", "aria-label": "Voir le détail météo", "aria-haspopup": "dialog", title: "Voir le détail météo" },
      dataset: { weatherDetailTrigger: "" }
    }, [icon("info")]) : null
  ]);

  const front = element("div", { className: `v8-weather-live v8-weather-live--${variant} v8-surface v8-live-card-front` }, [
    weatherIconBadge(condition),
    body,
    forecastRow(presence.forecast)
  ]);

  const back = element("div", { className: "v8-live-card-back v8-weather-live-back" }, [
    element("header", { className: "v8-weather-back__header" }, [
      weatherIconBadge(condition, { size: "sm" }),
      element("div", {}, [
        element("strong", { text: presence.city, attributes: { translate: "no" } }),
        element("small", { text: presence.country || "Météo" })
      ])
    ]),
    element("div", { className: "v8-weather-back__temp" }, [
      element("strong", { text: `${presence.temperature}°` }),
      element("small", { text: presence.description })
    ]),
    element("div", { className: "v8-weather-back__stats" }, [
      statTile(`${presence.windSpeedKmh} km/h`, "Vent", "wind"),
      statTile(`${presence.humidityPercent}%`, "Humidité", "droplets")
    ]),
    forecastBack(presence.forecast),
    element("footer", { className: "v8-weather-back__footer" }, [liveFreshnessNode(presence.updatedAt)])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-weather-live v8-weather-live--${variant}`,
    attributes: { "aria-label": "Météo" },
    dataset: { liveWidget: "media", liveKind: "widget", weatherTone: condition.key }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
