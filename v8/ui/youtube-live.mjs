import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

export function youtubeLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const thumbnail = presence.thumbnailUrl
    ? element("span", { className: "v8-youtube-avatar__image" }, [element("img", {
      attributes: { src: presence.thumbnailUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-youtube-avatar__image is-fallback" }, [icon("youtube")]);
  const meta = presence.latestVideoTitle ? "Dernière video" : "Chaine YouTube";

  const front = element("div", { className: `v8-youtube-live v8-youtube-live--${variant} v8-surface v8-live-card-front` }, [
    element("span", { className: "v8-youtube-avatar" }, [thumbnail, livePulseDot()]),
    element("div", { className: "v8-youtube-live__body" }, [
      element("div", { className: "v8-youtube-live__meta" }, [icon("youtube"), element("small", { text: meta })]),
      element("strong", { text: presence.channelTitle, attributes: { translate: "no" } }),
      element("p", { text: presence.latestVideoTitle || `${presence.subscriberCount} abonnes`, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-youtube-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [icon("youtube"), element("strong", { text: "YouTube", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: presence.channelTitle, attributes: { translate: "no" } }),
      presence.latestVideoTitle ? element("p", { text: presence.latestVideoTitle, attributes: { translate: "no" } }) : null,
      presence.subscriberCount ? element("p", { text: `${presence.subscriberCount} abonnés` }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "YouTube" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-youtube-live v8-youtube-live--${variant}`,
    attributes: { "aria-label": "Activité YouTube" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input")) return;
    card.classList.toggle("is-flipped");
  });

  return card;
}
