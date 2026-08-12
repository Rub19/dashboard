import { element, icon } from "./dom.mjs";
import { openLiveOverlay } from "./live-overlay.mjs";
import { refreshIcons } from "./icons.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";
import { translateSource } from "../i18n/catalog.mjs";

function copyUuid(uuid) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(uuid).catch(() => {});
  }
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("fr-FR");
}

function skinHead(presence) {
  if (!presence.skinUrl) return element("span", { className: "v8-minecraft-avatar is-fallback" }, [icon("box"), livePulseDot()]);
  const head = element("span", { className: "v8-minecraft-avatar__head", attributes: { "aria-hidden": "true" } });
  head.style.backgroundImage = `url("${presence.skinUrl}")`;
  const cape = presence.capeUrl
    ? element("span", { className: "v8-minecraft-avatar__cape" }, [
        element("img", { attributes: { src: presence.capeUrl, alt: "Cape", loading: "lazy", decoding: "async" } })
      ])
    : null;
  return element("span", { className: "v8-minecraft-avatar" }, [head, cape, livePulseDot()]);
}

function fullSkinPreview(presence) {
  if (!presence.skinUrl) return element("span", { className: "v8-minecraft-skin is-fallback" }, [icon("box")]);
  const img = element("img", {
    className: "v8-minecraft-skin",
    attributes: { src: presence.skinUrl, alt: "Skin Minecraft", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
  });
  if (presence.capeUrl) {
    return element("div", { className: "v8-minecraft-skin-wrap" }, [
      img,
      element("img", {
        className: "v8-minecraft-cape",
        attributes: { src: presence.capeUrl, alt: "Cape", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
      })
    ]);
  }
  return img;
}

function statRow(label, value, action) {
  return element("div", { className: "v8-minecraft-stat" }, [
    element("small", { text: label }),
    element("strong", { text: value, attributes: { translate: "no" } }),
    action || null
  ]);
}

function openMinecraftDetails(presence) {
  const modelLabel = presence.model === "slim" ? translateSource("Slim (Alex)") : translateSource("Classic (Steve)");
  const history = Array.isArray(presence.nameHistory) && presence.nameHistory.length > 0
    ? element("ul", { className: "v8-minecraft-history" }, presence.nameHistory.map((entry) =>
        element("li", {}, [
          element("strong", { text: entry.name, attributes: { translate: "no" } }),
          entry.changedAt ? element("small", { text: formatDate(entry.changedAt) }) : null
        ].filter(Boolean))
      ))
    : null;

  const content = element("div", { className: "v8-minecraft-overlay" }, [
    fullSkinPreview(presence),
    element("strong", { text: presence.username, attributes: { translate: "no" } }),
    element("div", { className: "v8-minecraft-overlay__stats" }, [
      statRow("UUID", presence.uuid, element("button", {
        className: "v8-minecraft-copy",
        attributes: { type: "button", title: translateSource("Copier l'UUID"), "aria-label": translateSource("Copier l'UUID") },
        events: { click: (e) => { e.stopPropagation(); copyUuid(presence.uuid); } }
      }, [icon("copy")])),
      statRow("Modèle", modelLabel)
    ]),
    history ? element("div", { className: "v8-minecraft-overlay__history" }, [element("small", { text: "Anciens pseudos" }), history]) : null,
    element("a", {
      className: "v8-button v8-button--secondary",
      attributes: { href: `https://namemc.com/profile/${encodeURIComponent(presence.uuid)}`, target: "_blank", rel: "noopener noreferrer" },
      text: "Voir sur NameMC"
    })
  ]);

  openLiveOverlay(content, { title: "Minecraft" });
  refreshIcons();
}

export function minecraftLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const modelLabel = presence.model === "slim" ? translateSource("Slim (Alex)") : translateSource("Classic (Steve)");
  const uuidShort = `${presence.uuid.slice(0, 8)}...`;
  const front = element("div", { className: `v8-minecraft-live v8-minecraft-live--${variant} v8-surface v8-live-card-front` }, [
    skinHead(presence),
    element("div", { className: "v8-minecraft-live__body" }, [
      element("div", { className: "v8-minecraft-live__meta" }, [icon("box"), element("small", { text: "Minecraft" })]),
      element("strong", { text: presence.username, attributes: { translate: "no" } }),
      element("div", { className: "v8-minecraft-live__stats" }, [
        statRow("UUID", uuidShort, element("button", {
          className: "v8-minecraft-copy",
          attributes: { type: "button", title: translateSource("Copier l'UUID"), "aria-label": translateSource("Copier l'UUID") },
          events: { click: (e) => { e.stopPropagation(); copyUuid(presence.uuid); } }
        }, [icon("copy")])),
        statRow("Modèle", modelLabel)
      ]),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-minecraft-live v8-minecraft-live--${variant}`,
    attributes: { "aria-label": "Profil Minecraft", role: "button", tabindex: "0" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [front]);

  card.addEventListener("click", (event) => {
    if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
    openMinecraftDetails(presence);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openMinecraftDetails(presence);
  });

  return card;
}
