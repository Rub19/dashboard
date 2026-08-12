import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { WORKSPACES, workspaceById } from "../data/workspaces.mjs";
import { actionButton, element, icon } from "./dom.mjs";
import { statusState } from "./empty-state.mjs";
import { refreshIcons } from "./icons.mjs";
import { createWindowController } from "./window-system.mjs";

export function missionTargetIndex(key, index, count) {
  if (!count) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const delta = key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  if (!delta) return null;
  const start = index < 0 ? (delta > 0 ? -1 : 0) : index;
  return ((start + delta) % count + count) % count;
}

function heading(title, count) {
  return element("header", { className: "v8-mission-section__heading" }, [element("h3", { text: title }), element("span", { text: String(count) })]);
}

function missionButton(kind, item, children, active = false, className = "") {
  const liveKind = kind === "widget" ? "widget" : kind === "brain" ? "brain" : null;
  return element("button", {
    className: `v8-mission-item ${className}${active ? " is-active" : ""}`,
    attributes: { type: "button", "aria-current": active ? (kind === "window" ? "page" : "true") : null, "aria-label": item.ariaLabel || item.label },
    dataset: { action: item.actionId, missionItem: item.id, missionKind: kind, liveWidget: liveKind, liveKind }
  }, children);
}

function section(className, title, count, content) {
  return element("section", { className: `v8-mission-section ${className}` }, [heading(title, count), content]);
}

