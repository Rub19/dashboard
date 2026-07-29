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
  return element(options.tagName || "article", {
    className: `v8-twitch-live v8-twitch-live--${variant} v8-surface${presence.live ? " is-live" : ""}`,
    attributes: { "aria-label": "Chaine Twitch" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [
    avatar(presence),
    element("div", { className: "v8-twitch-live__body" }, [
      element("div", { className: "v8-twitch-live__meta" }, [icon("twitch"), element("small", { text: activity })]),
      element("strong", { text: presence.displayName, attributes: { translate: "no" } }),
      element("p", { text: presence.live ? presence.title : "Aucun stream en cours", attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
