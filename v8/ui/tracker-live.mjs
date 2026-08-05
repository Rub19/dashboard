import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function avatar(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-tracker-avatar__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-tracker-avatar__image is-fallback" }, [icon("chart-no-axes-combined")]);
  return element("span", { className: "v8-tracker-avatar" }, [inner, livePulseDot()]);
}

function statsGrid(overview) {
  if (!overview || !Array.isArray(overview.stats) || overview.stats.length === 0) {
    return element("p", { className: "v8-live-empty-stats", text: "Aucun match récent" });
  }
  return element("div", { className: "v8-live-stats-grid" }, 
    overview.stats.map((stat) => element("div", { className: "v8-live-stat-item" }, [
      element("span", { className: "v8-live-stat-label", text: stat.displayName }),
      element("span", { className: "v8-live-stat-value", text: stat.displayValue, attributes: { translate: "no" } })
    ]))
  );
}

export function trackerLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const statLine = presence.overview?.stats?.[0] ? `${presence.overview.stats[0].displayName} : ${presence.overview.stats[0].displayValue}` : "Aucun match récent";
  
  const inner = element("div", { className: "v8-live-card-inner" }, [
    element("div", { className: "v8-live-card-front v8-surface" }, [
      avatar(presence),
      element("div", { className: "v8-tracker-live__body" }, [
        element("div", { className: "v8-tracker-live__meta" }, [icon("chart-no-axes-combined"), element("small", { text: "Apex Legends" })]),
        element("strong", { text: presence.handle, attributes: { translate: "no" } }),
        element("p", { text: statLine, attributes: { translate: "no" } }),
        liveFreshnessNode(presence.updatedAt)
      ])
    ]),
    element("div", { className: "v8-live-card-back v8-surface" }, [
      element("div", { className: "v8-tracker-live__body" }, [
        element("strong", { text: presence.overview?.name || "Statistiques" }),
        statsGrid(presence.overview)
      ])
    ])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-tracker-live v8-tracker-live--${variant}`,
    attributes: { "aria-label": "Statistiques Tracker.gg" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [inner]);

  card.addEventListener("click", () => {
    card.classList.toggle("is-flipped");
  });

  return card;
}
