import { attachFlipBehavior, element, icon } from "./dom.mjs";
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

  const front = element("div", { className: `v8-tracker-live v8-tracker-live--${variant} v8-surface v8-live-card-front` }, [
    avatar(presence),
    element("div", { className: "v8-tracker-live__body" }, [
      element("div", { className: "v8-tracker-live__meta" }, [icon("chart-no-axes-combined"), element("small", { text: "Apex Legends" })]),
      element("strong", { text: presence.handle || "Profil Tracker", attributes: { translate: "no" } }),
      element("p", { text: `${presence.platform} - ${presence.identifier}`, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-tracker-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [icon("chart-no-axes-combined"), element("strong", { text: "Apex Legends", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: presence.handle || "Profil Tracker", attributes: { translate: "no" } }),
      element("p", { text: `Plateforme : ${presence.platform}` }),
      element("p", { text: `Identifiant : ${presence.identifier}`, attributes: { translate: "no" } })
    ]),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "Tracker.gg" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-tracker-live v8-tracker-live--${variant}`,
    attributes: { "aria-label": "Statistiques Apex Legends" },
    dataset: { liveWidget: "game", liveKind: "apex" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
