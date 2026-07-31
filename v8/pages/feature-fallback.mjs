import { actionButton, element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";

const FEATURES = Object.freeze({
  widgets: { title: "Widgets", icon: "panels-top-left", description: "Un seul moteur de widgets remplacera les anciens panneaux. Les widgets caches ne seront plus montes." },
  applications: { title: "Applications", icon: "blocks", description: "Les anciennes applications sont retirees du runtime. Les capacités utiles reviendront comme modules natifs ETHONE." }
});

export function mountFeatureFallback(stage, route, options = {}) {
  const feature = FEATURES[route] || FEATURES.applications;
  const unavailable = options.kind === "error";
  const secondaryAction = unavailable && typeof options.onRetry === "function"
    ? element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" }, events: { click: options.onRetry } }, [icon("refresh-cw"), element("span", { text: "Réessayer" })])
    : route === "widgets"
      ? actionButton({ actionId: "v8.widgets.open", variant: "secondary" }, [icon("panel-right-open"), element("span", { text: "Apercu du panneau" })])
      : actionButton({ actionId: "v8.command.open", variant: "secondary" }, [icon("command"), element("span", { text: "Command Center" })]);

  const page = element("section", { className: "v8-page v8-feature-page", dataset: { page: route } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Application essentielle" }),
        element("h1", { text: feature.title }),
        element("p", { text: "Une surface dédiée, sans chrome inutile." })
      ])
    ]),
    statusState(unavailable ? "error" : "coming-soon", {
      iconName: unavailable ? "triangle-alert" : feature.icon,
      title: unavailable ? `${feature.title} n'a pas pu etre charge` : `${feature.title} rejoint ETHONE`,
      description: unavailable ? "Le module est momentanement indisponible. Vos données restent intactes." : feature.description,
      actions: [secondaryAction],
      className: "v8-empty-state--wide"
    })
  ]);
  stage.replaceChildren(page);
  refreshIcons();
  return () => page.remove();
}
