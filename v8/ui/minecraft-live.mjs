import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function skinHead(presence) {
  if (!presence.skinUrl) return element("span", { className: "v8-minecraft-avatar is-fallback" }, [icon("box"), livePulseDot()]);
  const head = element("span", { className: "v8-minecraft-avatar__head", attributes: { "aria-hidden": "true" } });
  head.style.backgroundImage = `url("${presence.skinUrl}")`;
  return element("span", { className: "v8-minecraft-avatar" }, [head, livePulseDot()]);
}

export function minecraftLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  return element(options.tagName || "article", {
    className: `v8-minecraft-live v8-minecraft-live--${variant} v8-surface`,
    attributes: { "aria-label": "Profil Minecraft" },
    dataset: { liveWidget: "media", liveKind: "profile" }
  }, [
    skinHead(presence),
    element("div", { className: "v8-minecraft-live__body" }, [
      element("div", { className: "v8-minecraft-live__meta" }, [icon("box"), element("small", { text: "Minecraft" })]),
      element("strong", { text: presence.username, attributes: { translate: "no" } }),
      element("p", { text: `UUID ${presence.uuid.slice(0, 8)}...`, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
