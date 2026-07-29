import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function formatModified(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `Modifie le ${DAY_MONTH.format(date)}`;
}

export function googleDriveLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const file = presence.latestFile;
  return element(options.tagName || "article", {
    className: `v8-google-drive-live v8-google-drive-live--${variant} v8-surface`,
    attributes: { "aria-label": "Dernier fichier Google Drive" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    element("span", { className: "v8-google-drive-icon" }, [icon("hard-drive"), livePulseDot()]),
    element("div", { className: "v8-google-drive-live__body" }, [
      element("div", { className: "v8-google-drive-live__meta" }, [icon("file"), element("small", { text: "Dernier fichier modifie" })]),
      element("strong", { text: file.name, attributes: { translate: "no" } }),
      element("p", { text: formatModified(file.modifiedTime), attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
