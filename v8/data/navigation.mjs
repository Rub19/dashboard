const items = [
  { id: "home", label: "Accueil", icon: "house", actionId: "v8.home.open" },
  { id: "notes", label: "Notes", icon: "notebook-pen", actionId: "v8.notes.open" },
  { id: "tasks", label: "Tâches", icon: "circle-check-big", actionId: "v8.tasks.open" },
  { id: "calendar", label: "Calendrier", icon: "calendar-days", actionId: "v8.calendar.open" },
  { id: "files", label: "Fichiers", icon: "folder", actionId: "v8.files.open" },
  { id: "activity", label: "Activity", icon: "activity", actionId: "v8.activity.open" },
  { id: "interactions", label: "Interactions", icon: "flame", actionId: "v8.interactions.open" },
  { id: "connections", label: "Connections", icon: "plug", actionId: "v8.connections.open" },
  { id: "spaces", label: "Spaces", icon: "layout-grid", actionId: "v8.spaces.open" },
  { id: "flows", label: "Flows", icon: "workflow", actionId: "v8.flows.open" },
  { id: "brain", label: "Brain", icon: "brain", actionId: "v8.brain.open" },
  { id: "team", label: "Équipe", icon: "users", actionId: "v8.team.open" },
  { id: "settings", label: "Réglages", icon: "settings-2", actionId: "v8.settings.open" }
].map((item) => Object.freeze(item));

export const NAVIGATION_ITEMS = Object.freeze(items);

export function navigationItem(id) {
  return NAVIGATION_ITEMS.find((item) => item.id === id) || NAVIGATION_ITEMS[0];
}
