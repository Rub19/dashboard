import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

export function youtubeLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const inner = presence.thumbnailUrl
    ? element("span", { className: "v8-youtube-avatar__image" }, [element("img", {
      attributes: { src: presence.thumbnailUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-youtube-avatar__image is-fallback" }, [icon("youtube")]);
  const meta = presence.latestVideoTitle ? "Derniere video" : "Chaine YouTube";
  return element(options.tagName || "article", {
    className: `v8-youtube-live v8-youtube-live--${variant} v8-surface`,
    attributes: { "aria-label": "Activite YouTube" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    element("span", { className: "v8-youtube-avatar" }, [inner, livePulseDot()]),
    element("div", { className: "v8-youtube-live__body" }, [
      element("div", { className: "v8-youtube-live__meta" }, [icon("youtube"), element("small", { text: meta })]),
      element("strong", { text: presence.channelTitle, attributes: { translate: "no" } }),
      element("p", { text: presence.latestVideoTitle || `${presence.subscriberCount} abonnes`, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
