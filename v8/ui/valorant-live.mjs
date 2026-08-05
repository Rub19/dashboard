import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function emblem(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-valorant-emblem__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-valorant-emblem__image is-fallback" }, [icon("swords")]);
  return element("span", { className: "v8-valorant-emblem" }, [inner, livePulseDot()]);
}

export function valorantLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const statLine = presence.overview?.stats?.[0] ? `${presence.overview.stats[0].displayName} : ${presence.overview.stats[0].displayValue}` : "Aucun match récent";
  
  const inner = element("div", { className: "v8-live-card-inner" }, [
    element("div", { className: "v8-live-card-front v8-surface" }, [
      emblem(presence),
      element("div", { className: "v8-valorant-live__body" }, [
        element("div", { className: "v8-valorant-live__meta" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("small", { text: "Valorant" })]),
        element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
        element("p", { text: statLine, attributes: { translate: "no" } }),
        liveFreshnessNode(presence.updatedAt)
      ])
    ])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-valorant-live v8-valorant-live--${variant}`,
    attributes: { "aria-label": "Présence Valorant" },
    dataset: { liveWidget: "game", liveKind: "valorant" }
  }, [inner]);

  card.addEventListener("click", () => {
    window.location.hash = "#matches?game=valorant";
  });

  return card;
}
