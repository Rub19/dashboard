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
  ["spotify", "Spotify", "media", "oauth", "Lecture, historique et playlists", "music-2", "Lecture actuelle"],
  ["apple-music", "Apple Music", "media", "oauth", "Lecture et bibliotheque musicale", "audio-lines", "Lecture actuelle"],
  ["youtube-music", "YouTube Music", "media", "oauth", "Lecture et historique musical", "circle-play", "Lecture actuelle"],
  ["plex", "Plex", "media", "api", "Lecture et bibliotheque personnelle", "library", "Lecture actuelle"],
  ["jellyfin", "Jellyfin", "media", "local", "Serveur et lecture personnelle", "server", "Lecture actuelle"],
  ["emby", "Emby", "media", "local", "Serveur et lecture personnelle", "server-cog", "Lecture actuelle"],
  ["netflix", "Netflix", "media", "limited", "Aucune API personnelle publique adaptee", "clapperboard", "Activite indisponible"],
  ["prime-video", "Prime Video", "media", "limited", "Aucune API personnelle publique adaptee", "tv", "Activite indisponible"],
  ["youtube", "YouTube", "media", "oauth", "Videos, chaines et activite", "youtube", "Video publiee"],
  ["twitch", "Twitch", "media", "oauth", "Lives, chaines et activite", "twitch", "Live demarre"],
  ["google-photos", "Google Photos", "media", "oauth", "Photos et albums selectionnes", "images", "Album mis a jour"],
  ["lastfm", "Last.fm", "media", "api", "Scrobbles et historique musical", "history", "Scrobble"],
  ["discord", "Discord", "social", "oauth", "Presence, activite et serveurs autorises", "messages-square", "Presence"],
  ["reddit", "Reddit", "social", "oauth", "Communautes et activite", "message-circle", "Publication"],
  ["x", "X", "social", "restricted", "Acces soumis aux offres et autorisations X", "at-sign", "Publication"],
  ["instagram", "Instagram", "social", "restricted", "Acces limite aux comptes et usages compatibles", "instagram", "Media publie"],
  ["threads", "Threads", "social", "restricted", "Acces soumis aux autorisations Meta", "messages-circle", "Publication"],
  ["bluesky", "Bluesky", "social", "api", "Flux et publications", "cloud", "Publication"],
  ["steam", "Steam", "gaming", "api", "Jeux, succes et temps de jeu", "gamepad-2", "Jeu lance"],
  ["riot", "Riot Games", "gaming", "api", "Valorant, League of Legends et TFT", "swords", "Partie terminee"],
  ["epic-games", "Epic Games", "gaming", "restricted", "Integration reservee aux services Epic approuves", "panels-top-left", "Activite limitee"],
  ["battle-net", "Battle.net", "gaming", "oauth", "Jeux et activite Blizzard", "orbit", "Activite de jeu"],
  ["ubisoft-connect", "Ubisoft Connect", "gaming", "limited", "Aucune API personnelle publique adaptee", "shield", "Activite indisponible"],
  ["ea-app", "EA App", "gaming", "limited", "Aucune API personnelle publique adaptee", "badge-e", "Activite indisponible"],
  ["minecraft", "Minecraft", "gaming", "oauth", "Profil et services Microsoft autorises", "box", "Session"],
  ["tracker-gg", "Tracker.gg", "gaming", "restricted", "Rangs et matchs selon acces partenaire", "chart-no-axes-combined", "Classement mis a jour"],
  ["google-calendar", "Google Calendar", "productivity", "oauth", "Agenda et prochains evenements", "calendar-days", "Evenement"],
  ["google-drive", "Google Drive", "productivity", "oauth", "Fichiers et activite recente", "hard-drive", "Fichier modifie"],
  ["google-docs", "Google Docs", "productivity", "oauth", "Documents recents", "file-text", "Document modifie"],
  ["google-tasks", "Google Tasks", "productivity", "oauth", "Listes et taches", "list-checks", "Tache modifiee"],
  ["notion", "Notion", "productivity", "oauth", "Pages et bases autorisees", "notebook-tabs", "Page modifiee"],
  ["todoist", "Todoist", "productivity", "oauth", "Taches et projets", "circle-check-big", "Tache terminee"],
  ["linear", "Linear", "productivity", "oauth", "Issues, projets et cycles", "workflow", "Issue modifiee"],
  ["clickup", "ClickUp", "productivity", "oauth", "Taches et espaces", "list-todo", "Tache modifiee"],
  ["jira", "Jira", "productivity", "oauth", "Issues et projets", "panels-top-left", "Issue modifiee"],
  ["email", "Email", "productivity", "oauth", "Messages et priorites", "mail", "Nouveau message"],
  ["rss", "RSS", "productivity", "feed", "Flux et nouvelles publications", "rss", "Nouvel article"],
  ["weather", "Meteo", "productivity", "api", "Conditions et previsions", "cloud-sun", "Alerte meteo"],
  ["github", "GitHub", "development", "oauth", "Commits, Pull Requests et Issues", "github", "Commit"],
  ["gitlab", "GitLab", "development", "oauth", "Commits, Merge Requests et Issues", "git-fork", "Commit"],
  ["obsidian", "Obsidian", "development", "local", "Vault et notes locales", "gem", "Note modifiee"],
  ["vscode", "VS Code", "development", "local", "Sessions et espaces de travail", "code-2", "Session de code"],
  ["fitbit", "Fitbit", "health", "oauth", "Activite et indicateurs de sante", "heart-pulse", "Objectif atteint"],
  ["garmin", "Garmin", "health", "restricted", "Acces via le programme developpeur Garmin", "watch", "Entrainement"],
  ["google-fit", "Google Fit", "health", "limited", "API historique en transition vers Health Connect", "activity", "Activite limitee"],
  ["health-connect", "Health Connect", "health", "local", "Donnees de sante Android avec consentement", "heart-handshake", "Donnee synchronisee"],
  ["lm-studio", "LM Studio", "ai", "local", "Modeles locaux et sessions", "monitor-cog", "Execution locale"],
  ["ollama", "Ollama", "ai", "local", "Modeles locaux et activite", "bot", "Execution locale"],
  ["openai", "OpenAI", "ai", "api", "Modeles et executions via un relais securise", "sparkles", "Execution terminee"],
  ["anthropic", "Anthropic", "ai", "api", "Modeles et executions via un relais securise", "brain-circuit", "Execution terminee"],
  ["gemini", "Gemini", "ai", "api", "Modeles et executions via un relais securise", "gem", "Execution terminee"],
  ["groq", "Groq", "ai", "api", "Modeles et executions via un relais securise", "gauge", "Execution terminee"]
];

