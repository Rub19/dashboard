import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function emblem(presence) {
  const inner = presence.emblemUrl
    ? element("span", { className: "v8-valorant-emblem__image" }, [element("img", {
      attributes: { src: presence.emblemUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-valorant-emblem__image is-fallback" }, [icon("swords")]);
  return element("span", { className: "v8-valorant-emblem" }, [inner, livePulseDot()]);
}

function matchDot(match) {
  const state = match.won === true ? "win" : match.won === false ? "loss" : "draw";
  return element("span", {
    className: `v8-valorant-match-dot is-${state}`,
    attributes: { title: `${match.characterName || "?"} - ${match.kills}/${match.deaths}/${match.assists} - ${match.map}` }
  });
}

export function valorantLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const deltaLabel = presence.lastGameDelta > 0 ? `+${presence.lastGameDelta} RR` : presence.lastGameDelta < 0 ? `${presence.lastGameDelta} RR` : "";
  const rankLine = [presence.tierName || "Non classe", `${presence.rankInTier} RR`, deltaLabel].filter(Boolean).join(" - ");
  return element(options.tagName || "article", {
    className: `v8-valorant-live v8-valorant-live--${variant} v8-surface`,
    attributes: { "aria-label": "Rang Valorant" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    emblem(presence),
    element("div", { className: "v8-valorant-live__body" }, [
      element("div", { className: "v8-valorant-live__meta" }, [icon("swords"), element("small", { text: "Valorant" })]),
      element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: rankLine, attributes: { translate: "no" } }),
      presence.matches.length ? element("div", { className: "v8-valorant-live__matches", attributes: { "aria-label": "Dernieres parties" } }, presence.matches.map(matchDot)) : null,
      liveFreshnessNode(presence.updatedAt)
    ].filter(Boolean))
  ]);
}
