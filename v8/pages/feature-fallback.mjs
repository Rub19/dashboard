import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";

const FEATURES = Object.freeze({
  widgets: { title: "Widgets", icon: "panels-top-left", description: "Un seul moteur de widgets remplacera les anciens panneaux. Les widgets cachés ne seront plus montés." },
  applications: { title: "Applications", icon: "blocks", description: "Les anciennes applications sont retirées du runtime. Les capacités utiles reviendront comme modules natifs ETHONE." }
});

export function mountFeatureFallback(stage, route) {
  const feature = FEATURES[route] || FEATURES.applications;
  const secondaryAction = route === "widgets"
      ? actionButton({ actionId: "v8.widgets.open", variant: "secondary" }, [icon("panel-right-open"), element("span", { text: "Aperçu du panneau" })])
      : actionButton({ actionId: "v8.command.open", variant: "secondary" }, [icon("command"), element("span", { text: "Command Center" })]);

  const page = element("section", { className: "v8-page v8-feature-page", dataset: { page: route } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Application essentielle" }),
        element("h1", { text: feature.title }),
        element("p", { text: "Une surface dédiée, sans chrome inutile." })
      ])
    ]),
    element("section", { className: "v8-migration-surface" }, [
      element("div", { className: "v8-migration-surface__signal", attributes: { "aria-hidden": "true" } }),
      element("div", { className: "v8-migration-surface__icon" }, [icon(feature.icon)]),
      element("span", { className: "v8-badge v8-badge--accent", text: "Coming Soon" }),
      element("h2", { text: `${feature.title} rejoint ETHONE.` }),
      element("p", { text: feature.description }),
      element("div", { className: "v8-migration-surface__actions" }, [secondaryAction]),
      element("div", { className: "v8-migration-surface__guarantee" }, [icon("shield-check"), element("span", { text: "Données conservées · aucun ancien runtime chargé" })])
    ])
  ]);
  stage.replaceChildren(page);
  refreshIcons();
  return () => page.remove();
}