export const INTEGRATION_CATEGORIES = Object.freeze(Object.entries(CATEGORY_META).map(([id, meta]) => Object.freeze({ id, ...meta })));

export const INTEGRATIONS = Object.freeze(records.map(([id, name, category, auth, description, icon, liveSignal]) => Object.freeze({
  id,
  name,
  category,
  auth,
  description,
  icon,
  liveSignal
})));

function method(input) {
  return Object.freeze({
    id: input.id,
    label: input.label,
    summary: input.summary,
    availability: input.availability || "backend",
    recommended: input.recommended === true,
    quality: input.quality || "Standard",
    apiVersion: input.apiVersion || "Selon fournisseur",
    badges: Object.freeze([...(input.badges || [])]),
    capabilities: Object.freeze([...(input.capabilities || [])]),
    permissions: Object.freeze([...(input.permissions || [])]),
    dependency: input.dependency || "",
    endpoint: input.endpoint || "",
    field: input.field ? Object.freeze({ ...input.field }) : null,
    disabled: input.disabled === true
  });
}

const METHOD_PRESETS = Object.freeze({
  oauth: Object.freeze([
    method({ id: "oauth-secure", label: "OAuth securise", summary: "Autorisation officielle avec permissions minimales et echange cote serveur.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "OAuth 2.0", badges: ["Recommande", "OAuth", "Cloud"], capabilities: ["Synchronisation autorisee", "Actualisation automatique", "Activity Hub"], permissions: ["Identite de compte", "Donnees selectionnees", "Acces revocable"] }),
    method({ id: "public-readonly", label: "Lecture publique", summary: "Utilise uniquement les donnees rendues publiques par le compte.", availability: "public", quality: "Essentielle", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Profil public", "Donnees publiques"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Adresse publique", placeholder: "https://...", required: true } })
  ]),
  api: Object.freeze([
    method({ id: "server-connector", label: "Connecteur serveur", summary: "Les appels et donnees sensibles restent dans un relais ETHONE securise.", availability: "backend", recommended: true, quality: "Complete", badges: ["Recommande", "Cloud"], capabilities: ["Synchronisation planifiee", "Activity Hub", "Diagnostic serveur"], permissions: ["Acces limite au service", "Acces revocable"] }),
    method({ id: "public-readonly", label: "Lecture publique", summary: "Fonctions publiques uniquement, sans controles ni donnees privees.", availability: "public", quality: "Essentielle", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Donnees publiques"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Adresse publique", placeholder: "https://...", required: true } })
  ]),
  local: Object.freeze([
    method({ id: "local-bridge", label: "Bridge local", summary: "Connexion sur votre machine, sans exposer le service sur Internet.", availability: "local", recommended: true, quality: "Locale", badges: ["Recommande", "Local", "Temps reel"], capabilities: ["Etat local", "Mises a jour directes", "Activity Hub"], permissions: ["Acces local explicite"], field: { type: "url", label: "Adresse locale", placeholder: "http://127.0.0.1:...", required: true } })
  ]),
  feed: Object.freeze([
    method({ id: "public-feed", label: "Flux public", summary: "Lecture d'une URL de flux publique avec validation avant activation.", availability: "public", recommended: true, quality: "Lecture seule", apiVersion: "RSS / Atom", badges: ["Recommande", "Simple", "Lecture seule", "Sans secret"], capabilities: ["Nouveaux articles", "Historique recent", "Activity Hub"], permissions: ["Lecture du flux indique"], field: { type: "url", label: "Adresse RSS ou Atom", placeholder: "https://example.com/feed.xml", required: true } })
  ]),
  restricted: Object.freeze([
    method({ id: "approved-access", label: "Acces approuve", summary: "Cette integration depend d'une offre, d'un partenariat ou d'une validation du fournisseur.", availability: "restricted", recommended: true, quality: "Sous conditions", badges: ["Acces limite", "Cloud"], capabilities: ["Selon autorisation du fournisseur"], permissions: ["Definies lors de l'approbation"], disabled: true })
  ]),
  limited: Object.freeze([
    method({ id: "official-only", label: "Application officielle", summary: "ETHONE ne propose pas de connecteur tant qu'une API personnelle fiable n'existe pas.", availability: "limited", recommended: true, quality: "Indisponible", badges: ["Lecture seule", "Limite"], capabilities: ["Lien vers le service officiel"], permissions: ["Aucune"], disabled: true })
  ])
});

