import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function avatar(presence) {
  const fallback = icon("swords");
  if (!presence.avatarUrl) return element("span", { className: "v8-lol-icon" }, [fallback, livePulseDot()]);
  const img = element("img", {
    attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" },
    events: { error: (event) => event.currentTarget.replaceWith(fallback) }
  });
  return element("span", { className: "v8-lol-icon" }, [element("span", { className: "v8-lol-icon__image" }, [img]), livePulseDot()]);
}

export function lolLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const statLine = presence.overview?.stats?.[0] ? `${presence.overview.stats[0].displayName} : ${presence.overview.stats[0].displayValue}` : "Aucun match récent";
  
  const inner = element("div", { className: "v8-live-card-inner" }, [
    element("div", { className: "v8-live-card-front v8-surface" }, [
      avatar(presence),
      element("div", { className: "v8-lol-live__body" }, [
        element("div", { className: "v8-lol-live__meta" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("small", { text: "League of Legends" })]),
        element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
        element("p", { text: statLine, attributes: { translate: "no" } }),
        liveFreshnessNode(presence.updatedAt)
      ])
    ])
  ]);
  
  const card = element(options.tagName || "article", {
    className: `v8-lol-live v8-lol-live--${variant}`,
    attributes: { "aria-label": "Présence League of Legends" },
    dataset: { liveWidget: "game", liveKind: "lol" }
  }, [inner]);

  card.addEventListener("click", () => {
    window.location.hash = "#matches?game=lol";
  });

  return card;
}
