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
  const statLine2 = presence.overview?.stats?.[1] ? `${presence.overview.stats[1].displayName} : ${presence.overview.stats[1].displayValue}` : "";

  const front = element("div", { className: `v8-lol-live v8-lol-live--${variant} v8-surface v8-live-card-front` }, [
    avatar(presence),
    element("div", { className: "v8-lol-live__body" }, [
      element("div", { className: "v8-lol-live__meta" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("small", { text: "League of Legends" })]),
      element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: statLine, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-lol-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("strong", { text: "League of Legends", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: statLine, attributes: { translate: "no" } }),
      statLine2 ? element("p", { text: statLine2, attributes: { translate: "no" } }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: presence.region ? `Région : ${presence.region}` : "Riot Games" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-lol-live v8-lol-live--${variant}`,
    attributes: { "aria-label": "Présence League of Legends" },
    dataset: { liveWidget: "game", liveKind: "lol" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input")) return;
    card.classList.toggle("is-flipped");
  });

  return card;
}
