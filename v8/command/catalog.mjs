const commands = [
  { id: "home.open", actionId: "v8.home.open", label: "Ouvrir l'accueil", subtitle: "Vue d'ensemble ETHONE", category: "Navigation", icon: "house", keywords: ["dashboard", "home", "accueil"] },
  { id: "activity.open", actionId: "v8.activity.open", label: "Ouvrir Activity Hub", subtitle: "Activité et signaux ETHONE", category: "Applications", icon: "activity", keywords: ["activity", "activité", "insights", "historique"] },
  { id: "connections.open", actionId: "v8.connections.open", label: "Ouvrir Connections", subtitle: "Intégrations et synchronisation", category: "Système", icon: "plug", keywords: ["connections", "intégrations", "spotify", "discord", "github"], contexts: ["activity"], contextPriority: 96 },
  { id: "spaces.open", actionId: "v8.spaces.open", label: "Ouvrir Spaces", subtitle: "Environnements ETHONE", category: "Navigation", icon: "layout-grid", keywords: ["space", "spaces", "espace", "workspace"] },
  { id: "flows.open", actionId: "v8.flows.open", label: "Ouvrir Flows", subtitle: "Contextes de travail", category: "Navigation", icon: "workflow", keywords: ["flow", "flows", "contexte", "mode"] },
  { id: "mission.open", actionId: "v8.mission.open", label: "Ouvrir Mission Control", subtitle: "Spaces, applications et sessions", category: "Système", icon: "layout-dashboard", keywords: ["mission", "spaces", "fenêtrès", "navigation"], contextPriority: 90 },
  { id: "notes.new", actionId: "v8.notes.new", label: "Nouvelle note", subtitle: "Capturer une idee", category: "Actions", icon: "file-plus-2", keywords: ["note", "ecrire", "capture"], contexts: ["notes"], contextPriority: 120 },
  { id: "notes.open", actionId: "v8.notes.open", label: "Ouvrir Notes", subtitle: "Ecrire et retrouver vos idees", category: "Applications", icon: "notebook-pen", keywords: ["notes", "markdown", "texte"] },
  { id: "tasks.new", actionId: "v8.tasks.new", label: "Nouvelle tache", subtitle: "Ajouter a votre liste", category: "Actions", icon: "list-plus", keywords: ["tache", "todo", "action"], contexts: ["tasks", "home"], contextPriority: 120 },
  { id: "tasks.open", actionId: "v8.tasks.open", label: "Ouvrir Taches", subtitle: "Priorités et progression", category: "Applications", icon: "circle-check-big", keywords: ["tasks", "todo", "taches"] },
  { id: "calendar.open", actionId: "v8.calendar.open", label: "Ouvrir Calendrier", subtitle: "Planning et événements", category: "Applications", icon: "calendar-days", keywords: ["cal", "agenda", "planning", "événement"] },
  { id: "calendar.new", actionId: "v8.calendar.new", label: "Nouvel événement", subtitle: "Ajouter au calendrier", category: "Actions", icon: "calendar-plus", keywords: ["calendrier", "agenda", "événement"], contexts: ["calendar"], contextPriority: 120 },
  { id: "files.open", actionId: "v8.files.open", label: "Ouvrir Fichiers", subtitle: "Documents et favoris", category: "Applications", icon: "folder", keywords: ["fichiers", "documents", "finder"] },
  { id: "files.new-link", actionId: "v8.files.new-link", label: "Ajouter un lien", subtitle: "Créer une ressource dans Fichiers", category: "Actions", icon: "link-2", keywords: ["fichier", "lien", "url", "ressource"], contexts: ["files"], contextPriority: 120 },
  { id: "widgets.open", actionId: "v8.widgets.open", label: "Ouvrir Widgets", subtitle: "Apercu du Space actif", category: "Système", icon: "panels-top-left", keywords: ["widget", "panel", "panneau"] },
  { id: "brain.open", actionId: "v8.brain.open", label: "Ouvrir Brain", subtitle: "Intelligence contextuelle", category: "Applications", icon: "brain", keywords: ["brain", "ai", "ia", "assistant"], contexts: ["home"], contextPriority: 72 },
  { id: "settings.open", actionId: "v8.settings.open", label: "Ouvrir Réglages", subtitle: "Apparence et préférences", category: "Système", icon: "settings-2", keywords: ["settings", "réglages", "préférences"] },
  { id: "changelog.open", actionId: "v8.changelog.open", label: "Notes de version (Changelog)", subtitle: "Nouveautés et historique ETHONE v189", category: "Système", icon: "badge-check", keywords: ["changelog", "version", "mise à jour", "maj", "nouveautés", "notes"] },
  { id: "sync.refresh", actionId: "v8.sync.refresh", label: "Synchroniser maintenant", subtitle: "Vérifier les données locales", category: "Système", icon: "cloud-cog", keywords: ["cloud", "sync", "synchronisation", "sauvegarde"] },
  { id: "locale.cycle", actionId: "v8.locale.cycle", label: "Changer de langue", subtitle: "Francais, English, Espanol, Deutsch", category: "Réglages", icon: "languages", keywords: ["langue", "language", "locale"] },
  { id: "theme.toggle", actionId: "v8.theme.toggle", label: "Changer de thème", subtitle: "Basculer Nuit ou Graphite", category: "Réglages", icon: "sun-moon", keywords: ["thème", "nuit", "graphite", "apparence"], contexts: ["settings"], contextPriority: 100 },
  { id: "density.automatic", actionId: "v8.density.automatic", label: "Densité automatique", subtitle: "Adapter l'interface a l'écran et au contexte", category: "Réglages", icon: "wand-sparkles", keywords: ["densité", "automatique", "zoom", "responsive"], contexts: ["settings"], contextPriority: 102 },
  { id: "density.spacious", actionId: "v8.density.spacious", label: "Densité spacieuse", subtitle: "Lecture et cibles genereuses", category: "Réglages", icon: "maximize-2", keywords: ["densité", "spacieux", "accessibilite"], contexts: ["settings"], contextPriority: 96 },
  { id: "density.comfortable", actionId: "v8.density.comfortable", label: "Densité confortable", subtitle: "Equilibre ETHONE par defaut", category: "Réglages", icon: "panel-top", keywords: ["densité", "confortable", "interface"], contexts: ["settings"], contextPriority: 96 },
  { id: "density.compact", actionId: "v8.density.compact", label: "Densité compacte", subtitle: "Plus d'information visible", category: "Réglages", icon: "rows-3", keywords: ["densité", "compact", "interface"], contexts: ["settings"], contextPriority: 96 },
  { id: "density.ultra", actionId: "v8.density.ultra-compact", label: "Densité ultra compacte", subtitle: "Densité maximale, focus conserve", category: "Réglages", icon: "list-collapse", keywords: ["densité", "ultra", "compact"], contexts: ["settings"], contextPriority: 94 },
  { id: "brain.privacy", actionId: "v8.brain.open", label: "Ouvrir le Privacy Center Brain", subtitle: "Contexte, memoire et permissions", category: "Brain", icon: "shield-check", keywords: ["brain", "privacy", "memoire", "permissions"], contexts: ["brain", "settings"], contextPriority: 108 },
  { id: "appearance.cycle", actionId: "v8.appearance.cycle", label: "Changer l'accent", subtitle: "Parcourir les couleurs ETHONE", category: "Réglages", icon: "palette", keywords: ["couleur", "accent", "apparence"], contexts: ["settings"], contextPriority: 100 },
  { id: "space.personal", actionId: "v8.space.personal", label: "Space Personnel", subtitle: "Flow Essentiel", category: "Spaces", icon: "user-round", keywords: ["space", "personnel", "essentiel"], contexts: ["space-personal"], contextPriority: 74 },
  { id: "space.focus", actionId: "v8.space.focus", label: "Space Focus", subtitle: "Flow Deep Work", category: "Spaces", icon: "focus", keywords: ["space", "focus", "deep work", "study", "dev"], contexts: ["space-focus"], contextPriority: 74 },
  { id: "space.studio", actionId: "v8.space.studio", label: "Space Studio", subtitle: "Flow Creation", category: "Spaces", icon: "sparkles", keywords: ["space", "studio", "creation", "creative"], contexts: ["space-studio"], contextPriority: 74 },
  { id: "zen.toggle", actionId: "v8.zen.toggle", label: "Mode Zen (Concentration)", subtitle: "Masquer les barres pour un focus maximal", category: "Navigation", icon: "minimize-2", keywords: ["zen", "focus", "concentration", "plein écran"] },
  { id: "dock.scale", actionId: "v8.dock.scale", label: "Taille du Dock", subtitle: "Changer l'échelle (Compacte, Normale, Grande)", category: "Réglages", icon: "layout-bottom", keywords: ["dock", "taille", "échelle", "barre"] }
].map((command) => Object.freeze({
  ...command,
  keywords: Object.freeze(command.keywords || []),
  contexts: Object.freeze(command.contexts || [])
}));

export const COMMANDS = Object.freeze(commands);

export function commandById(id) {
  return COMMANDS.find((command) => command.id === id) || null;
}
