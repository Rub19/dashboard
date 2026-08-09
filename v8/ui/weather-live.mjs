import { attachFlipBehavior, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

export function weatherIcon(code, isDay) {
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

export function weatherLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const detailable = options.detailable === true;

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
    element("span", { className: "v8-weather-icon" }, [icon(weatherIcon(presence.weatherCode, presence.isDay)), livePulseDot()]),
    body,
    forecastRow(presence.forecast)
  ]);

  const back = element("div", { className: "v8-live-card-back v8-weather-live-back" }, [
    element("header", { className: "v8-weather-back__header" }, [
      icon(weatherIcon(presence.weatherCode, presence.isDay)),
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
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
