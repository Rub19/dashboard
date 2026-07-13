const CATEGORY_META = Object.freeze({
  all: { label: "Toutes", icon: "blocks" },
  media: { label: "Medias", icon: "music" },
  social: { label: "Social", icon: "messages-square" },
  gaming: { label: "Gaming", icon: "gamepad-2" },
  productivity: { label: "Productivite", icon: "briefcase-business" },
  development: { label: "Developpement", icon: "code-2" },
  health: { label: "Sante", icon: "heart-pulse" },
  ai: { label: "IA", icon: "brain" }
});

const records = [
  ["spotify", "Spotify", "media", "oauth", "Lecture, historique et playlists"],
  ["apple-music", "Apple Music", "media", "oauth", "Lecture et bibliotheque musicale"],
  ["youtube-music", "YouTube Music", "media", "oauth", "Lecture et historique musical"],
  ["plex", "Plex", "media", "oauth", "Lecture et bibliotheque personnelle"],
  ["jellyfin", "Jellyfin", "media", "api", "Serveur et lecture personnelle"],
  ["emby", "Emby", "media", "api", "Serveur et lecture personnelle"],
  ["netflix", "Netflix", "media", "oauth", "Disponibilite limitee par l'API publique"],
  ["prime-video", "Prime Video", "media", "oauth", "Disponibilite limitee par l'API publique"],
  ["youtube", "YouTube", "media", "oauth", "Videos, chaines et historique"],
  ["twitch", "Twitch", "media", "oauth", "Lives, chaines et activite"],
  ["google-photos", "Google Photos", "media", "oauth", "Photos et albums recents"],
  ["lastfm", "Last.fm", "media", "api", "Scrobbles et historique musical"],
  ["discord", "Discord", "social", "oauth", "Statut, activite et Rich Presence"],
  ["reddit", "Reddit", "social", "oauth", "Communautes et activite"],
  ["x", "X", "social", "oauth", "Publications et activite"],
  ["instagram", "Instagram", "social", "oauth", "Medias et activite"],
  ["threads", "Threads", "social", "oauth", "Publications et activite"],
  ["bluesky", "Bluesky", "social", "api", "Flux et publications"],
  ["steam", "Steam", "gaming", "api", "Jeux, succes et temps de jeu"],
  ["riot", "Riot Games", "gaming", "api", "Valorant, League of Legends et TFT"],
  ["epic-games", "Epic Games", "gaming", "oauth", "Bibliotheque et sessions"],
  ["battle-net", "Battle.net", "gaming", "oauth", "Jeux et activite Blizzard"],
  ["ubisoft-connect", "Ubisoft Connect", "gaming", "oauth", "Jeux et progression"],
  ["ea-app", "EA App", "gaming", "oauth", "Jeux et progression"],
  ["minecraft", "Minecraft", "gaming", "oauth", "Sessions et serveurs"],
  ["tracker-gg", "Tracker.gg", "gaming", "api", "Rangs, matchs et progression"],
  ["google-calendar", "Google Calendar", "productivity", "oauth", "Agenda et prochains evenements"],
  ["google-drive", "Google Drive", "productivity", "oauth", "Fichiers et activite recente"],
  ["google-docs", "Google Docs", "productivity", "oauth", "Documents recents"],
  ["google-tasks", "Google Tasks", "productivity", "oauth", "Listes et taches"],
  ["notion", "Notion", "productivity", "oauth", "Pages et bases de donnees"],
  ["todoist", "Todoist", "productivity", "oauth", "Taches et projets"],
  ["linear", "Linear", "productivity", "oauth", "Issues, projets et cycles"],
  ["clickup", "ClickUp", "productivity", "oauth", "Taches et espaces"],
  ["jira", "Jira", "productivity", "oauth", "Issues et projets"],
  ["email", "Email", "productivity", "oauth", "Messages et priorites"],
  ["rss", "RSS", "productivity", "feed", "Flux et nouvelles publications"],
  ["weather", "Meteo", "productivity", "api", "Conditions et previsions"],
  ["github", "GitHub", "development", "oauth", "Commits, Pull Requests et Issues"],
  ["gitlab", "GitLab", "development", "oauth", "Commits, Merge Requests et Issues"],
  ["obsidian", "Obsidian", "development", "local", "Vault et notes locales"],
  ["vscode", "VS Code", "development", "local", "Sessions et espaces de travail"],
  ["fitbit", "Fitbit", "health", "oauth", "Activite et indicateurs de sante"],
  ["garmin", "Garmin", "health", "oauth", "Activite et entrainements"],
  ["google-fit", "Google Fit", "health", "oauth", "Activite et objectifs"],
  ["health-connect", "Health Connect", "health", "local", "Donnees de sante Android"],
  ["lm-studio", "LM Studio", "ai", "local", "Modeles locaux et sessions"],
  ["ollama", "Ollama", "ai", "local", "Modeles locaux et activite"],
  ["openai", "OpenAI", "ai", "api", "Modeles et conversations"],
  ["anthropic", "Anthropic", "ai", "api", "Modeles et conversations"],
  ["gemini", "Gemini", "ai", "api", "Modeles et conversations"],
  ["groq", "Groq", "ai", "api", "Modeles et executions" ]
];

export const INTEGRATION_CATEGORIES = Object.freeze(Object.entries(CATEGORY_META).map(([id, meta]) => Object.freeze({ id, ...meta })));

export const INTEGRATIONS = Object.freeze(records.map(([id, name, category, auth, description]) => Object.freeze({
  id,
  name,
  category,
  auth,
  description,
  icon: CATEGORY_META[category]?.icon || "plug"
})));

const SPECIAL_GUIDES = Object.freeze({
  spotify: ["Creer une application Spotify Developer", "Copier le Client ID public", "Ajouter l'URI de redirection ETHONE", "Valider la preparation OAuth"],
  discord: ["Creer une Discord Application", "Activer les permissions Presence utiles", "Copier le Client ID public", "Valider la preparation OAuth"],
  github: ["Creer une GitHub OAuth App", "Choisir les permissions minimales", "Ajouter l'URI de redirection ETHONE", "Valider la preparation OAuth"],
  "google-calendar": ["Creer un projet Google Cloud", "Activer Google Calendar API", "Configurer l'ecran de consentement OAuth", "Ajouter l'URI de redirection ETHONE"]
});

export function integrationById(id) {
  return INTEGRATIONS.find((integration) => integration.id === id) || null;
}

export function integrationCategory(id) {
  return CATEGORY_META[id] || CATEGORY_META.all;
}

export function setupGuide(integration) {
  if (!integration) return Object.freeze([]);
  if (SPECIAL_GUIDES[integration.id]) return Object.freeze([...SPECIAL_GUIDES[integration.id]]);
  if (integration.auth === "oauth") return Object.freeze([`Creer une application ${integration.name}`, "Choisir les permissions minimales", "Ajouter l'URI de redirection ETHONE", "Valider la preparation OAuth"]);
  if (integration.auth === "local") return Object.freeze([`Activer l'acces local dans ${integration.name}`, "Verifier l'adresse locale", "Limiter les permissions au strict necessaire", "Tester la disponibilite locale"]);
  if (integration.auth === "feed") return Object.freeze(["Copier l'URL du flux", "Verifier que le flux est accessible", "Choisir la frequence de synchronisation", "Tester le flux"]);
  return Object.freeze([`Ouvrir les reglages developpeur ${integration.name}`, "Creer un identifiant public", "Conserver les secrets cote serveur", "Tester le connecteur securise"]);
}
