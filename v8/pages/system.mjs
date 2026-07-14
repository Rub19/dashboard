import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { WORKSPACES } from "../data/workspaces.mjs";

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
  const state = options.state || {};
  const list = element("div", { className: "v8-flows-list" });
  WORKSPACES.forEach((space, index) => {
    const active = space.id === state.space;
    list.append(element("article", { className: `v8-flow-row v8-surface${active ? " is-active" : ""}` }, [
      element("span", { className: "v8-flow-row__number", text: `0${index + 1}` }),
      element("div", { className: "v8-flow-row__copy" }, [element("small", { text: space.label }), element("h2", { text: space.flow }), element("p", { text: space.description })]),
      element("div", { className: "v8-flow-row__steps" }, space.steps.map((step, stepIndex) => element("span", {}, [element("b", { text: String(stepIndex + 1) }), step]))),
      actionButton({ actionId: space.actionId, variant: active ? "primary" : "secondary" }, [icon(active ? "check" : "play"), element("span", { text: active ? "En cours" : "Demarrer" })])
    ]));
  });
  const page = element("section", { className: "v8-page v8-flows-page", dataset: { page: "flows" } }, [
    pageHeading("Contextes de travail", "Flows", "Des sequences courtes qui adaptent le Space sans alourdir l'interface.", [actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("command"), element("span", { text: "Lancer une action" })])]),
    list
  ]);
  stage.replaceChildren(page);
  refreshIcons();
  return () => page.remove();
}
