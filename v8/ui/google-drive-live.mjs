import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function formatModified(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `Modifié le ${DAY_MONTH.format(date)}`;
}

export function googleDriveLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const file = presence.latestFile;

  const front = element("div", { className: `v8-google-drive-live v8-google-drive-live--${variant} v8-surface v8-live-card-front` }, [
    element("span", { className: "v8-google-drive-icon" }, [icon("hard-drive"), livePulseDot()]),
    element("div", { className: "v8-google-drive-live__body" }, [
      element("div", { className: "v8-google-drive-live__meta" }, [brandIcon("google-drive", "file", "v8-live-brand-mark"), element("small", { text: "Dernier fichier modifié" })]),
      element("strong", { text: file.name, attributes: { translate: "no" } }),
      element("p", { text: formatModified(file.modifiedTime), attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-google-drive-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("google-drive", "file", "v8-live-brand-mark"), element("strong", { text: "Google Drive", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: file.name, attributes: { translate: "no" } }),
      element("p", { text: formatModified(file.modifiedTime) }),
      file.mimeType ? element("p", { text: file.mimeType, attributes: { translate: "no" } }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "Dernier fichier modifié" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-google-drive-live v8-google-drive-live--${variant}`,
    attributes: { "aria-label": "Dernier fichier Google Drive" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
