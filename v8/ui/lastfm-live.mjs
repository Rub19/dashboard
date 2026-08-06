import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
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

  const front = element("div", { className: `v8-lastfm-live v8-lastfm-live--${variant} v8-surface v8-live-card-front` }, [
    artwork(presence),
    element("div", { className: "v8-lastfm-live__body" }, [
      element("div", { className: "v8-lastfm-live__meta" }, [brandIcon("lastfm", "history", "v8-live-brand-mark"), element("small", { text: presence.playing ? "Écoute en cours" : "Dernier morceau" })]),
      element("strong", { text: presence.title, attributes: { translate: "no" } }),
      element("p", { text: presence.artist, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-lastfm-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("lastfm", "history", "v8-live-brand-mark"), element("strong", { text: "Last.fm", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: presence.title, attributes: { translate: "no" } }),
      element("p", { text: presence.artist, attributes: { translate: "no" } }),
      presence.album ? element("p", { text: presence.album, attributes: { translate: "no" } }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: presence.playing ? "Ecoute en cours" : "Dernier morceau" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-lastfm-live v8-lastfm-live--${variant}`,
    attributes: { "aria-label": "Last.fm" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
