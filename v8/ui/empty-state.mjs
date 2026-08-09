import { element, icon } from "./dom.mjs";

const DEFAULT_ATTRIBUTES={role:"status","aria-live":"polite"};
const PRODUCT_SKELETONS={activity:"live:3 stream:5 rail:2",connections:"metrics:4 catalog:4 inspector:1",brain:"brain-hero:1 tabs:6 brain-conversation:1 rail:2",settings:"settings-nav:6 settings-rows:5"};

export const STATE_PRESETS = Object.freeze({
  empty: Object.freeze({ iconName: "inbox", eyebrow: "Espace disponible", title: "Rien ici pour le moment", description: "Commencez par l'action principale pour alimenter cet espace." }),
  "no-results": Object.freeze({ iconName: "search-x", eyebrow: "Recherche terminée", title: "Aucun résultat", description: "Modifiez les termes ou effacez les filtres pour élargir la recherche." }),
  loading: Object.freeze({ iconName: "loader-circle", eyebrow: "Chargement", title: "Préparation de votre espace", description: "ETHONE récupère uniquement les données nécessaires." }),
  error: Object.freeze({ iconName: "triangle-alert", eyebrow: "Un problème est survenu", title: "Impossible d'afficher ce contenu", description: "Vos données restent intactes. Réessayez ou revenez à l'espace précédent." }),
  offline: Object.freeze({ iconName: "wifi-off", eyebrow: "Mode hors ligne", title: "Connexion indisponible", description: "Les changements sont conservés en attente et seront synchronisés au retour du réseau." }),
  denied: Object.freeze({ iconName: "shield-x", eyebrow: "Accès protégé", title: "Accès non autorisé", description: "Ce contenu nécessite une permission ou un autre compte." }),
  expired: Object.freeze({ iconName: "key-round", eyebrow: "Session expirée", title: "Reconnectez-vous pour continuer", description: "La session a été fermée afin de protéger vos données." }),
  integration: Object.freeze({ iconName: "unplug", eyebrow: "Intégration", title: "Service non configuré", description: "Connectez un service pour activer ses données et ses actions." }),
  "coming-soon": Object.freeze({ iconName: "construction", eyebrow: "Bientôt disponible", title: "Cette surface est en préparation", description: "La fonctionnalité reste désactivée proprement pendant sa reconstruction." }),
  syncing: Object.freeze({ iconName: "refresh-cw", eyebrow: "Synchronisation", title: "Enregistrement en cours", description: "Vous pouvez continuer à travailler pendant la synchronisation avec Supabase." })
});

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
  headingTag = "h2",
  className = "",
  kind = "empty",
  role = DEFAULT_ATTRIBUTES.role,
  ariaLive = DEFAULT_ATTRIBUTES["aria-live"],
  ariaLabel = null,
  busy = false
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
      "aria-live": ariaLive,
      "aria-label": ariaLabel || title,
      "aria-busy": busy ? "true" : null
    },
    dataset: { stateKind: kind }
  }, [
    visual(iconName),
    element("div", { className: "v8-empty-state__copy" }, [
      eyebrow ? element("span", { className: "v8-empty-state__eyebrow", text: eyebrow }) : null,
      element(headingTag, { text: title }),
      element("p", { text: description })
    ]),
    availableActions.length ? element("div", { className: "v8-empty-state__actions" }, availableActions) : null,
    brainSuggestion(brain)
  ]);
}

export function buildEmptyState({ icon = "inbox", title = "Rien ici pour le moment", message = "Commencez par l'action principale pour alimenter cet espace.", actionText = "", action = null, tagName = "section" } = {}) {
  const actions = [];
  if (actionText && typeof action === "function") {
    actions.push(element("button", {
      className: "v8-button v8-button--primary",
      attributes: { type: "button" },
      events: { click: action }
    }, [icon("arrow-up-right"), element("span", { text: actionText })]));
  }
  return emptyState({
    tagName,
    iconName: icon,
    eyebrow: "",
    title,
    description: message,
    actions,
    compact: false,
    inline: false,
    kind: "empty"
  });
}

export function statusState(kind = "empty", options = {}) {
  const normalizedKind = STATE_PRESETS[kind] ? kind : "empty";
  const preset = STATE_PRESETS[normalizedKind];
  const urgent = ["error", "denied", "expired"].includes(normalizedKind);
  const busy = ["loading", "syncing"].includes(normalizedKind);
  return emptyState({
    ...preset,
    ...options,
    kind: normalizedKind,
    role: options.role || (urgent ? "alert" : "status"),
    ariaLive: options.ariaLive || (urgent ? "assertive" : "polite"),
    busy: options.busy ?? busy
  });
}

function skeleton(className = "") {
  return element("span", { className: `v8-skeleton ${className}`.trim(), attributes: { "aria-hidden": "true" } });
}

function skeletonHeading() {
  return element("div", { className: "v8-state-skeleton__heading" }, [
    skeleton("is-eyebrow"),
    skeleton("is-title"),
    skeleton("is-copy")
  ]);
}

function skeletonGroup(className, count, itemClass) {
  return element("div", { className }, Array.from({ length: count }, () => skeleton(itemClass)));
}

function productSkeleton(layout) {
  const spec = PRODUCT_SKELETONS[layout];
  return spec ? [skeletonHeading(), ...spec.split(" ").map((entry) => { const [name, size] = entry.split(":"); return skeletonGroup(`v8-state-skeleton__${name}`, Number(size), `is-${name}`); })] : null;
}

export function skeletonState({ layout = "page", count = 3, label = "Chargement du contenu", className = "", page = null } = {}) {
  const safeCount = Math.max(1, Math.min(6, Number(count) || 1));
  const productBlocks = productSkeleton(layout);
  const safeLayout = productBlocks || ["page", "form", "list"].includes(layout) ? layout : "page";
  const blocks = [];
  if (productBlocks) {
    blocks.push(...productBlocks);
  } else if (safeLayout === "page") {
    blocks.push(
      skeletonHeading(),
      element("div", { className: "v8-state-skeleton__grid" }, Array.from({ length: safeCount }, () => skeleton("is-card")))
    );
  } else if (safeLayout === "form") {
    blocks.push(element("div", { className: "v8-state-skeleton__form" }, Array.from({ length: safeCount }, () => element("div", {}, [skeleton("is-label"), skeleton("is-control")]))) );
  } else {
    blocks.push(element("div", { className: "v8-state-skeleton__list" }, Array.from({ length: safeCount }, () => skeleton("is-row"))));
  }
  return element("section", {
    className: `v8-state-skeleton v8-state-skeleton--${safeLayout} ${className}`.trim(),
    attributes: { role: "status", "aria-live": "polite", "aria-label": label, "aria-busy": "true" },
    dataset: { page }
  }, [element("span", { className: "v8-visually-hidden", text: label }), ...blocks]);
}
