import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { weatherIcon } from "./weather-live.mjs";
import { computeFloatingPosition, getLayerManager } from "./layer-manager.mjs";

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function dayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return DAY_FORMAT.format(date);
}

function forecastRow(day) {
  return element("div", { className: "v8-weather-detail__day" }, [
    element("small", { text: dayLabel(day.date) }),
    element("b", { text: `${day.max}°` }),
    element("span", { text: `${day.min}°` })
  ]);
}

export function createWeatherDetail(options = {}) {
  const documentRef = options.document || globalThis.document;
  const host = options.host || documentRef?.body;
  const runtime = options.runtime || documentRef?.defaultView || globalThis;
  const layerManager = getLayerManager({ document: documentRef, runtime });
  let popover = null;
  let layerRegistration = null;

  function close(closeOptions = {}) {
    if (!popover) return false;
    const current = popover;
    popover = null;
    layerRegistration?.release?.({ restoreFocus: closeOptions.restoreFocus === true });
    layerRegistration = null;
    current.remove();
    return true;
  }

  function open(anchorEl, presence = {}) {
    close({ restoreFocus: false });
    if (!host || !anchorEl || presence.available !== true) return false;
    const forecast = Array.isArray(presence.forecast) ? presence.forecast : [];
    popover = element("div", {
      className: "v8-weather-détail",
      attributes: { role: "dialog", "aria-label": "Détail météo" }
    }, [
      element("header", { className: "v8-weather-detail__head" }, [
        icon(weatherIcon(presence.weatherCode, presence.isDay)),
        element("div", {}, [
          element("strong", { text: presence.country ? `${presence.city}, ${presence.country}` : presence.city, attributes: { translate: "no" } }),
          element("p", { text: presence.description, attributes: { translate: "no" } })
        ])
      ]),
      element("div", { className: "v8-weather-detail__temp" }, [element("strong", { text: `${presence.temperature}°C` })]),
      element("div", { className: "v8-weather-detail__stats" }, [
        element("span", {}, [icon("wind"), element("b", { text: `${presence.windSpeedKmh} km/h` }), element("small", { text: "Vent" })]),
        element("span", {}, [icon("droplets"), element("b", { text: `${presence.humidityPercent}%` }), element("small", { text: "Humidité" })])
      ]),
      forecast.length ? element("div", { className: "v8-weather-detail__forecast" }, forecast.map(forecastRow)) : null
    ].filter(Boolean));
    host.append(popover);
    refreshIcons();
    const position = computeFloatingPosition({
      anchor: anchorEl.getBoundingClientRect(),
      floating: popover.getBoundingClientRect(),
      viewport: { width: runtime.innerWidth, height: runtime.innerHeight },
      preferred: "bottom-start"
    });
    popover.dataset.placement = position.placement;
    popover.style.left = `${position.x}px`;
    popover.style.top = `${position.y}px`;
    popover.style.maxHeight = `${position.maxHeight}px`;
    layerRegistration = layerManager.register({
      element: popover,
      boundary: popover,
      anchor: anchorEl,
      returnFocus: anchorEl,
      kind: "popover",
      closeOnEscape: true,
      closeOnOutside: true,
      closeOnScroll: true,
      closeOnResize: true,
      onDismiss: (reason) => close({ restoreFocus: reason === "escape" })
    });
    return true;
  }

  return Object.freeze({ open, close, isOpen: () => Boolean(popover), destroy: close });
}
