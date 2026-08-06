import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";
import { translateSource } from "../i18n/catalog.mjs";

function copyUuid(uuid) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(uuid).catch(() => {});
  }
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

function statRow(label, value, action) {
  return element("div", { className: "v8-minecraft-stat" }, [
    element("small", { text: label }),
    element("strong", { text: value, attributes: { translate: "no" } }),
    action || null
  ]);
}

export function minecraftLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const modelLabel = presence.model === "slim" ? translateSource("Slim (Alex)") : translateSource("Classic (Steve)");
  const uuidShort = `${presence.uuid.slice(0, 8)}...`;
  return element(options.tagName || "article", {
    className: `v8-minecraft-live v8-minecraft-live--${variant} v8-surface`,
    attributes: { "aria-label": "Profil Minecraft" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [
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
}
