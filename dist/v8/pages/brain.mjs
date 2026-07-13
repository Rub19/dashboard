import { actionButton, element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";

const SPACE_LABELS = Object.freeze({ personal: "Personnel", focus: "Focus", studio: "Studio" });
const ROUTE_LABELS = Object.freeze({
  home: "Accueil",
  notes: "Notes",
  tasks: "Taches",
  calendar: "Calendrier",
  files: "Fichiers",
  activity: "Activity Hub",
  connections: "Connections",
  spaces: "Spaces",
  flows: "Flows",
  brain: "Brain",
  settings: "Reglages"
});

function insight(iconName, title, description, actionId, actionLabel) {
  return element("article", { className: "v8-brain-insight v8-surface" }, [
    element("span", { className: "v8-brain-insight__icon" }, [icon(iconName)]),
    element("div", { className: "v8-brain-insight__copy" }, [element("strong", { text: title }), element("p", { text: description })]),
    actionButton({ actionId, className: "v8-icon-button", ariaLabel: actionLabel }, [icon("arrow-up-right")])
  ]);
}

export function mountBrain(stage, options = {}) {
  const state = options.state || {};
  const snapshot = options.repository?.snapshot?.() || {};
  const openTasks = snapshot.tasks?.filter?.((task) => !task.done) || [];
  const recentNote = snapshot.notes?.[0] || null;
  const nextEvent = snapshot.events?.[0] || null;
  const latestActivity = snapshot.activities?.[0] || null;
  const connectedSources = snapshot.connections?.filter?.((connection) => connection.status === "connected") || [];

  const page = element("section", { className: "v8-page v8-brain-page", dataset: { page: "brain" } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Intelligence contextuelle" }),
        element("h1", { text: "Brain" }),
        element("p", { text: "Une lecture calme de votre contexte, avec des actions utiles au bon moment." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        element("span", { className: "v8-brain-live" }, [element("i", { attributes: { "aria-hidden": "true" } }), element("span", { text: "Contexte actif" })]),
        actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("sparkles"), element("span", { text: "Demander une action" })])
      ])
    ]),
    element("section", { className: "v8-brain-context v8-surface" }, [
      element("div", { className: "v8-brain-context__identity" }, [
        element("span", { className: "v8-brain-orbit" }, [icon("brain")]),
        element("div", {}, [element("small", { text: "Session courante" }), element("h2", { text: `${state.flow || "Essentiel"} dans ${SPACE_LABELS[state.space] || "Personnel"}` }), element("p", { text: "Brain suit la page, le Space et les dernieres actions sans interrompre votre travail." })])
      ]),
      element("div", { className: "v8-brain-context__signals" }, [
        element("span", {}, [icon("map-pin"), element("small", { text: "Page" }), element("strong", { text: ROUTE_LABELS[state.route] || "Brain" })]),
        element("span", {}, [icon("circle-check-big"), element("small", { text: "Ouvertes" }), element("strong", { text: String(openTasks.length) })]),
        element("span", {}, [icon("notebook-pen"), element("small", { text: "Notes" }), element("strong", { text: String(snapshot.notes?.length || 0) })]),
        element("span", {}, [icon("plug"), element("small", { text: "Connectees" }), element("strong", { text: String(connectedSources.length) })])
      ])
    ]),
    element("section", { className: "v8-brain-grid" }, [
      element("div", { className: "v8-brain-recommendations" }, [
        element("header", { className: "v8-section-heading" }, [element("div", {}, [element("span", { className: "v8-eyebrow", text: "Maintenant" }), element("h2", { text: "Recommandations" })])]),
        latestActivity ? insight(latestActivity.icon || "activity", latestActivity.title, latestActivity.description || "Un nouveau signal est disponible dans Activity Hub.", "v8.activity.open", "Ouvrir Activity Hub") : null,
        insight("circle-check-big", openTasks[0]?.title || "Clarifier la prochaine priorite", openTasks.length ? "La premiere tache ouverte est prete a etre reprise." : "Votre liste est calme. Ajoutez uniquement ce qui compte.", openTasks.length ? "v8.tasks.open" : "v8.tasks.new", "Ouvrir les taches"),
        insight("notebook-pen", recentNote?.title || "Capturer le contexte", recentNote ? "Cette note recente peut servir de point de reprise." : "Une note courte suffit pour garder le fil.", recentNote ? "v8.notes.open" : "v8.notes.new", "Ouvrir les notes"),
        insight("calendar-days", nextEvent?.title || "Proteger un bloc de concentration", nextEvent ? "Un evenement est deja visible dans votre planning." : "Le Space Focus est disponible pour une session sans distraction.", nextEvent ? "v8.calendar.open" : "v8.space.focus", "Ouvrir le calendrier")
      ]),
      element("aside", { className: "v8-brain-side v8-surface" }, [
        element("span", { className: "v8-eyebrow", text: "Raccourcis adaptes" }),
        element("h2", { text: "Flow en cours" }),
        element("p", { text: "Les actions proposees changent avec votre environnement." }),
        element("div", { className: "v8-brain-actions" }, [
          actionButton({ actionId: "v8.notes.new" }, [icon("file-plus-2"), element("span", { text: "Nouvelle note" })]),
          actionButton({ actionId: "v8.tasks.new" }, [icon("list-plus"), element("span", { text: "Nouvelle tache" })]),
          actionButton({ actionId: "v8.mission.open" }, [icon("layout-dashboard"), element("span", { text: "Mission Control" })]),
          actionButton({ actionId: "v8.sync.refresh" }, [icon("cloud-cog"), element("span", { text: "Verifier la sync" })])
        ])
      ])
    ])
  ]);
  stage.replaceChildren(page);
  refreshIcons();
  return () => page.remove();
}