const SPECIAL_METHODS = Object.freeze({
  spotify: Object.freeze([
    method({ id: "oauth-pkce", label: "Spotify OAuth", summary: "Lecture actuelle, bibliotheque, playlists et appareils via l'API officielle.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Spotify Web API", badges: ["Recommande", "OAuth", "Temps reel", "Cloud"], capabilities: ["Lecture actuelle", "Historique autorise", "Playlists", "Appareils", "Controle de lecture"], permissions: ["Profil", "Etat de lecture", "Bibliotheque selectionnee"] }),
    method({ id: "discord-lanyard", label: "Discord + Lanyard", summary: "Presence Spotify publique exposee par Discord, sans controle de lecture.", availability: "bridge", quality: "Temps reel", apiVersion: "Lanyard", badges: ["Simple", "Via Discord", "Via Lanyard", "Lecture seule"], capabilities: ["Morceau actuel", "Artiste", "Album", "Pochette", "Progression"], permissions: ["Presence Discord publique"], dependency: "discord", field: { type: "text", label: "Identifiant Discord public", placeholder: "123456789012345678", required: true } }),
    method({ id: "lastfm-history", label: "Last.fm", summary: "Historique musical et statistiques a partir des scrobbles Last.fm.", availability: "bridge", quality: "Historique", apiVersion: "Last.fm API", badges: ["Via Last.fm", "Lecture seule", "Cloud"], capabilities: ["Historique", "Top artistes", "Top morceaux", "Statistiques"], permissions: ["Profil Last.fm public ou autorise"], dependency: "lastfm", field: { type: "text", label: "Nom d'utilisateur Last.fm", placeholder: "Votre profil public", required: true } }),
    method({ id: "public-profile", label: "Profil public", summary: "Apercu limite a une URL de profil ou de playlist publique.", availability: "public", quality: "Essentielle", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Profil public", "Playlist publique"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Profil ou playlist publique", placeholder: "https://open.spotify.com/...", required: true } })
  ]),
  discord: Object.freeze([
    method({ id: "oauth-secure", label: "Discord OAuth", summary: "Identite et ressources autorisees via le flux officiel cote serveur.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Discord OAuth2", badges: ["Recommande", "OAuth", "Cloud"], capabilities: ["Profil", "Serveurs autorises", "Activity Hub"], permissions: ["Identify", "Guilds selon besoin"] }),
    method({ id: "lanyard-presence", label: "Lanyard Presence", summary: "Presence Discord publique en lecture seule et mise a jour en direct.", availability: "public", quality: "Temps reel", apiVersion: "Lanyard", badges: ["Simple", "Via Lanyard", "Temps reel", "Lecture seule"], capabilities: ["Statut", "Activite", "Spotify expose"], permissions: ["Identifiant Discord public"], field: { type: "text", label: "Identifiant Discord public", placeholder: "123456789012345678", required: true } })
  ]),
  github: Object.freeze([
    method({ id: "github-app", label: "GitHub App", summary: "Permissions fines, installation revocable et acces limite aux depots choisis.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "GitHub App API", badges: ["Recommande", "Cloud", "Temps reel"], capabilities: ["Commits", "Pull Requests", "Issues", "Webhooks"], permissions: ["Depots selectionnes", "Metadonnees", "Lecture ou ecriture explicite"] }),
    method({ id: "oauth-secure", label: "GitHub OAuth App", summary: "Connexion OAuth classique pour les profils et actions autorisees.", availability: "backend", quality: "Standard", apiVersion: "GitHub OAuth", badges: ["OAuth", "Cloud"], capabilities: ["Profil", "Depots autorises", "Activity Hub"], permissions: ["Scopes OAuth selectionnes"] }),
    method({ id: "public-profile", label: "Profil public", summary: "Contributions et depots publics, sans acces prive.", availability: "public", quality: "Lecture seule", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Profil public", "Depots publics", "Contributions"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Profil GitHub public", placeholder: "https://github.com/utilisateur", required: true } })
  ]),
  "google-calendar": Object.freeze([
    method({ id: "oauth-secure", label: "Google OAuth", summary: "Calendriers autorises avec scopes minimaux et synchronisation cote serveur.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Google Calendar API", badges: ["Recommande", "OAuth", "Cloud"], capabilities: ["Evenements", "Calendriers choisis", "Rappels", "Activity Hub"], permissions: ["Lecture agenda", "Ecriture optionnelle"] }),
    method({ id: "ics-readonly", label: "Calendrier ICS", summary: "Abonnement a une adresse ICS partagee, strictement en lecture seule.", availability: "public", quality: "Lecture seule", apiVersion: "iCalendar", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Evenements publies", "Actualisation periodique"], permissions: ["Lecture de l'agenda partage"], field: { type: "url", label: "Adresse ICS partagee", placeholder: "https://.../calendar.ics", required: true } })
  ]),
  notion: Object.freeze([
    method({ id: "public-oauth", label: "Connexion publique", summary: "OAuth Notion pour choisir les pages partagees avec ETHONE.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Notion API", badges: ["Recommande", "OAuth", "Cloud"], capabilities: ["Pages partagees", "Bases partagees", "Activity Hub"], permissions: ["Contenu explicitement partage"] }),
    method({ id: "internal-backend", label: "Connexion interne", summary: "Pour un seul workspace, avec identifiants conserves uniquement cote serveur.", availability: "backend", quality: "Workspace", apiVersion: "Notion API", badges: ["Cloud", "Workspace"], capabilities: ["Pages partagees", "Bases partagees"], permissions: ["Contenu explicitement partage"] })
  ]),
  steam: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Jeux et activite visibles selon les reglages de confidentialite Steam.", availability: "public", recommended: true, quality: "Lecture seule", apiVersion: "Steam Community", badges: ["Recommande", "Simple", "Lecture seule"], capabilities: ["Jeu actuel", "Bibliotheque publique", "Temps de jeu public"], permissions: ["Profil Steam public"], field: { type: "url", label: "Profil Steam public", placeholder: "https://steamcommunity.com/id/...", required: true } }),
    method({ id: "server-connector", label: "Steam Web API", summary: "Enrichissement via un relais serveur et l'API officielle.", availability: "backend", quality: "Complete", apiVersion: "Steam Web API", badges: ["Cloud"], capabilities: ["Profil", "Jeux", "Statistiques disponibles"], permissions: ["Donnees exposees par Steam"] })
  ]),
  email: Object.freeze([
    method({ id: "provider-oauth", label: "OAuth fournisseur", summary: "Connexion recommandee pour Gmail, Outlook et fournisseurs compatibles.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "OAuth 2.0", badges: ["Recommande", "OAuth", "Cloud"], capabilities: ["Nouveaux messages", "Priorites", "Activity Hub"], permissions: ["Lecture des messages selectionnes"] }),
    method({ id: "imap-backend", label: "IMAP via backend", summary: "Compatibilite etendue avec traitement exclusivement cote serveur.", availability: "backend", quality: "Compatible", apiVersion: "IMAP", badges: ["Cloud"], capabilities: ["Boite de reception", "Dossiers"], permissions: ["Lecture limitee aux dossiers choisis"] })
  ]),
  "lm-studio": Object.freeze([method({ id: "local-openai", label: "Serveur local compatible", summary: "Connexion directe au serveur local compatible OpenAI de LM Studio.", availability: "local", recommended: true, quality: "Locale", apiVersion: "OpenAI compatible", endpoint: "http://127.0.0.1:1234/v1", badges: ["Recommande", "Local", "Sans secret"], capabilities: ["Modeles locaux", "Executions locales"], permissions: ["Acces boucle locale"], field: { type: "url", label: "Adresse locale LM Studio", placeholder: "http://127.0.0.1:1234/v1", required: true } })]),
  ollama: Object.freeze([method({ id: "local-http", label: "API locale Ollama", summary: "Connexion a Ollama sur la boucle locale, sans exposition Internet.", availability: "local", recommended: true, quality: "Locale", apiVersion: "Ollama API", endpoint: "http://127.0.0.1:11434", badges: ["Recommande", "Local", "Sans secret"], capabilities: ["Modeles locaux", "Executions locales"], permissions: ["Acces boucle locale"], field: { type: "url", label: "Adresse locale Ollama", placeholder: "http://127.0.0.1:11434", required: true } })])
});

const OFFICIAL_HOME = Object.freeze({
  spotify: "https://developer.spotify.com/", "apple-music": "https://developer.apple.com/musickit/", "youtube-music": "https://developers.google.com/youtube/v3", plex: "https://www.plex.tv/", jellyfin: "https://jellyfin.org/docs/", emby: "https://dev.emby.media/", netflix: "https://www.netflix.com/", "prime-video": "https://www.primevideo.com/", youtube: "https://developers.google.com/youtube/v3", twitch: "https://dev.twitch.tv/docs/", "google-photos": "https://developers.google.com/photos", lastfm: "https://www.last.fm/api", discord: "https://docs.discord.com/developers/", reddit: "https://www.reddit.com/dev/api/", x: "https://developer.x.com/en/docs", instagram: "https://developers.facebook.com/docs/instagram-platform", threads: "https://developers.facebook.com/docs/threads", bluesky: "https://docs.bsky.app/", steam: "https://steamcommunity.com/dev", riot: "https://developer.riotgames.com/", "epic-games": "https://dev.epicgames.com/docs/epic-account-services", "battle-net": "https://develop.battle.net/", "ubisoft-connect": "https://connect.ubisoft.com/", "ea-app": "https://www.ea.com/ea-app", minecraft: "https://learn.microsoft.com/minecraft/creator/", "tracker-gg": "https://tracker.gg/developers", "google-calendar": "https://developers.google.com/workspace/calendar/api", "google-drive": "https://developers.google.com/drive/api/guides/about-sdk", "google-docs": "https://developers.google.com/docs/api", "google-tasks": "https://developers.google.com/tasks", notion: "https://developers.notion.com/", todoist: "https://developer.todoist.com/", linear: "https://developers.linear.app/docs/", clickup: "https://developer.clickup.com/", jira: "https://developer.atlassian.com/cloud/jira/platform/", email: "https://developers.google.com/gmail/api", rss: "https://www.rssboard.org/rss-specification", weather: "https://open-meteo.com/en/docs", github: "https://docs.github.com/en/apps", gitlab: "https://docs.gitlab.com/integration/oauth_provider/", obsidian: "https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin", vscode: "https://code.visualstudio.com/api", fitbit: "https://dev.fitbit.com/build/reference/web-api/", garmin: "https://developer.garmin.com/", "google-fit": "https://developers.google.com/fit", "health-connect": "https://developer.android.com/health-and-fitness/guides/health-connect", "lm-studio": "https://lmstudio.ai/docs/developer", ollama: "https://docs.ollama.com/api", openai: "https://platform.openai.com/docs/", anthropic: "https://docs.anthropic.com/", gemini: "https://ai.google.dev/gemini-api/docs", groq: "https://console.groq.com/docs"
});

const SPECIAL_RESOURCES = Object.freeze({
  spotify: Object.freeze([
    { label: "Guide OAuth officiel", url: "https://developer.spotify.com/documentation/web-api/concepts/authorization", kind: "Documentation" },
    { label: "Dashboard developpeur", url: "https://developer.spotify.com/dashboard", kind: "Console" }
  ]),
  discord: Object.freeze([
    { label: "OAuth2 et permissions", url: "https://docs.discord.com/developers/topics/oauth2", kind: "Documentation" },
    { label: "Applications Discord", url: "https://discord.com/developers/applications", kind: "Console" }
  ]),
  github: Object.freeze([
    { label: "Creer une GitHub App", url: "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app", kind: "Guide" },
    { label: "Parametres developpeur", url: "https://github.com/settings/apps", kind: "Console" }
  ]),
  "google-calendar": Object.freeze([
    { label: "Scopes Calendar", url: "https://developers.google.com/workspace/calendar/api/auth", kind: "Documentation" },
    { label: "Google Cloud Console", url: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com", kind: "Console" }
  ]),
  notion: Object.freeze([
    { label: "Guide d'autorisation", url: "https://developers.notion.com/guides/get-started/authorization", kind: "Documentation" },
    { label: "Mes integrations", url: "https://www.notion.so/profile/integrations", kind: "Console" }
  ]),
  twitch: Object.freeze([
    { label: "Authentification Twitch", url: "https://dev.twitch.tv/docs/authentication/", kind: "Documentation" },
    { label: "Console Twitch", url: "https://dev.twitch.tv/console/apps", kind: "Console" }
  ]),
  lastfm: Object.freeze([
    { label: "Authentification Last.fm", url: "https://www.last.fm/api/authentication", kind: "Documentation" },
    { label: "Comptes API", url: "https://www.last.fm/api/accounts", kind: "Console" }
  ])
});

export function integrationById(id) {
  return INTEGRATIONS.find((integration) => integration.id === id) || null;
}

export function integrationCategory(id) {
  return CATEGORY_META[id] || CATEGORY_META.all;
}

export function connectionMethods(integrationOrId) {
  const integration = typeof integrationOrId === "string" ? integrationById(integrationOrId) : integrationOrId;
  if (!integration) return Object.freeze([]);
  return SPECIAL_METHODS[integration.id] || METHOD_PRESETS[integration.auth] || METHOD_PRESETS.limited;
}

export function connectionMethod(integrationOrId, methodId) {
  const methods = connectionMethods(integrationOrId);
  return methods.find((entry) => entry.id === methodId) || methods.find((entry) => entry.recommended) || methods[0] || null;
}

export function officialResources(integrationOrId) {
  const integration = typeof integrationOrId === "string" ? integrationById(integrationOrId) : integrationOrId;
  if (!integration) return Object.freeze([]);
  if (SPECIAL_RESOURCES[integration.id]) return SPECIAL_RESOURCES[integration.id].map((entry) => Object.freeze({ ...entry }));
  const url = OFFICIAL_HOME[integration.id];
  return Object.freeze(url ? [Object.freeze({ label: `Documentation ${integration.name}`, url, kind: "Officiel" })] : []);
}

function guideStep(id, title, description, extra = {}) {
  return Object.freeze({ id, title, description, resource: extra.resource || null, copyValue: extra.copyValue || "", status: extra.status || "todo" });
}

export function setupGuide(integrationOrId, methodId) {
  const integration = typeof integrationOrId === "string" ? integrationById(integrationOrId) : integrationOrId;
  if (!integration) return Object.freeze([]);
  const selected = connectionMethod(integration, methodId);
  if (!selected) return Object.freeze([]);
  const [primaryResource = null] = officialResources(integration);

  if (selected.availability === "limited" || selected.availability === "restricted") {
    return Object.freeze([
      guideStep("availability", "Verifier la disponibilite", selected.summary, { resource: primaryResource, status: "blocked" }),
      guideStep("wait", "Connecteur desactive proprement", "ETHONE n'activera pas une methode non officielle ou non autorisee.", { status: "blocked" })
    ]);
  }

  if (selected.availability === "local") {
    return Object.freeze([
      guideStep("service", `Demarrer ${integration.name}`, "Activez le service uniquement sur votre machine et consultez sa documentation officielle.", { resource: primaryResource }),
      guideStep("endpoint", "Verifier l'adresse locale", "L'adresse proposee reste sur la boucle locale et ne contient aucune donnee sensible.", { copyValue: selected.endpoint }),
      guideStep("permissions", "Limiter l'acces", "Autorisez uniquement les fonctions indispensables a ETHONE."),
      guideStep("verify", "Verifier la preparation", "Le diagnostic ETHONE controle le navigateur, la methode et la configuration locale.")
    ]);
  }

  if (selected.availability === "public" || selected.availability === "bridge") {
    return Object.freeze([
      guideStep("source", "Ouvrir la source officielle", "Verifiez que les donnees que vous souhaitez partager sont publiques.", { resource: primaryResource }),
      guideStep("scope", "Choisir le perimetre", `ETHONE utilisera seulement : ${selected.capabilities.join(", ")}.`),
      guideStep("privacy", "Controler la confidentialite", "Aucune donnee privee n'est demandee par cette methode."),
      guideStep("verify", "Verifier la preparation", "Le diagnostic ETHONE verifie la route Worker sans simuler une connexion au service.")
    ]);
  }

  return Object.freeze([
    guideStep("docs", "Lire le guide officiel", "Ouvrez la documentation du fournisseur avant de creer l'integration.", { resource: primaryResource }),
    guideStep("app", `Creer l'application ${integration.name}`, "Utilisez le tableau de bord officiel et demandez uniquement les permissions affichees par ETHONE."),
    guideStep("backend", "Configurer le relais securise", "L'echange OAuth et les donnees sensibles doivent rester dans une Edge Function, un Worker ou un backend equivalent."),
    guideStep("consent", "Verifier le consentement", `Permissions prevues : ${selected.permissions.join(", ")}.`),
    guideStep("verify", "Verifier la preparation", "ETHONE valide les metadonnees locales. Le test distant restera indisponible tant que le backend n'est pas branche.")
  ]);
}
