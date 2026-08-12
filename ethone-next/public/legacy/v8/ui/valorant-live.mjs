import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
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
  const statLine2 = presence.overview?.stats?.[1] ? `${presence.overview.stats[1].displayName} : ${presence.overview.stats[1].displayValue}` : "";
  const onClick = typeof options.onClick === "function" ? options.onClick : null;

  const front = element("div", { className: `v8-valorant-live v8-valorant-live--${variant} v8-surface v8-live-card-front` }, [
    emblem(presence),
    element("div", { className: "v8-valorant-live__body" }, [
      element("div", { className: "v8-valorant-live__meta" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("small", { text: "Valorant" })]),
      element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: statLine, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-valorant-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("riot", "swords", "v8-live-brand-mark"), element("strong", { text: "Valorant", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: statLine, attributes: { translate: "no" } }),
      statLine2 ? element("p", { text: statLine2, attributes: { translate: "no" } }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: presence.region ? `Région : ${presence.region}` : "Riot Games" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-valorant-live v8-valorant-live--${variant}`,
    attributes: { "aria-label": "Présence Valorant" },
    dataset: { liveWidget: "game", liveKind: "valorant" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  if (onClick) {
    card.addEventListener("click", (event) => {
      if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
      onClick(event);
    });
  } else {
    attachFlipBehavior(card);
  }

  return card;
}
