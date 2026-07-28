import { element, icon } from "./dom.mjs";

const TIER_LABELS = Object.freeze({
  IRON: "Fer", BRONZE: "Bronze", SILVER: "Argent", GOLD: "Or", PLATINUM: "Platine",
  EMERALD: "Emeraude", DIAMOND: "Diamant", MASTER: "Maitre", GRANDMASTER: "Grand Maitre", CHALLENGER: "Challenger"
});

function matchDot(match) {
  const state = match.win === true ? "win" : match.win === false ? "loss" : "draw";
  return element("span", {
    className: `v8-lol-match-dot is-${state}`,
    attributes: { title: `${match.champion || "?"} - ${match.kills}/${match.deaths}/${match.assists} - ${match.mode}` }
  });
}

export function lolLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const rankLine = presence.ranked
    ? [`${TIER_LABELS[presence.tier] || presence.tier} ${presence.rank}`.trim(), `${presence.leaguePoints} LP`, `${presence.wins}V / ${presence.losses}D`].filter(Boolean).join(" - ")
    : "Non classe";
  return element(options.tagName || "article", {
    className: `v8-lol-live v8-lol-live--${variant} v8-surface`,
    attributes: { "aria-label": "Rang League of Legends" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    element("span", { className: "v8-lol-icon" }, [icon("swords")]),
    element("div", { className: "v8-lol-live__body" }, [
      element("div", { className: "v8-lol-live__meta" }, [icon("swords"), element("small", { text: "League of Legends" })]),
      element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: rankLine, attributes: { translate: "no" } }),
      presence.matches.length ? element("div", { className: "v8-lol-live__matches", attributes: { "aria-label": "Dernieres parties" } }, presence.matches.map(matchDot)) : null
    ].filter(Boolean))
  ]);
}
