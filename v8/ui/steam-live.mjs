import { brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode } from "./live-freshness.mjs";

const STATUS_LABELS = Object.freeze({ online: "En ligne", idle: "Absent", dnd: "Ne pas déranger", offline: "Hors ligne" });

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-steam-avatar__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-steam-avatar__image is-fallback" }, [icon("gamepad-2")]);
  const statusDot = element("span", { className: `v8-steam-status-dot is-${presence.status}`, attributes: { "aria-hidden": "true" } });
  return element("span", { className: "v8-steam-avatar" }, [inner, statusDot]);
}

export function steamLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const activity = presence.inGame ? `Joue a ${presence.gameName}` : STATUS_LABELS[presence.status] || "Hors ligne";
  return element(options.tagName || "article", {
    className: `v8-steam-live v8-steam-live--${variant} v8-surface`,
    attributes: { "aria-label": "Presence Steam" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [
    avatar(presence),
    element("div", { className: "v8-steam-live__body" }, [
      element("div", { className: "v8-steam-live__meta" }, [
        brandIcon("steam", "gamepad-2", "v8-live-brand-mark"),
        element("small", { text: presence.inGame ? "En jeu" : STATUS_LABELS[presence.status] || "Hors ligne" })
      ]),
      element("strong", { text: presence.displayName, attributes: { translate: "no" } }),
      element("p", { text: activity, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
