import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-tracker-avatar__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-tracker-avatar__image is-fallback" }, [icon("chart-no-axes-combined")]);
  return element("span", { className: "v8-tracker-avatar" }, [inner, livePulseDot()]);
}

export function trackerLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const stat = presence.overview?.stats?.[0];
  const statLine = stat ? `${stat.displayName} : ${stat.displayValue}` : "Statistiques Apex Legends";
  return element(options.tagName || "article", {
    className: `v8-tracker-live v8-tracker-live--${variant} v8-surface`,
    attributes: { "aria-label": "Statistiques Tracker.gg" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    avatar(presence),
    element("div", { className: "v8-tracker-live__body" }, [
      element("div", { className: "v8-tracker-live__meta" }, [icon("chart-no-axes-combined"), element("small", { text: "Apex Legends" })]),
      element("strong", { text: presence.handle, attributes: { translate: "no" } }),
      element("p", { text: statLine, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
