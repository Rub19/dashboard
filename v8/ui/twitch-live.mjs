import { element, icon } from "./dom.mjs";
import { liveFreshnessNode } from "./live-freshness.mjs";

function avatar(presence) {
  const inner = presence.profileImageUrl
    ? element("span", { className: "v8-twitch-avatar__image" }, [element("img", {
      attributes: { src: presence.profileImageUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-twitch-avatar__image is-fallback" }, [icon("twitch")]);
  return element("span", { className: "v8-twitch-avatar" }, [inner, presence.live ? element("span", { className: "v8-twitch-live-dot", attributes: { "aria-hidden": "true" } }) : null].filter(Boolean));
}

export function twitchLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const activity = presence.live ? `En live - ${presence.gameName || "Twitch"}` : "Hors ligne";

  const front = element("div", { className: `v8-twitch-live v8-twitch-live--${variant} v8-surface v8-live-card-front` }, [
    avatar(presence),
    element("div", { className: "v8-twitch-live__body" }, [
      element("div", { className: "v8-twitch-live__meta" }, [icon("twitch"), element("small", { text: activity })]),
      element("strong", { text: presence.displayName, attributes: { translate: "no" } }),
      element("p", { text: presence.live ? presence.title : "Aucun stream en cours", attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-twitch-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [icon("twitch"), element("strong", { text: "Twitch", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: presence.displayName, attributes: { translate: "no" } }),
      element("p", { text: presence.live ? "En live" : "Hors ligne" }),
      presence.live && presence.gameName ? element("p", { text: presence.gameName, attributes: { translate: "no" } }) : null,
      presence.live && presence.title ? element("p", { text: presence.title, attributes: { translate: "no" } }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: presence.live ? `Live - ${presence.gameName || "Twitch"}` : "Twitch", attributes: { translate: "no" } })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-twitch-live v8-twitch-live--${variant}${presence.live ? " is-live" : ""}`,
    attributes: { "aria-label": "Chaine Twitch" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input")) return;
    card.classList.toggle("is-flipped");
  });

  return card;
}
