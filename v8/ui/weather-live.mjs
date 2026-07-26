import { element, icon } from "./dom.mjs";

function weatherIcon(code, isDay) {
  if (code === 0) return isDay ? "sun" : "moon-star";
  if (code <= 2) return isDay ? "cloud-sun" : "cloud-moon";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "cloud-fog";
  if (code >= 51 && code <= 57) return "cloud-drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "cloud-rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "cloud-snow";
  if (code >= 95) return "cloud-lightning";
  return "cloud";
}

function forecastRow(forecast) {
  if (!forecast.length) return null;
  return element("div", { className: "v8-weather-forecast" }, forecast.map((day) => element("span", {}, [
    element("small", { text: day.date.slice(5) }),
    element("b", { text: `${day.max}°` }),
    element("small", { text: `${day.min}°` })
  ])));
}

export function weatherLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  return element(options.tagName || "article", {
    className: `v8-weather-live v8-weather-live--${variant} v8-surface`,
    attributes: { "aria-label": "Meteo" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    element("span", { className: "v8-weather-icon" }, [icon(weatherIcon(presence.weatherCode, presence.isDay))]),
    element("div", { className: "v8-weather-live__body" }, [
      element("div", { className: "v8-weather-live__meta" }, [icon("map-pin"), element("small", { text: presence.country ? `${presence.city}, ${presence.country}` : presence.city, attributes: { translate: "no" } })]),
      element("strong", { text: `${presence.temperature}°C` }),
      element("p", { text: `${presence.description} - Vent ${presence.windSpeedKmh} km/h - ${presence.humidityPercent}% humidite` })
    ]),
    forecastRow(presence.forecast)
  ]);
}
