import { element } from "./dom.mjs";

const TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function freshnessLabel(updatedAtIso) {
  const date = new Date(updatedAtIso);
  if (Number.isNaN(date.getTime())) return "";
  return TIME_FORMAT.format(date);
}

export function liveFreshnessNode(updatedAtIso) {
  const label = freshnessLabel(updatedAtIso);
  if (!label) return null;
  return element("small", { className: "v8-live-freshness", text: label });
}

export function livePulseDot() {
  return element("span", { className: "v8-live-pulse-dot", attributes: { "aria-hidden": "true" } });
}
