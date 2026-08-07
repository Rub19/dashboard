import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";
import { translateSource } from "../i18n/catalog.mjs";

function ddragonAvatarUrl(presence) {
  const version = presence.ddragonVersion || "16.15.1";
  const id = presence.profileIconId || 1;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${id}.png`;
}

function communityDragonAvatarUrl(presence) {
  const id = presence.profileIconId || 1;
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${id}.jpg`;
}

function avatar(presence) {
  const fallback = icon("swords");
  const ddragon = ddragonAvatarUrl(presence);
  const community = communityDragonAvatarUrl(presence);
  const urls = Array.from(new Set([presence.avatarUrl, ddragon, community].filter(Boolean)));
  let index = 0;
  const img = element("img", {
    attributes: { src: urls[index] || ddragon, alt: "", loading: "lazy", decoding: "async" },
    events: {
      error: (event) => {
        const target = event.currentTarget;
        index += 1;
        if (index < urls.length) {
          target.setAttribute("src", urls[index]);
        } else {
          target.replaceWith(fallback);
        }
      }
    }
  });
  return element("span", { className: "v8-lol-icon" }, [element("span", { className: "v8-lol-icon__image" }, [img]), livePulseDot()]);
}

export function lolLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  function statText(stat) {
    if (!stat) return "";
    const name = translateSource(stat.displayName || "");
    const value = stat.displayValue === "Unranked" ? translateSource("Unranked") : stat.displayValue;
    return `${name} : ${value}`;
  }
  const statLine = presence.overview?.stats?.[0] ? statText(presence.overview.stats[0]) : "Aucun match récent";
  const statLine2 = presence.overview?.stats?.[1] ? statText(presence.overview.stats[1]) : "";
  const onClick = typeof options.onClick === "function" ? options.onClick : null;

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
