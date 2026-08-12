import { brandIcon, element, icon } from "./dom.mjs";
import { openLiveOverlay } from "./live-overlay.mjs";
import { refreshIcons } from "./icons.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function artwork(presence) {
  const inner = presence.artworkUrl
    ? element("span", { className: "v8-lastfm-artwork__image" }, [element("img", {
      attributes: { src: presence.artworkUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-lastfm-artwork__image is-fallback" }, [icon("history")]);
  return element("span", { className: "v8-lastfm-artwork" }, [inner, livePulseDot()]);
}

function openLastfmDetails(presence) {
  const bigArtwork = presence.artworkUrl
    ? element("img", {
        className: "v8-lastfm-overlay__artwork",
        attributes: { src: presence.artworkUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
      })
    : element("span", { className: "v8-lastfm-overlay__artwork is-fallback" }, [icon("history")]);

  const rows = [
    presence.artist ? element("p", { text: `Artiste : ${presence.artist}` }) : null,
    presence.album ? element("p", { text: `Album : ${presence.album}` }) : null,
    presence.playCount ? element("p", { text: `Écoutes : ${presence.playCount}` }) : null,
    presence.playedAt ? element("p", { text: `Joué le : ${new Date(presence.playedAt).toLocaleString("fr-FR")}` }) : null,
    presence.playing ? element("p", { text: "En écoute maintenant" }) : null
  ].filter(Boolean);

  const link = presence.profileUrl
    ? element("a", {
        className: "v8-button v8-button--secondary",
        attributes: { href: presence.profileUrl, target: "_blank", rel: "noopener noreferrer" },
        text: "Voir sur Last.fm"
      })
    : null;

  const content = element("div", { className: "v8-lastfm-overlay" }, [
    bigArtwork,
    element("strong", { text: presence.title, attributes: { translate: "no" } }),
    element("div", { className: "v8-lastfm-overlay__meta" }, rows),
    link
  ]);

  openLiveOverlay(content, { title: "Last.fm" });
  refreshIcons();
}

export function lastfmLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";

  const front = element("div", { className: `v8-lastfm-live v8-lastfm-live--${variant} v8-surface v8-live-card-front` }, [
    artwork(presence),
    element("div", { className: "v8-lastfm-live__body" }, [
      element("div", { className: "v8-lastfm-live__meta" }, [brandIcon("lastfm", "history", "v8-live-brand-mark"), element("small", { text: presence.playing ? "Écoute en cours" : "Dernier morceau" })]),
      element("strong", { text: presence.title, attributes: { translate: "no" } }),
      element("p", { text: presence.artist, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-lastfm-live v8-lastfm-live--${variant}`,
    attributes: { "aria-label": "Last.fm", role: "button", tabindex: "0" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [front]);

  card.addEventListener("click", () => openLastfmDetails(presence));
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openLastfmDetails(presence);
  });

  return card;
}
