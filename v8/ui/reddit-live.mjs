import { element, icon } from "./dom.mjs";

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-reddit-avatar__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-reddit-avatar__image is-fallback" }, [icon("message-circle")]);
  return element("span", { className: "v8-reddit-avatar" }, [inner]);
}

export function redditLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const meta = presence.latestPostTitle ? presence.latestPostSubreddit : `${presence.karma} karma`;
  return element(options.tagName || "article", {
    className: `v8-reddit-live v8-reddit-live--${variant} v8-surface`,
    attributes: { "aria-label": "Activite Reddit" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    avatar(presence),
    element("div", { className: "v8-reddit-live__body" }, [
      element("div", { className: "v8-reddit-live__meta" }, [icon("message-circle"), element("small", { text: meta })]),
      element("strong", { text: `u/${presence.username}`, attributes: { translate: "no" } }),
      element("p", { text: presence.latestPostTitle || "Aucune publication recente", attributes: { translate: "no" } })
    ])
  ]);
}
