import { actionButton, element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { createWindowController } from "./window-system.mjs";

const PANEL_COPY = Object.freeze({
  widgets: { title: "Widgets", eyebrow: "Space actif", icon: "panels-top-left" },
  notifications: { title: "Notifications", eyebrow: "Centre de signal", icon: "bell" },
  profile: { title: "Profil", eyebrow: "Session locale", icon: "user-round" }
});

const SPACE_LABELS = Object.freeze({ personal: "Personnel", focus: "Focus", studio: "Studio" });

function spaceLabel(space) {
  return SPACE_LABELS[space] || "Personnel";
}

function panelMetric(iconName, value, label) {
  return element("div", { className: "v8-panel-metric" }, [icon(iconName), element("strong", { text: String(value) }), element("span", { text: label })]);
}

function notification(iconName, title, message, tone = "info") {
  return element("article", { className: `v8-panel-notice v8-panel-notice--${tone}` }, [
    element("span", { className: "v8-panel-notice__icon" }, [icon(iconName)]),
    element("div", {}, [element("strong", { text: title }), element("p", { text: message })]),
    element("span", { className: "v8-panel-notice__dot", attributes: { "aria-hidden": "true" } })
  ]);
}

export function createPanelManager(host, options = {}) {
  let mounted = null;
  let mountedId = null;
  const windowController = createWindowController({ onEscape: () => options.onClose?.() });

  function close(config = {}) {
    if (!mounted) return false;
    mounted = null;
    mountedId = null;
    return windowController.close(config);
  }

  function widgetsContent() {
    const snapshot = options.snapshot?.() || {};
    const state = options.getState?.() || {};
    const openTasks = snapshot.tasks?.filter?.((task) => !task.completed)?.length || 0;
    return element("div", { className: "v8-panel__content" }, [
      element("div", { className: "v8-panel-space-summary" }, [
        element("span", { className: "v8-panel__symbol" }, [icon("layers-3")]),
        element("div", {}, [element("small", { text: "Space" }), element("strong", { text: spaceLabel(state.space) }), element("span", { text: state.flow || "Essentiel" })])
      ]),
      element("div", { className: "v8-panel-metrics" }, [
        panelMetric("notebook-pen", snapshot.notes?.length || 0, "Notes"),
        panelMetric("circle-check-big", openTasks, "A faire"),
        panelMetric("folder", snapshot.files?.length || 0, "Fichiers")
      ]),
      element("section", { className: "v8-panel-section" }, [
        element("header", {}, [element("strong", { text: "Actions rapides" }), element("span", { text: "Contexte actuel" })]),
        element("div", { className: "v8-panel-quick-grid" }, [
          actionButton({ actionId: "v8.notes.new" }, [icon("file-plus-2"), element("span", { text: "Note" })]),
          actionButton({ actionId: "v8.tasks.new" }, [icon("list-plus"), element("span", { text: "Tache" })]),
          actionButton({ actionId: "v8.calendar.new" }, [icon("calendar-plus"), element("span", { text: "Evenement" })]),
          actionButton({ actionId: "v8.brain.open" }, [icon("brain"), element("span", { text: "Brain" })])
        ])
      ])
    ]);
  }

  function notificationsContent() {
    return element("div", { className: "v8-panel__content" }, [
      element("div", { className: "v8-panel-notices" }, [
        notification("cloud", "Cloud Sync", "Les donnees locales sont a jour.", "success"),
        notification("brain", "Brain est contextuel", "Les suggestions suivent maintenant la page et le Space actifs.", "brain"),
        notification("sparkles", "Experience 1.0", "Le nouveau Shell et Mission Control sont disponibles.", "info")
      ]),
      actionButton({ actionId: "v8.sync.refresh", variant: "secondary" }, [icon("refresh-cw"), element("span", { text: "Verifier la synchronisation" })])
    ]);
  }

  function profileContent() {
    const state = options.getState?.() || {};
    const user = options.user || {};
    const language = element("select", { className: "v8-input", attributes: { "aria-label": "Langue de l'interface" } }, [
      element("option", { text: "Francais", attributes: { value: "fr", translate: "no" } }),
      element("option", { text: "English", attributes: { value: "en", translate: "no" } }),
      element("option", { text: "Espanol", attributes: { value: "es", translate: "no" } }),
      element("option", { text: "Deutsch", attributes: { value: "de", translate: "no" } })
    ]);
    language.value = options.currentLocale?.() || "fr";
    language.addEventListener("change", () => options.onLocaleChange?.(language.value));
    return element("div", { className: "v8-panel__content" }, [
      element("div", { className: "v8-panel-profile-card" }, [
        element("span", { className: "v8-panel-profile-card__avatar", text: String(user.initial || "R") }),
        element("div", {}, [element("strong", { text: user.name || "Rub", attributes: { translate: "no" } }), element("span", { text: `${spaceLabel(state.space)} | ${state.flow || "Essentiel"}` })]),
        element("span", { className: "v8-badge v8-badge--accent", text: "En ligne" })
      ]),
      element("label", { className: "v8-panel__language" }, [element("span", { text: "Langue" }), language]),
      element("div", { className: "v8-panel__actions" }, [
        actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Reglages" })]),
        actionButton({ actionId: "v8.auth.signout", variant: "outline" }, [icon("log-out"), element("span", { text: "Se deconnecter" })])
      ])
    ]);
  }

  function open(id) {
    close({ restoreFocus: false });
    const copy = PANEL_COPY[id];
    if (!copy) return false;
    const content = id === "widgets" ? widgetsContent() : id === "notifications" ? notificationsContent() : profileContent();
    const panel = element("aside", {
      className: "v8-panel",
      attributes: { role: "dialog", "aria-modal": "false", "aria-label": copy.title }
    }, [
      element("header", { className: "v8-panel__header" }, [
        element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
        element("div", {}, [element("span", { className: "v8-eyebrow", text: copy.eyebrow }), element("strong", { text: copy.title })]),
        actionButton({ actionId: "v8.panel.close", className: "v8-icon-button", ariaLabel: "Fermer le panneau" }, [icon("x")])
      ]),
      content
    ]);
    host.append(panel);
    mounted = panel;
    mountedId = id;
    refreshIcons();
    return windowController.open(panel, { initialFocus: () => panel.querySelector("button, select"), modal: false });
  }

  return Object.freeze({ open, close, current: () => mountedId, destroy: () => windowController.destroy() });
}
