import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { actionButton, element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { createWindowController } from "./window-system.mjs";

const SPACES = Object.freeze([
  { id: "personal", label: "Personnel", flow: "Essentiel", icon: "user-round", actionId: "v8.space.personal", description: "Vue equilibree pour le quotidien." },
  { id: "focus", label: "Focus", flow: "Deep Work", icon: "focus", actionId: "v8.space.focus", description: "Priorites, calme et densite utile." },
  { id: "studio", label: "Studio", flow: "Creation", icon: "sparkles", actionId: "v8.space.studio", description: "Idees, notes et ressources creatives." }
]);

function metric(value, label) {
  return element("div", { className: "v8-mission-metric" }, [
    element("strong", { text: String(value) }),
    element("span", { text: label })
  ]);
}

export function createMissionControl(host, options = {}) {
  let layer = null;
  const windowController = createWindowController({ onEscape: () => options.onClose?.() });

  function close(config = {}) {
    if (!layer) return false;
    layer = null;
    return windowController.close(config);
  }

  function open(context = {}) {
    if (layer) return false;
    const snapshot = options.snapshot?.() || {};
    const notes = snapshot.notes?.length || 0;
    const openTasks = snapshot.tasks?.filter?.((task) => !task.completed)?.length || 0;
    const files = snapshot.files?.length || 0;
    const events = snapshot.events?.length || 0;
    const activeSpace = context.space || "personal";
    const activeRoute = context.route || "home";

    const spaceGrid = element("div", { className: "v8-mission-spaces" });
    SPACES.forEach((space) => {
      const active = space.id === activeSpace;
      spaceGrid.append(element("button", {
        className: `v8-space-card${active ? " is-active" : ""}`,
        attributes: { type: "button", "aria-current": active ? "true" : null },
        dataset: { action: space.actionId }
      }, [
        element("span", { className: "v8-space-card__icon" }, [icon(space.icon)]),
        element("span", { className: "v8-space-card__copy" }, [
          element("small", { text: space.flow }),
          element("strong", { text: space.label }),
          element("span", { text: space.description })
        ]),
        active ? element("span", { className: "v8-space-card__active", text: "Actif" }) : icon("arrow-up-right")
      ]));
    });

    const appGrid = element("div", { className: "v8-mission-apps" });
    NAVIGATION_ITEMS.forEach((item) => {
      const active = item.id === activeRoute;
      appGrid.append(element("button", {
        className: `v8-window-card${active ? " is-active" : ""}`,
        attributes: { type: "button" },
        dataset: { action: item.actionId, route: item.id }
      }, [
        element("div", { className: "v8-window-card__chrome", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
        element("div", { className: "v8-window-card__preview" }, [
          element("span", { className: "v8-window-card__icon" }, [icon(item.icon)]),
          element("strong", { text: item.label }),
          element("small", { text: active ? "Fenetre active" : "Ouvrir l'application" })
        ])
      ]));
    });

    const dialog = element("section", {
      className: "v8-mission-dialog",
      attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-mission-title" }
    }, [
      element("header", { className: "v8-mission-header" }, [
        element("div", { className: "v8-mission-header__identity" }, [
          element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
          element("div", {}, [
            element("span", { className: "v8-eyebrow", text: "Navigation systeme" }),
            element("h2", { id: "v8-mission-title", text: "Mission Control" }),
            element("p", { text: `${context.flow || "Essentiel"} · ${openTasks} tache${openTasks > 1 ? "s" : ""} ouverte${openTasks > 1 ? "s" : ""}` })
          ])
        ]),
        element("div", { className: "v8-mission-header__actions" }, [
          actionButton({ actionId: "v8.command.open", variant: "secondary" }, [icon("search"), element("span", { text: "Rechercher" })]),
          actionButton({ actionId: "v8.mission.close", className: "v8-icon-button", ariaLabel: "Fermer Mission Control" }, [icon("x")])
        ])
      ]),
      element("div", { className: "v8-mission-body" }, [
        element("section", { className: "v8-mission-section" }, [
          element("header", { className: "v8-mission-section__heading" }, [element("h3", { text: "Spaces" }), element("span", { text: "Changer d'environnement" })]),
          spaceGrid
        ]),
        element("section", { className: "v8-mission-section" }, [
          element("header", { className: "v8-mission-section__heading" }, [element("h3", { text: "Applications" }), element("span", { text: "Toutes les fenetres ETHONE" })]),
          appGrid
        ]),
        element("aside", { className: "v8-mission-session" }, [
          element("div", { className: "v8-mission-session__brain" }, [icon("brain"), element("span", {}, [element("small", { text: "Brain Session" }), element("strong", { text: "Contexte synchronise" })]), element("b", { text: "LIVE" })]),
          element("div", { className: "v8-mission-metrics" }, [metric(notes, "Notes"), metric(openTasks, "A faire"), metric(events, "Evenements"), metric(files, "Fichiers")]),
          element("div", { className: "v8-mission-quick" }, [
            actionButton({ actionId: "v8.notes.new" }, [icon("file-plus-2"), element("span", { text: "Note" })]),
            actionButton({ actionId: "v8.tasks.new" }, [icon("list-plus"), element("span", { text: "Tache" })]),
            actionButton({ actionId: "v8.widgets.open" }, [icon("panels-top-left"), element("span", { text: "Widgets" })])
          ])
        ])
      ])
    ]);

    layer = element("div", {
      className: "v8-mission-layer",
      events: { click: (event) => event.target === layer && options.onClose?.() }
    }, [dialog]);
    host.append(layer);
    refreshIcons();
    return windowController.open(layer, { initialFocus: () => dialog.querySelector("button"), modal: true });
  }

  return Object.freeze({
    open,
    close,
    isOpen: () => windowController.isOpen(),
    destroy: () => { layer = null; windowController.destroy(); }
  });
}
