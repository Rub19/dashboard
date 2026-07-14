const WIDGETS = Object.freeze({
  notes: Object.freeze({ id: "notes", label: "Notes", icon: "notebook-pen", actionId: "v8.notes.open", countKey: "notes" }),
  tasks: Object.freeze({ id: "tasks", label: "Priorites", icon: "circle-check-big", actionId: "v8.tasks.open", countKey: "tasks" }),
  calendar: Object.freeze({ id: "calendar", label: "Agenda", icon: "calendar-days", actionId: "v8.calendar.open", countKey: "events" }),
  files: Object.freeze({ id: "files", label: "Fichiers", icon: "folder", actionId: "v8.files.open", countKey: "files" }),
  brain: Object.freeze({ id: "brain", label: "Brain", icon: "brain", actionId: "v8.brain.open", countKey: "brain" })
});

function workspace(input) {
  return Object.freeze({ ...input, steps: Object.freeze(input.steps), widgets: Object.freeze(input.widgets.map((id) => WIDGETS[id])) });
}

export const WORKSPACES = Object.freeze([
  workspace({ id: "personal", label: "Personnel", flow: "Essentiel", accent: "mint", actionId: "v8.space.personal", icon: "user-round", description: "Un environnement equilibre pour organiser le quotidien.", steps: ["Capturer", "Organiser", "Executer"], widgets: ["notes", "tasks", "calendar", "brain"] }),
  workspace({ id: "focus", label: "Focus", flow: "Deep Work", accent: "sky", actionId: "v8.space.focus", icon: "focus", description: "Un environnement calme pour avancer sur une priorite.", steps: ["Choisir", "Concentrer", "Terminer"], widgets: ["tasks", "calendar", "brain", "notes"] }),
  workspace({ id: "studio", label: "Studio", flow: "Creation", accent: "rose", actionId: "v8.space.studio", icon: "sparkles", description: "Un environnement souple pour connecter les idees.", steps: ["Explorer", "Relier", "Publier"], widgets: ["notes", "files", "brain", "calendar"] })
]);

export function workspaceById(id) {
  return WORKSPACES.find((item) => item.id === id) || WORKSPACES[0];
}
