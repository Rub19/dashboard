import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function artwork(presence) {
  const inner = presence.artworkUrl
    ? element("span", { className: "v8-lastfm-artwork__image" }, [element("img", {
      attributes: { src: presence.artworkUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-lastfm-artwork__image is-fallback" }, [icon("history")]);
  return element("span", { className: "v8-lastfm-artwork" }, [inner, livePulseDot()]);
}

export function lastfmLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  return element(options.tagName || "article", {
    className: `v8-lastfm-live v8-lastfm-live--${variant} v8-surface`,
    attributes: { "aria-label": "Last.fm" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    artwork(presence),
    element("div", { className: "v8-lastfm-live__body" }, [
      element("div", { className: "v8-lastfm-live__meta" }, [brandIcon("lastfm", "history", "v8-live-brand-mark"), element("small", { text: presence.playing ? "Ecoute en cours" : "Dernier morceau" })]),
      element("strong", { text: presence.title, attributes: { translate: "no" } }),
      element("p", { text: presence.artist, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
