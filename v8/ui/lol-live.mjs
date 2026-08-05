import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-lol-icon__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : icon("swords");
  return element("span", { className: "v8-lol-icon" }, [inner, livePulseDot()]);
}

export function lolLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const stat = presence.overview?.stats?.[0];
  const statLine = stat ? `${stat.displayName} : ${stat.displayValue}` : "Statistiques League of Legends";
  
  const inner = element("div", { className: "v8-live-card-inner" }, [
    element("div", { className: "v8-live-card-front" }, [
      avatar(presence),
      element("div", { className: "v8-lol-live__body" }, [
        element("div", { className: "v8-lol-live__meta" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("small", { text: "League of Legends" })]),
        element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
        element("p", { text: statLine, attributes: { translate: "no" } }),
        liveFreshnessNode(presence.updatedAt)
      ])
    ]),
    element("div", { className: "v8-live-card-back" }, [
      element("div", { className: "v8-lol-live__body" }, [
        element("strong", { text: "Statistiques avancées" }),
        element("p", { text: presence.overview?.stats?.[1] ? `${presence.overview.stats[1].displayName}: ${presence.overview.stats[1].displayValue}` : "En jeu", attributes: { translate: "no" } })
      ])
    ])
  ]);
  
  const card = element(options.tagName || "article", {
    className: `v8-lol-live v8-lol-live--${variant} v8-surface`,
    attributes: { "aria-label": "Statistiques League of Legends" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [inner]);

  card.addEventListener("click", () => {
    card.classList.toggle("is-flipped");
  });

  return card;
}
