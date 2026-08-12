import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-reddit-avatar__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-reddit-avatar__image is-fallback" }, [icon("message-circle")]);
  return element("span", { className: "v8-reddit-avatar" }, [inner, livePulseDot()]);
}

export function redditLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const meta = presence.latestPostTitle ? presence.latestPostSubreddit : `${presence.karma} karma`;

  const front = element("div", { className: `v8-reddit-live v8-reddit-live--${variant} v8-surface v8-live-card-front` }, [
    avatar(presence),
    element("div", { className: "v8-reddit-live__body" }, [
      element("div", { className: "v8-reddit-live__meta" }, [brandIcon("reddit", "message-circle", "v8-live-brand-mark"), element("small", { text: meta })]),
      element("strong", { text: `u/${presence.username}`, attributes: { translate: "no" } }),
      element("p", { text: presence.latestPostTitle || "Aucune publication récente", attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-reddit-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("reddit", "message-circle", "v8-live-brand-mark"), element("strong", { text: "Reddit", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: `u/${presence.username}`, attributes: { translate: "no" } }),
      element("p", { text: `${presence.karma} karma` }),
      presence.latestPostTitle ? element("p", { text: presence.latestPostTitle, attributes: { translate: "no" } }) : null,
      presence.latestPostSubreddit ? element("p", { text: presence.latestPostSubreddit, attributes: { translate: "no" } }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "Reddit" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-reddit-live v8-reddit-live--${variant}`,
    attributes: { "aria-label": "Activité Reddit" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
