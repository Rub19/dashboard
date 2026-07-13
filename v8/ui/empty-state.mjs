import { element, icon } from "./dom.mjs";

const DEFAULT_ATTRIBUTES = Object.freeze({ role: "status", "aria-live": "polite" });

function visual(iconName) {
  return element("div", { className: "v8-empty-state__visual", attributes: { "aria-hidden": "true" } }, [
    element("span", { className: "v8-empty-state__frame v8-empty-state__frame--back" }),
    element("span", { className: "v8-empty-state__frame v8-empty-state__frame--front" }),
    element("span", { className: "v8-empty-state__node v8-empty-state__node--first" }),
    element("span", { className: "v8-empty-state__node v8-empty-state__node--second" }),
    element("span", { className: "v8-empty-state__glyph" }, [icon(iconName)])
  ]);
}

function brainSuggestion(brain) {
  if (!brain) return null;
  return element("aside", { className: "v8-empty-state__brain" }, [
    element("span", { className: "v8-empty-state__brain-icon", attributes: { "aria-hidden": "true" } }, [icon("brain")]),
    element("div", { className: "v8-empty-state__brain-copy" }, [
      element("strong", { text: brain.title || "Suggestion Brain" }),
      element("p", { text: brain.description || "Brain peut vous aider à préparer la prochaine étape." })
    ]),
    brain.action || null
  ]);
}

export function emptyState({
  tagName = "section",
  iconName = "sparkles",
  eyebrow = "Espace prêt",
  title = "Tout est prêt",
  description = "Commencez quand vous le souhaitez.",
  actions = [],
  brain = null,
  compact = false,
  inline = false,
  className = "",
  role = DEFAULT_ATTRIBUTES.role,
  ariaLabel = null
} = {}) {
  const classes = [
    "v8-empty-state",
    compact ? "v8-empty-state--compact" : "",
    inline ? "v8-empty-state--inline" : "",
    className
  ].filter(Boolean).join(" ");
  const availableActions = actions.filter(Boolean);

  return element(tagName, {
    className: classes,
    attributes: {
      role,
      "aria-live": "polite",
      "aria-label": ariaLabel || title
    }
  }, [
    visual(iconName),
    element("div", { className: "v8-empty-state__copy" }, [
      eyebrow ? element("span", { className: "v8-empty-state__eyebrow", text: eyebrow }) : null,
      element("h2", { text: title }),
      element("p", { text: description })
    ]),
    availableActions.length ? element("div", { className: "v8-empty-state__actions" }, availableActions) : null,
    brainSuggestion(brain)
  ]);
}
