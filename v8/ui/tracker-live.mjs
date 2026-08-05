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
  
  const inner = element("div", { className: "v8-live-card-inner" }, [
    element("div", { className: "v8-live-card-front v8-surface" }, [
      avatar(presence),
      element("div", { className: "v8-tracker-live__body" }, [
        element("div", { className: "v8-tracker-live__meta" }, [icon("chart-no-axes-combined"), element("small", { text: "Apex Legends" })]),
        element("strong", { text: presence.handle || "Profil Tracker", attributes: { translate: "no" } }),
        element("p", { text: `${presence.platform} - ${presence.identifier}`, attributes: { translate: "no" } }),
        liveFreshnessNode(presence.updatedAt)
      ])
    ])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-tracker-live v8-tracker-live--${variant}`,
    attributes: { "aria-label": "Statistiques Apex Legends" },
    dataset: { liveWidget: "game", liveKind: "apex" }
  }, [inner]);

  card.addEventListener("click", () => {
    window.location.hash = "#matches?game=apex";
  });

  return card;
}
