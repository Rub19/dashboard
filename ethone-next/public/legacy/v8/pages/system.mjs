import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { WORKSPACES } from "../data/workspaces.mjs";
import { AUTOMATION_ACTIONS, actionLabel } from "../core/automation-engine.mjs";
import { createSelect } from "../ui/select.mjs";

function pageHeading(eyebrow, title, description, actions = []) {
  return element("header", { className: "v8-page-heading" }, [
    element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: eyebrow }), element("h1", { text: title }), element("p", { text: description })]),
    actions.length ? element("div", { className: "v8-page-heading__actions" }, actions) : null
  ]);
}

export function mountSpaces(stage, options = {}) {
  const state = options.state || {};
  const cards = element("div", { className: "v8-spaces-grid" });
  WORKSPACES.forEach((space) => {
    const active = space.id === state.space;
    cards.append(element("button", {
      className: `v8-space-workspace${active ? " is-active" : ""}`,
      attributes: { type: "button", "aria-pressed": active ? "true" : "false" },
      dataset: { action: space.actionId }
    }, [
      element("div", { className: "v8-space-workspace__header" }, [element("span", {}, [icon(space.icon)]), active ? element("span", { className: "v8-badge v8-badge--accent", text: "Actif" }) : icon("arrow-up-right")]),
      element("div", { className: "v8-space-workspace__body" }, [element("small", { text: space.flow }), element("h2", { text: space.label }), element("p", { text: space.description })]),
      element("div", { className: "v8-space-workspace__dock" }, [icon("house"), icon("notebook-pen"), icon("circle-check-big"), icon("brain")])
    ]));
  });
  const page = element("section", { className: "v8-page v8-spaces-page", dataset: { page: "spaces" } }, [
    pageHeading("Environnements", "Spaces", "Changez de contexte sans perdre le fil de votre travail.", [actionButton({ actionId: "v8.mission.open", variant: "secondary" }, [icon("layout-dashboard"), element("span", { text: "Mission Control" })])]),
    cards
  ]);
  stage.replaceChildren(page);
  refreshIcons();
  return () => page.remove();
}

export function mountFlows(stage, options = {}) {
  const actions = options.actions;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  let state = options.state || {};
  const attachableActions = AUTOMATION_ACTIONS.filter((entry) => entry.group !== "space");
  const list = element("div", { className: "v8-flows-list" });

  function automationsForSpace(spaceId) {
    return (state.brainPreferences?.automations || []).filter((rule) => rule.trigger.type === "space" && rule.trigger.value === spaceId);
  }

  function automationChip(rule) {
    return element("div", { className: `v8-flow-automation${rule.enabled ? "" : " is-disabled"}`, dataset: { automationId: rule.id } }, [
      icon("workflow"),
      element("span", { text: `-> ${actionLabel(rule.actionId)}` }),
      element("button", {
        className: "v8-icon-button",
        attributes: { type: "button", "aria-label": rule.enabled ? "Désactiver l'automatisation" : "Activer l'automatisation" },
        dataset: { flowAutomationToggle: rule.id }
      }, [icon(rule.enabled ? "toggle-right" : "toggle-left")]),
      element("button", {
        className: "v8-icon-button",
        attributes: { type: "button", "aria-label": "Supprimer l'automatisation" },
        dataset: { flowAutomationDelete: rule.id }
      }, [icon("trash-2")])
    ]);
  }

  function attachRow(spaceId) {
    const select = createSelect({ className: "v8-input v8-flow-automation-select", attributes: { "aria-label": "Action à automatiser" } },
      attachableActions.map((entry) => element("option", { text: entry.label, attributes: { value: entry.id } })));
    const button = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [icon("workflow"), element("span", { text: "Automatiser" })]);
    button.addEventListener("click", () => {
      const result = actions.dispatch("v8.automation.create", { trigger: { type: "space", value: spaceId }, targetActionId: select.value });
      if (result?.ok) notify({ id: "flow-automation-created", title: "Flows", message: "Automatisation attachée à ce Flow.", type: "success", duration: 2200 });
    });
    return element("div", { className: "v8-flow-row__automations v8-flow-row__automations--empty" }, [
      element("span", { className: "v8-flow-row__automations-label", text: "Au démarrage de ce Flow :" }),
      select,
      button
    ]);
  }

  function renderList() {
    list.replaceChildren();
    WORKSPACES.forEach((space, index) => {
      const active = space.id === state.space;
      const rules = automationsForSpace(space.id);
      const automations = rules.length
        ? element("div", { className: "v8-flow-row__automations" }, rules.map(automationChip))
        : attachRow(space.id);
      list.append(element("article", { className: `v8-flow-row v8-surface${active ? " is-active" : ""}` }, [
        element("span", { className: "v8-flow-row__number", text: `0${index + 1}` }),
        element("div", { className: "v8-flow-row__copy" }, [element("small", { text: space.label }), element("h2", { text: space.flow }), element("p", { text: space.description })]),
        element("div", { className: "v8-flow-row__steps" }, space.steps.map((step, stepIndex) => element("span", {}, [element("b", { text: String(stepIndex + 1) }), step]))),
        actionButton({ actionId: space.actionId, variant: active ? "primary" : "secondary" }, [icon(active ? "check" : "play"), element("span", { text: active ? "En cours" : "Demarrer" })]),
        automations
      ]));
    });
    refreshIcons();
  }

  function handleClick(event) {
    const toggle = event.target.closest("[data-flow-automation-toggle]");
    if (toggle && page.contains(toggle)) {
      actions.dispatch("v8.automation.toggle", { id: toggle.dataset.flowAutomationToggle });
      return;
    }
    const remove = event.target.closest("[data-flow-automation-delete]");
    if (remove && page.contains(remove)) {
      actions.dispatch("v8.automation.remove", { id: remove.dataset.flowAutomationDelete });
      notify({ id: "flow-automation-removed", title: "Flows", message: "Automatisation retirée.", type: "info", duration: 2000 });
    }
  }

  const page = element("section", { className: "v8-page v8-flows-page", dataset: { page: "flows" } }, [
    pageHeading("Contextes de travail", "Flows", "Des sequences courtes qui adaptent le Space sans alourdir l'interface.", [actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("command"), element("span", { text: "Lancer une action" })])]),
    list
  ]);
  page.addEventListener("click", handleClick);
  stage.replaceChildren(page);
  renderList();
  refreshIcons();

  let previousAutomationsRef = state.brainPreferences?.automations;
  const releaseState = options.subscribeState?.((next) => {
    state = next;
    if (next.brainPreferences?.automations !== previousAutomationsRef) {
      previousAutomationsRef = next.brainPreferences?.automations;
      renderList();
    }
  }) || (() => {});

  return () => {
    releaseState();
    page.removeEventListener("click", handleClick);
    page.remove();
  };
}