export function createMissionControl(host, options = {}) {
  let layer = null;
  const shell = host?.closest?.(".v8-shell") || null;
  const windowController = createWindowController({ onEscape: () => options.onClose?.() });

  function close(config = {}) {
    if (!layer) return false;
    layer = null;
    return windowController.close(config);
  }

  function open(context = {}) {
    if (layer) return false;
    const snapshot = options.snapshot?.() || {};
    const activity = options.activity?.() || snapshot.activities || [];
    const brainActivity = activity.filter((item) => item?.category === "brain" || item?.source === "brain").slice(0, 4);
    const activeWorkspace = workspaceById(context.space);
    const activeRoute = context.route || "home";
    const values = {
      notes: snapshot.notes?.length || 0,
      tasks: snapshot.tasks?.filter?.((task) => !task.done)?.length || 0,
      events: snapshot.events?.length || 0,
      files: snapshot.files?.length || 0,
      brain: brainActivity.length
    };

    const spaces = element("div", { className: "v8-mission-spaces" }, WORKSPACES.map((workspace) => missionButton("space", workspace, [
      element("span", { className: "v8-space-card__icon" }, [icon(workspace.icon)]),
      element("span", { className: "v8-space-card__copy" }, [element("small", { text: workspace.flow, attributes: { translate: "no" } }), element("strong", { text: workspace.label }), element("span", { text: workspace.description })]),
      workspace.id === activeWorkspace.id ? element("span", { className: "v8-space-card__active", text: "Actif" }) : icon("arrow-up-right")
    ], workspace.id === activeWorkspace.id, "v8-space-card")));

    const flows = element("div", { className: "v8-mission-flows" }, WORKSPACES.map((workspace) => missionButton("flow", { ...workspace, id: `flow-${workspace.id}`, ariaLabel: `Ouvrir ${workspace.flow}` }, [
      element("span", { className: "v8-flow-card__icon" }, [icon("workflow")]),
      element("span", { className: "v8-flow-card__copy" }, [element("small", { text: workspace.label }), element("strong", { text: workspace.flow, attributes: { translate: "no" } })]),
      element("span", { className: "v8-flow-card__steps" }, workspace.steps.map((step) => element("i", { text: step })))
    ], workspace.id === activeWorkspace.id, "v8-flow-card")));

    const windows = element("div", { className: "v8-mission-apps" }, NAVIGATION_ITEMS.map((item) => missionButton("window", item, [
      element("div", { className: "v8-window-card__chrome", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
      element("div", { className: "v8-window-card__preview" }, [element("span", { className: "v8-window-card__icon" }, [icon(item.icon)]), element("strong", { text: item.label }), element("small", { text: item.id === activeRoute ? "Fenêtre active" : "Disponible" })])
    ], item.id === activeRoute, "v8-window-card")));

    const dashboards = element("div", { className: "v8-mission-dashboards" }, WORKSPACES.map((workspace) => missionButton("dashboard", { ...workspace, id: `dashboard-${workspace.id}`, actionId: `v8.dashboard.${workspace.id}`, ariaLabel: `Dashboard ${workspace.label}` }, [
      icon("layout-dashboard"), element("span", {}, [element("strong", { text: workspace.label }), element("small", { text: workspace.flow, attributes: { translate: "no" } })]), workspace.id === activeWorkspace.id ? icon("check") : icon("chevron-right")
    ], workspace.id === activeWorkspace.id, "v8-dashboard-card")));

    const widgets = element("div", { className: "v8-mission-widgets" }, activeWorkspace.widgets.map((widget) => missionButton("widget", widget, [
      icon(widget.icon), element("span", {}, [element("strong", { text: widget.label }), element("small", { text: String(values[widget.countKey] || 0), dataset: { liveNumber: values[widget.countKey] || 0 } })])
    ], false, "v8-widget-card")));

    const brainItems = brainActivity.length ? brainActivity.map((entry) => missionButton("brain", { id: `brain-${entry.id}`, label: entry.title, actionId: "v8.brain.open" }, [
      icon(entry.icon || "brain"), element("span", {}, [element("strong", { text: entry.title }), element("small", { text: entry.description || "Contexte Brain" })]), icon("arrow-up-right")
    ], false, "v8-brain-activity")) : [statusState("empty", {
      iconName: "brain",
      eyebrow: "Activité Brain",
      title: "Aucune activité récente",
      description: "Brain attend votre prochaine demande.",
      actions: [actionButton({ actionId: "v8.brain.open", variant: "secondary" }, [icon("brain"), element("span", { text: "Ouvrir Brain" })])],
      compact: true,
      className: "v8-mission-empty"
    })];

    const dialog = element("section", { className: "v8-mission-dialog", attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-mission-title", "aria-keyshortcuts": "F2 Control+Shift+M Meta+Shift+M" } }, [
      element("header", { className: "v8-mission-header" }, [
        element("div", { className: "v8-mission-header__identity" }, [
          element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
          element("div", {}, [element("span", { className: "v8-eyebrow", text: "Navigation système" }), element("h2", { id: "v8-mission-title", text: "Mission Control" }), element("p", { text: `${activeWorkspace.flow} / ${NAVIGATION_ITEMS.length} fenetres / ${activeWorkspace.widgets.length} widgets`, attributes: { translate: "no" } })])
        ]),
        element("div", { className: "v8-mission-header__actions" }, [element("kbd", { text: "F2", attributes: { translate: "no" } }), actionButton({ actionId: "v8.command.open", variant: "secondary" }, [icon("search"), element("span", { text: "Rechercher" })]), actionButton({ actionId: "v8.mission.close", className: "v8-icon-button", ariaLabel: "Fermer Mission Control" }, [icon("x")])])
      ]),
      element("div", { className: "v8-mission-body" }, [
        element("main", { className: "v8-mission-workspace" }, [section("v8-mission-section--spaces", "Spaces", WORKSPACES.length, spaces), section("v8-mission-section--flows", "Flows", WORKSPACES.length, flows), section("v8-mission-section--windows", "Fenêtres", NAVIGATION_ITEMS.length, windows)]),
        element("aside", { className: "v8-mission-rail" }, [section("v8-mission-section--dashboards", "Dashboards", WORKSPACES.length, dashboards), section("v8-mission-section--widgets", "Widgets ouverts", activeWorkspace.widgets.length, widgets), section("v8-mission-section--brain", "Activités Brain", brainActivity.length, element("div", { className: "v8-mission-brain" }, brainItems))])
      ])
    ]);

    dialog.addEventListener("keydown", (event) => {
      const focused = event.target.closest?.("[data-mission-item]");
      if ((event.key === "Enter" || event.key === " ") && focused) {
        event.preventDefault();
        focused.click();
        return;
      }
      const items = [...dialog.querySelectorAll("[data-mission-item]")];
      const target = missionTargetIndex(event.key, items.indexOf(document.activeElement), items.length);
      if (target == null) return;
      event.preventDefault();
      items[target]?.focus({ preventScroll: true });
    });
    layer = element("div", { className: "v8-mission-layer" }, [dialog]);
    host.append(layer);
    refreshIcons();
    const opened = windowController.open(layer, { initialFocus: () => dialog.querySelector(`[data-mission-kind="window"][aria-current="page"]`) || dialog.querySelector("[data-mission-item]"), modal: true, onAfterClose: () => shell?.classList.remove("is-mission-control-open") });
    if (opened) shell?.classList.add("is-mission-control-open");
    return opened;
  }

  return Object.freeze({ open, close, isOpen: () => windowController.isOpen(), destroy: () => { layer = null; shell?.classList.remove("is-mission-control-open"); windowController.destroy(); } });
}
