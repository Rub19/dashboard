import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";

const ACCENTS = Object.freeze(["mint", "sky", "amber", "violet", "rose"]);
const SYNC_LABELS = Object.freeze({ online: "En ligne", offline: "Hors ligne", syncing: "Synchronisation" });
const DENSITY_LABELS = Object.freeze({ comfortable: "Confortable", compact: "Compacte" });

function choice(actionId, iconName, label, active) {
  return actionButton({ actionId, className: `v8-setting-choice${active ? " is-active" : ""}` }, [icon(iconName), element("span", { text: label }), active ? icon("check") : null]);
}

function settingRow(iconName, title, description, control) {
  return element("div", { className: "v8-setting-row" }, [
    element("span", { className: "v8-setting-row__icon" }, [icon(iconName)]),
    element("div", { className: "v8-setting-row__copy" }, [element("strong", { text: title }), element("p", { text: description })]),
    element("div", { className: "v8-setting-row__control" }, [control])
  ]);
}

export function mountSettings(stage, options = {}) {
  const state = options.state || {};
  const accentControls = element("div", { className: "v8-accent-picker", attributes: { role: "group", "aria-label": "Couleur d'accent" } });
  ACCENTS.forEach((accent) => accentControls.append(element("button", {
    className: `v8-accent-swatch v8-accent-swatch--${accent}${state.accent === accent ? " is-active" : ""}`,
    attributes: { type: "button", "aria-label": `Accent ${accent}`, "aria-pressed": state.accent === accent ? "true" : "false" },
    dataset: { action: `v8.accent.${accent}` }
  }, [state.accent === accent ? icon("check") : null])));

  const page = element("section", { className: "v8-page v8-settings-page", dataset: { page: "settings" } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Systeme" }),
        element("h1", { text: "Reglages" }),
        element("p", { text: "Une seule source de verite pour l'apparence et le comportement d'ETHONE." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [actionButton({ actionId: "v8.profile.open", variant: "secondary" }, [icon("user-round"), element("span", { text: "Profil" })])])
    ]),
    element("div", { className: "v8-settings-layout" }, [
      element("aside", { className: "v8-settings-nav", attributes: { "aria-label": "Sections des reglages" } }, [
        element("button", { className: "is-active", text: "Apparence", attributes: { type: "button", "aria-current": "true", "aria-controls": "v8-settings-appearance" }, dataset: { settingsSection: "v8-settings-appearance" } }),
        element("button", { text: "Workspace", attributes: { type: "button", "aria-controls": "v8-settings-workspace" }, dataset: { settingsSection: "v8-settings-workspace" } }),
        element("button", { text: "Systeme", attributes: { type: "button", "aria-controls": "v8-settings-system" }, dataset: { settingsSection: "v8-settings-system" } })
      ]),
      element("div", { className: "v8-settings-content" }, [
        element("section", { id: "v8-settings-appearance", className: "v8-settings-section v8-surface" }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Design System" }), element("h2", { text: "Apparence" }), element("p", { text: "Des reglages sobres, coherents et persistants." })]),
          settingRow("sun-moon", "Theme", "Adapter les surfaces et le contraste.", element("div", { className: "v8-segmented" }, [choice("v8.theme.night", "moon-star", "Nuit", state.theme === "night"), choice("v8.theme.graphite", "sun", "Graphite", state.theme === "graphite")])),
          settingRow("palette", "Accent", "Identifier le Space et les actions importantes.", accentControls),
          settingRow("rows-3", "Densite", "Ajuster la quantite d'information visible.", element("div", { className: "v8-segmented" }, [choice("v8.density.toggle", "align-justify", state.density === "comfortable" ? "Confortable" : "Compacte", true)])),
          settingRow("languages", "Langue", "Changer rapidement la langue de l'interface.", actionButton({ actionId: "v8.locale.cycle", variant: "secondary" }, [icon("languages"), element("span", { text: "Langue suivante" })]))
        ]),
        element("section", { id: "v8-settings-workspace", className: "v8-settings-section v8-surface" }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Environnements" }), element("h2", { text: "Spaces" }), element("p", { text: "Chaque Space applique son Flow et son ambiance." })]),
          element("div", { className: "v8-settings-spaces" }, [
            choice("v8.space.personal", "user-round", "Personnel", state.space === "personal"),
            choice("v8.space.focus", "focus", "Focus", state.space === "focus"),
            choice("v8.space.studio", "sparkles", "Studio", state.space === "studio")
          ])
        ]),
        element("section", { id: "v8-settings-system", className: "v8-settings-section v8-surface" }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Etat" }), element("h2", { text: "Systeme local" })]),
          element("div", { className: "v8-system-checks" }, [
            element("span", {}, [icon("shield-check"), element("strong", { text: "Donnees" }), element("b", { text: "Protegees" })]),
            element("span", {}, [icon("cloud"), element("strong", { text: "Synchronisation" }), element("b", { text: SYNC_LABELS[state.syncStatus] || "En ligne" })]),
            element("span", {}, [icon("gauge"), element("strong", { text: "Interface" }), element("b", { text: DENSITY_LABELS[state.density] || "Confortable" })])
          ])
        ])
      ])
    ])
  ]);
  stage.replaceChildren(page);
  const navButtons = [...page.querySelectorAll(".v8-settings-nav button")];
  const controller = new AbortController();
  function handleSectionNavigation(event) {
    const button = event.target.closest("[data-settings-section]");
    if (!button || !page.contains(button)) return;
    navButtons.forEach((entry) => entry.classList.toggle("is-active", entry === button));
    navButtons.forEach((entry) => entry.setAttribute("aria-current", entry === button ? "true" : "false"));
    page.querySelector(`#${button.dataset.settingsSection}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  page.querySelector(".v8-settings-nav")?.addEventListener("click", handleSectionNavigation, { signal: controller.signal });
  refreshIcons();
  return () => {
    controller.abort();
    page.remove();
  };
}
