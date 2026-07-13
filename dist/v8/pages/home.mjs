import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { localeTag } from "../i18n/catalog.mjs";

function formattedDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(localeTag(), {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

function summaryMetric(iconName, value, label) {
  return element("div", { className: "v8-summary-metric" }, [
    icon(iconName),
    element("strong", { text: value }),
    element("span", { text: label })
  ]);
}

function timelineEntry(iconName, title, meta) {
  return element("li", { className: "v8-day-entry" }, [
    element("span", { className: "v8-day-entry__icon" }, [icon(iconName)]),
    element("div", {}, [element("strong", { text: title, attributes: { translate: "no" } }), element("span", { text: meta })])
  ]);
}

export function mountHome(stage, model, options = {}) {
  const continuation = model.nextTasks[0]
    ? { type: "Tâche prioritaire", title: model.nextTasks[0].title, action: "v8.tasks.open", button: "Continuer", icon: "circle-check-big" }
    : model.recentNotes[0]
      ? { type: "Dernière note", title: model.recentNotes[0].title, action: "v8.notes.open", button: "Reprendre", icon: "notebook-pen" }
      : { type: "Nouvel espace", title: "Votre journée peut commencer ici.", action: "v8.command.open", button: "Ouvrir le Command Center", icon: "sparkles", userContent: false };
  if (model.nextTasks[0] || model.recentNotes[0]) continuation.userContent = true;

  const heading = element("header", { className: "v8-page-heading v8-home-heading" }, [
    element("div", { className: "v8-page-heading__copy" }, [
      element("span", { className: "v8-eyebrow", text: formattedDate(model.generatedAt), attributes: { translate: "no" } }),
      element("h1", { text: `${model.context.greeting}, ${model.user.name}.` }),
      element("p", { text: model.context.tone })
    ]),
    element("div", { className: "v8-page-heading__actions" }, [
      actionButton({ actionId: "v8.notes.new", variant: "secondary" }, [icon("file-plus-2"), element("span", { text: "Nouvelle note" })]),
      actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("command"), element("span", { text: "Command Center" })])
    ])
  ]);

  const continuity = element("section", { className: "v8-continuity v8-surface" }, [
    element("div", { className: "v8-continuity__signal", attributes: { "aria-hidden": "true" } }),
    element("span", { className: "v8-continuity__monogram", text: "08", attributes: { "aria-hidden": "true" } }),
    element("div", { className: "v8-continuity__top" }, [
      element("span", { className: "v8-eyebrow", text: "Continuité" }),
      element("span", { className: "v8-badge v8-badge--accent" }, [icon("activity"), "Prêt"])
    ]),
    element("div", { className: "v8-continuity__body" }, [
      element("span", { className: "v8-continuity__icon" }, [icon(continuation.icon)]),
      element("span", { className: "v8-continuity__type", text: continuation.type }),
      element("h2", { text: continuation.title, attributes: continuation.userContent ? { translate: "no" } : {} }),
      element("p", { text: "ETHONE garde le contexte à portée de main, sans charger le reste du système." }),
      actionButton({ actionId: continuation.action, variant: "primary" }, [element("span", { text: continuation.button }), icon("arrow-up-right")])
    ]),
    element("div", { className: "v8-continuity__metrics" }, [
      summaryMetric("circle-check-big", model.summary.openTasks, "à faire"),
      summaryMetric("calendar-days", model.summary.todayEvents, "aujourd'hui"),
      summaryMetric("notebook-pen", model.summary.notes, "notes")
    ])
  ]);

  const dayList = element("ul", { className: "v8-daystream__list" });
  model.todayEvents.forEach((event) => dayList.append(timelineEntry("calendar-days", event.title, "Événement aujourd'hui")));
  model.nextTasks.slice(0, 3).forEach((task) => dayList.append(timelineEntry("circle", task.title, task.due || "À planifier")));
  if (!dayList.children.length) {
    dayList.append(emptyState({
      tagName: "li",
      role: "listitem",
      iconName: "coffee",
      eyebrow: "Temps disponible",
      title: "Aucun impératif",
      description: "Votre journée est libre pour avancer à votre rythme.",
      actions: [actionButton({ actionId: "v8.tasks.new", variant: "secondary" }, [icon("plus"), element("span", { text: "Ajouter une tâche" })])],
      compact: true
    }));
  }

  const daystream = element("aside", { className: "v8-daystream" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "Maintenant" }), element("h2", { text: "Fil de la journée" })]),
      actionButton({ actionId: "v8.calendar.open", className: "v8-icon-button", ariaLabel: "Ouvrir le calendrier" }, [icon("arrow-up-right")])
    ]),
    dayList
  ]);

  const recent = element("section", { className: "v8-home-section" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "Mémoire locale" }), element("h2", { text: "Travail récent" })]),
      actionButton({ actionId: "v8.notes.open", className: "v8-toolbar-button", ariaLabel: "Voir toutes les notes" }, [icon("arrow-right")])
    ])
  ]);
  const recentList = element("div", { className: "v8-recent-list" });
  if (model.recentNotes.length) {
    model.recentNotes.forEach((note) => {
      recentList.append(actionButton({ actionId: "v8.notes.open", className: "v8-recent-row" }, [
        element("span", { className: "v8-recent-row__icon" }, [icon("file-text")]),
        element("span", { className: "v8-recent-row__copy" }, [element("strong", { text: note.title, attributes: { translate: "no" } }), element("small", { text: note.updatedAt ? "Modifiée récemment" : "Note locale" })]),
        icon("chevron-right")
      ]));
    });
  } else {
    recentList.append(emptyState({
      iconName: "notebook-tabs",
      eyebrow: "Mémoire locale",
      title: "Aucune note récente",
      description: "Capturez une idée pour la retrouver ici au prochain passage.",
      actions: [actionButton({ actionId: "v8.notes.new", variant: "primary" }, [icon("plus"), element("span", { text: "Créer une note" })])],
      inline: true
    }));
  }
  recent.append(recentList);

  const signals = element("section", { className: "v8-home-section v8-system-signals" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "État" }), element("h2", { text: "Signal système" })]),
      element("span", { className: "v8-badge" }, [element("span", { className: "v8-live-dot", attributes: { "aria-hidden": "true" } }), "Stable"])
    ]),
    element("div", { className: "v8-signal-list" }, [
      element("div", { className: "v8-signal-row" }, [icon("layers-3"), element("span", {}, [element("strong", { text: "Interface" }), element("small", { text: "Runtime unifié" })]), element("b", { text: "Actif" })]),
      element("div", { className: "v8-signal-row" }, [icon("database"), element("span", {}, [element("strong", { text: "Données" }), element("small", { text: model.hasProfileData ? "Profil local détecté" : "Espace local prêt" })]), element("b", { text: "Sûr" })]),
      element("div", { className: "v8-signal-row" }, [icon("wifi"), element("span", {}, [element("strong", { text: "Réseau" }), element("small", { text: globalThis.navigator?.onLine === false ? "Hors connexion" : "Disponible" })]), element("b", { text: globalThis.navigator?.onLine === false ? "Local" : "En ligne" })])
    ])
  ]);

  const brainSuggestion = model.nextTasks[0]
    ? { icon: "circle-check-big", title: "Reprendre la priorite ouverte", detail: model.nextTasks[0].title, action: "v8.tasks.open", label: "Voir la tache" }
    : { icon: "focus", title: "Passer en Space Focus", detail: "Votre agenda laisse de la place pour un bloc de concentration.", action: "v8.space.focus", label: "Activer Focus" };
  const brainStrip = element("section", { className: "v8-home-brain v8-surface" }, [
    element("span", { className: "v8-home-brain__icon" }, [icon("brain")]),
    element("div", { className: "v8-home-brain__copy" }, [
      element("span", { className: "v8-eyebrow", text: `Brain · ${options.flow || "Essentiel"}` }),
      element("strong", { text: brainSuggestion.title }),
      element("p", { text: brainSuggestion.detail, attributes: model.nextTasks[0] ? { translate: "no" } : {} })
    ]),
    actionButton({ actionId: brainSuggestion.action, variant: "secondary" }, [icon(brainSuggestion.icon), element("span", { text: brainSuggestion.label })]),
    actionButton({ actionId: "v8.brain.open", className: "v8-icon-button", ariaLabel: "Ouvrir Brain" }, [icon("arrow-up-right")])
  ]);

  const page = element("section", { className: `v8-page v8-home v8-home--${model.context.period}`, dataset: { page: "home" } }, [
    heading,
    element("div", { className: "v8-home-primary" }, [continuity, daystream]),
    brainStrip,
    element("div", { className: "v8-home-secondary" }, [recent, signals])
  ]);
  stage.replaceChildren(page);
  refreshIcons();
  return () => page.remove();
}
