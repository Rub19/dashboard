import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode } from "./live-freshness.mjs";

const STATUS_LABELS = Object.freeze({ online: "En ligne", idle: "Absent", dnd: "Ne pas deranger", offline: "Hors ligne" });

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-discord-avatar__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-discord-avatar__image is-fallback" }, [icon("messages-square")]);
  const statusDot = element("span", { className: `v8-discord-status-dot is-${presence.status}`, attributes: { "aria-hidden": "true" } });
  return element("span", { className: "v8-discord-avatar" }, [inner, statusDot]);
}

export function discordLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const activity = presence.spotify?.available
    ? `Ecoute ${presence.spotify.artist} - ${presence.spotify.title}`
    : presence.activityName
      ? (presence.activityDetail ? `${presence.activityName} - ${presence.activityDetail}` : presence.activityName)
      : STATUS_LABELS[presence.status] || "Hors ligne";
  return element(options.tagName || "article", {
    className: `v8-discord-live v8-discord-live--${variant} v8-surface`,
    attributes: { "aria-label": "Presence Discord" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [
    avatar(presence),
    element("div", { className: "v8-discord-live__body" }, [
      element("div", { className: "v8-discord-live__meta" }, [
        brandIcon("discord", "messages-square", "v8-live-brand-mark"),
        element("small", { text: STATUS_LABELS[presence.status] || "Hors ligne" })
      ]),
      element("strong", { text: presence.displayName, attributes: { translate: "no" } }),
      element("p", { text: activity, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
