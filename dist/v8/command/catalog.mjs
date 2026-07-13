const commands = [
  { id: "home.open", actionId: "v8.home.open", label: "Ouvrir l'accueil", subtitle: "Vue d'ensemble ETHONE", category: "Navigation", icon: "house", keywords: ["dashboard", "home", "accueil"] },
  { id: "activity.open", actionId: "v8.activity.open", label: "Ouvrir Activity Hub", subtitle: "Activité et signaux ETHONE", category: "Applications", icon: "activity", keywords: ["activity", "activité", "insights", "historique"] },
  { id: "connections.open", actionId: "v8.connections.open", label: "Ouvrir Connections", subtitle: "Integrations et synchronisation", category: "Systeme", icon: "plug", keywords: ["connections", "integrations", "spotify", "discord", "github"], contexts: ["activity"], contextPriority: 96 },
  { id: "spaces.open", actionId: "v8.spaces.open", label: "Ouvrir Spaces", subtitle: "Environnements ETHONE", category: "Navigation", icon: "layout-grid", keywords: ["space", "spaces", "espace", "workspace"] },
  { id: "flows.open", actionId: "v8.flows.open", label: "Ouvrir Flows", subtitle: "Contextes de travail", category: "Navigation", icon: "workflow", keywords: ["flow", "flows", "contexte", "mode"] },
  { id: "mission.open", actionId: "v8.mission.open", label: "Ouvrir Mission Control", subtitle: "Spaces, applications et sessions", category: "Systeme", icon: "layout-dashboard", keywords: ["mission", "spaces", "fenetres", "navigation"], contextPriority: 90 },
  { id: "notes.new", actionId: "v8.notes.new", label: "Nouvelle note", subtitle: "Capturer une idee", category: "Actions", icon: "file-plus-2", keywords: ["note", "ecrire", "capture"], contexts: ["notes"], contextPriority: 120 },
  { id: "notes.open", actionId: "v8.notes.open", label: "Ouvrir Notes", subtitle: "Ecrire et retrouver vos idees", category: "Applications", icon: "notebook-pen", keywords: ["notes", "markdown", "texte"] },
  { id: "tasks.new", actionId: "v8.tasks.new", label: "Nouvelle tache", subtitle: "Ajouter a votre liste", category: "Actions", icon: "list-plus", keywords: ["tache", "todo", "action"], contexts: ["tasks", "home"], contextPriority: 120 },
  { id: "tasks.open", actionId: "v8.tasks.open", label: "Ouvrir Taches", subtitle: "Priorites et progression", category: "Applications", icon: "circle-check-big", keywords: ["tasks", "todo", "taches"] },
  { id: "calendar.open", actionId: "v8.calendar.open", label: "Ouvrir Calendrier", subtitle: "Planning et evenements", category: "Applications", icon: "calendar-days", keywords: ["cal", "agenda", "planning", "evenement"] },
  { id: "calendar.new", actionId: "v8.calendar.new", label: "Nouvel evenement", subtitle: "Ajouter au calendrier", category: "Actions", icon: "calendar-plus", keywords: ["calendrier", "agenda", "evenement"], contexts: ["calendar"], contextPriority: 120 },
  { id: "files.open", actionId: "v8.files.open", label: "Ouvrir Fichiers", subtitle: "Documents et favoris", category: "Applications", icon: "folder", keywords: ["fichiers", "documents", "finder"] },
  { id: "files.new-link", actionId: "v8.files.new-link", label: "Ajouter un lien", subtitle: "Creer une ressource dans Fichiers", category: "Actions", icon: "link-2", keywords: ["fichier", "lien", "url", "ressource"], contexts: ["files"], contextPriority: 120 },
  { id: "widgets.open", actionId: "v8.widgets.open", label: "Ouvrir Widgets", subtitle: "Apercu du Space actif", category: "Systeme", icon: "panels-top-left", keywords: ["widget", "panel", "panneau"] },
  { id: "brain.open", actionId: "v8.brain.open", label: "Ouvrir Brain", subtitle: "Intelligence contextuelle", category: "Applications", icon: "brain", keywords: ["brain", "ai", "ia", "assistant"], contexts: ["home"], contextPriority: 72 },
  { id: "settings.open", actionId: "v8.settings.open", label: "Ouvrir Reglages", subtitle: "Apparence et preferences", category: "Systeme", icon: "settings-2", keywords: ["settings", "reglages", "preferences"] },
  { id: "sync.refresh", actionId: "v8.sync.refresh", label: "Synchroniser maintenant", subtitle: "Verifier les donnees locales", category: "Systeme", icon: "cloud-cog", keywords: ["cloud", "sync", "synchronisation", "sauvegarde"] },
  { id: "locale.cycle", actionId: "v8.locale.cycle", label: "Changer de langue", subtitle: "Francais, English, Espanol, Deutsch", category: "Reglages", icon: "languages", keywords: ["langue", "language", "locale"] },
  { id: "theme.toggle", actionId: "v8.theme.toggle", label: "Changer de theme", subtitle: "Basculer Nuit ou Graphite", category: "Reglages", icon: "sun-moon", keywords: ["theme", "nuit", "graphite", "apparence"], contexts: ["settings"], contextPriority: 100 },
  { id: "density.toggle", actionId: "v8.density.toggle", label: "Changer la densite", subtitle: "Confortable ou compacte", category: "Reglages", icon: "rows-3", keywords: ["densite", "compact", "interface"], contexts: ["settings"], contextPriority: 96 },
  { id: "appearance.cycle", actionId: "v8.appearance.cycle", label: "Changer l'accent", subtitle: "Parcourir les couleurs ETHONE", category: "Reglages", icon: "palette", keywords: ["couleur", "accent", "apparence"], contexts: ["settings"], contextPriority: 100 },
  { id: "space.personal", actionId: "v8.space.personal", label: "Space Personnel", subtitle: "Flow Essentiel", category: "Spaces", icon: "user-round", keywords: ["space", "personnel", "essentiel"], contexts: ["space-personal"], contextPriority: 74 },
  { id: "space.focus", actionId: "v8.space.focus", label: "Space Focus", subtitle: "Flow Deep Work", category: "Spaces", icon: "focus", keywords: ["space", "focus", "deep work", "study", "dev"], contexts: ["space-focus"], contextPriority: 74 },
  { id: "space.studio", actionId: "v8.space.studio", label: "Space Studio", subtitle: "Flow Creation", category: "Spaces", icon: "sparkles", keywords: ["space", "studio", "creation", "creative"], contexts: ["space-studio"], contextPriority: 74 }
].map((command) => Object.freeze({
  ...command,
  keywords: Object.freeze(command.keywords || []),
  contexts: Object.freeze(command.contexts || [])
}));

export const COMMANDS = Object.freeze(commands);

export function commandById(id) {
  return COMMANDS.find((command) => command.id === id) || null;
}
