import { element, icon } from "./dom.mjs";
import { emptyState } from "./empty-state.mjs";
import { translateSource } from "../i18n/catalog.mjs";

export function buildErrorState({ title = translateSource("Un problème est survenu"), reason = translateSource("ETHONE n'a pas pu charger ce contenu."), actionText = "", action = null, tagName = "section" } = {}) {
  const actions = [];
  if (actionText && typeof action === "function") {
    actions.push(element("button", {
      className: "v8-button v8-button--secondary",
      attributes: { type: "button" },
      events: { click: action }
    }, [icon("refresh-cw"), element("span", { text: actionText })]));
  }
  return emptyState({
    tagName,
    iconName: "triangle-alert",
    eyebrow: translateSource("Erreur"),
    title,
    description: reason,
    actions,
    compact: false,
    inline: false,
    kind: "error",
    role: "alert",
    ariaLive: "assertive"
  });
}
