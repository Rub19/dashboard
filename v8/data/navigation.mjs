const items = [
  { id: "home", label: "Accueil", icon: "house", actionId: "v8.home.open", mobile: true },
  { id: "notes", label: "Notes", icon: "notebook-pen", actionId: "v8.notes.open", mobile: true },
  { id: "tasks", label: "Tâches", icon: "circle-check-big", actionId: "v8.tasks.open", mobile: false },
  { id: "calendar", label: "Calendrier", icon: "calendar-days", actionId: "v8.calendar.open", mobile: false },
  { id: "files", label: "Fichiers", icon: "folder", actionId: "v8.files.open", mobile: false },
  { id: "activity", label: "Activity", icon: "activity", actionId: "v8.activity.open", mobile: false },
  { id: "connections", label: "Connections", icon: "plug", actionId: "v8.connections.open", mobile: false },
  { id: "spaces", label: "Spaces", icon: "layout-grid", actionId: "v8.spaces.open", mobile: false },
  { id: "flows", label: "Flows", icon: "workflow", actionId: "v8.flows.open", mobile: false },
  { id: "brain", label: "Brain", icon: "brain", actionId: "v8.brain.open", mobile: true },
  { id: "settings", label: "Réglages", icon: "settings-2", actionId: "v8.settings.open", mobile: true }
].map((item) => Object.freeze(item));

export const NAVIGATION_ITEMS = Object.freeze(items);

export function navigationItem(id) {
  return NAVIGATION_ITEMS.find((item) => item.id === id) || NAVIGATION_ITEMS[0];
}
