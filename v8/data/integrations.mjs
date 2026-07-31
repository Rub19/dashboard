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
  ["plex", "Plex", "media", "api", "Lecture et bibliotheque personnelle", "library", "Lecture actuelle"],
  ["jellyfin", "Jellyfin", "media", "local", "Serveur et lecture personnelle", "server", "Lecture actuelle"],
  ["emby", "Emby", "media", "local", "Serveur et lecture personnelle", "server-cog", "Lecture actuelle"],
  ["youtube", "YouTube", "media", "oauth", "Videos, chaines et activité", "youtube", "Video publiée"],
  ["twitch", "Twitch", "media", "oauth", "Lives, chaines et activité", "twitch", "Live demarre"],
  ["lastfm", "Last.fm", "media", "api", "Scrobbles et historique musical", "history", "Scrobble"],
  ["discord", "Discord", "social", "oauth", "Presence, activité et serveurs autorises", "messages-square", "Presence"],
  ["reddit", "Reddit", "social", "oauth", "Communautes et activité", "message-circle", "Publication"],
  ["bluesky", "Bluesky", "social", "api", "Flux et publications", "cloud", "Publication"],
  ["steam", "Steam", "gaming", "api", "Jeux, succès et temps de jeu", "gamepad-2", "Jeu lance"],
  ["riot", "Riot Games", "gaming", "api", "Valorant, League of Legends et TFT", "swords", "Partie terminée"],
  ["minecraft", "Minecraft", "gaming", "oauth", "Profil et services Microsoft autorises", "box", "Session"],
  ["tracker-gg", "Tracker.gg", "gaming", "restricted", "Rangs et matchs selon accès partenaire", "chart-no-axes-combined", "Classement mis a jour"],
  ["google-calendar", "Google Calendar", "productivity", "oauth", "Agenda et prochains événements", "calendar-days", "Événement"],
  ["google-drive", "Google Drive", "productivity", "oauth", "Fichiers et activité récente", "hard-drive", "Fichier modifié"],
  ["notion", "Notion", "productivity", "oauth", "Pages et bases autorisees", "notebook-tabs", "Page modifiée"],
  ["todoist", "Todoist", "productivity", "oauth", "Taches et projets", "circle-check-big", "Tache terminée"],
  ["linear", "Linear", "productivity", "oauth", "Issues, projets et cycles", "workflow", "Issue modifiée"],
  ["clickup", "ClickUp", "productivity", "oauth", "Taches et espaces", "list-todo", "Tache modifiée"],
  ["jira", "Jira", "productivity", "oauth", "Issues et projets", "panels-top-left", "Issue modifiée"],
  ["email", "Email", "productivity", "oauth", "Messages et priorités", "mail", "Nouveau message"],
  ["rss", "RSS", "productivity", "feed", "Flux et nouvelles publications", "rss", "Nouvel article"],
  ["weather", "Météo", "productivity", "api", "Conditions et prévisions", "cloud-sun", "Alerte météo"],
  ["github", "GitHub", "development", "oauth", "Commits, Pull Requests et Issues", "github", "Commit"],
  ["gitlab", "GitLab", "development", "oauth", "Commits, Merge Requests et Issues", "git-fork", "Commit"],
  ["obsidian", "Obsidian", "development", "local", "Vault et notes locales", "gem", "Note modifiée"],
  ["vscode", "VS Code", "development", "local", "Sessions et espaces de travail", "code-2", "Session de code"],
  ["fitbit", "Fitbit", "health", "oauth", "Activité et indicateurs de sante", "heart-pulse", "Objectif atteint"],
  ["lm-studio", "LM Studio", "ai", "local", "Modeles locaux et sessions", "monitor-cog", "Execution locale"],
  ["ollama", "Ollama", "ai", "local", "Modeles locaux et activité", "bot", "Execution locale"],
  ["openai", "OpenAI", "ai", "api", "Modeles et executions via un relais sécurisé", "sparkles", "Execution terminée"],
  ["anthropic", "Anthropic", "ai", "api", "Modeles et executions via un relais sécurisé", "brain-circuit", "Execution terminée"],
  ["gemini", "Gemini", "ai", "api", "Modeles et executions via un relais sécurisé", "gem", "Execution terminée"],
  ["groq", "Groq", "ai", "api", "Modeles et executions via un relais sécurisé", "gauge", "Execution terminée"]
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
    disabled: input.disabled === true,
    guideKind: input.guideKind || null,
    live: input.live === true,
    credential: input.credential ? Object.freeze({ provider: input.credential.provider, fields: Object.freeze([...input.credential.fields]) }) : null
  });
}

const METHOD_PRESETS = Object.freeze({
  oauth: Object.freeze([
    method({ id: "oauth-secure", label: "OAuth sécurisé", summary: "Autorisation officielle avec permissions minimales et echange côté serveur.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "OAuth 2.0", badges: ["OAuth", "Cloud"], capabilities: ["Synchronisation autorisee", "Actualisation automatique", "Activity Hub"], permissions: ["Identite de compte", "Données sélectionnées", "Accès révocable"] }),
    method({ id: "public-readonly", label: "Lecture publique", summary: "Utilisé uniquement les données rendues publiques par le compte.", availability: "public", quality: "Essentielle", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Profil public", "Données publiques"], permissions: ["Aucune permission privée"], field: { type: "url", label: "Adresse publique", placeholder: "https://...", required: true } })
  ]),
  api: Object.freeze([
    method({ id: "server-connector", label: "Connecteur serveur", summary: "Les appels et données sensibles restent dans un relais ETHONE sécurisé.", availability: "backend", recommended: true, quality: "Complète", badges: ["Cloud"], capabilities: ["Synchronisation planifiee", "Activity Hub", "Diagnostic serveur"], permissions: ["Accès limite au service", "Accès révocable"] }),
    method({ id: "public-readonly", label: "Lecture publique", summary: "Fonctions publiques uniquement, sans contrôles ni données privées.", availability: "public", quality: "Essentielle", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Données publiques"], permissions: ["Aucune permission privée"], field: { type: "url", label: "Adresse publique", placeholder: "https://...", required: true } })
  ]),
  local: Object.freeze([
    method({ id: "local-bridge", label: "Bridge local", summary: "Connexion sur votre machine, sans exposer le service sur Internet.", availability: "local", recommended: true, quality: "Locale", badges: ["Local", "Temps reel"], capabilities: ["État local", "Mises a jour directes", "Activity Hub"], permissions: ["Accès local explicite"], field: { type: "url", label: "Adresse locale", placeholder: "http://127.0.0.1:...", required: true } })
  ]),
  feed: Object.freeze([
    method({ id: "public-feed", label: "Flux public", summary: "Lecture d'une URL de flux publique avec validation avant activation.", availability: "public", recommended: true, quality: "Lecture seule", apiVersion: "RSS / Atom", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Nouveaux articles", "Historique recent", "Activity Hub"], permissions: ["Lecture du flux indique"], field: { type: "url", label: "Adresse RSS ou Atom", placeholder: "https://example.com/feed.xml", required: true } })
  ]),
  restricted: Object.freeze([
    method({ id: "approved-access", label: "Accès approuvé", summary: "Cette intégration depend d'une offre, d'un partenariat ou d'une validation du fournisseur.", availability: "restricted", recommended: true, quality: "Sous conditions", badges: ["Accès limite", "Cloud"], capabilities: ["Selon autorisation du fournisseur"], permissions: ["Definies lors de l'approbation"], disabled: true })
  ]),
  limited: Object.freeze([
    method({ id: "official-only", label: "Application officielle", summary: "ETHONE ne propose pas de connecteur tant qu'une API personnelle fiable n'existe pas.", availability: "limited", recommended: true, quality: "Indisponible", badges: ["Lecture seule", "Limite"], capabilities: ["Lien vers le service officiel"], permissions: ["Aucune"], disabled: true })
  ])
});

const SPECIAL_METHODS = Object.freeze({
  spotify: Object.freeze([
    method({ id: "oauth-pkce", label: "Spotify OAuth", summary: "Connexion via l'application ETHONE, pour la lecture actuelle via l'API officielle Spotify.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "Spotify Web API (PKCE)", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Lecture actuelle", "Contrôle de lecture"], permissions: ["État de lecture Spotify"] }),
    method({ id: "discord-lanyard", label: "Discord + Lanyard", summary: "Presence Spotify publique exposee par Discord, sans contrôle de lecture.", availability: "bridge", quality: "Temps reel", apiVersion: "Lanyard", live: true, badges: ["Simple", "Via Discord", "Via Lanyard", "Lecture seule"], capabilities: ["Morceau actuel", "Artiste", "Album", "Pochette", "Progression"], permissions: ["Presence Discord publique"], dependency: "discord", field: { type: "text", label: "Identifiant Discord public", placeholder: "123456789012345678", required: true } }),
    method({ id: "lastfm-history", label: "Last.fm", summary: "Historique musical et statistiques a partir des scrobbles Last.fm.", availability: "bridge", quality: "Historique", apiVersion: "Last.fm API", live: true, badges: ["Via Last.fm", "Lecture seule", "Cloud"], capabilities: ["Historique", "Top artistes", "Top morceaux", "Statistiques"], permissions: ["Profil Last.fm public ou autorise"], dependency: "lastfm", field: { type: "text", label: "Nom d'utilisateur Last.fm", placeholder: "Votre profil public", required: true } }),
    method({ id: "public-profile", label: "Profil public", summary: "Apercu limite a une URL de profil ou de playlist publique.", availability: "public", quality: "Essentielle", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Profil public", "Playlist publique"], permissions: ["Aucune permission privée"], field: { type: "url", label: "Profil ou playlist publique", placeholder: "https://open.spotify.com/...", required: true } })
  ]),
  discord: Object.freeze([
    method({ id: "lanyard-presence", label: "Presence publique", summary: "Statut et activité Discord en lecture seule, juste avec votre identifiant.", availability: "public", recommended: true, quality: "Temps reel", apiVersion: "Lanyard", live: true, badges: ["Simple", "Temps reel", "Lecture seule"], capabilities: ["Statut", "Activité", "Spotify expose"], permissions: ["Identifiant Discord public"], field: { type: "text", label: "Identifiant Discord", placeholder: "123456789012345678", required: true } }),
    method({ id: "oauth-secure", label: "Discord OAuth", summary: "Pour lister vos serveurs autorises en plus de la presence. Necessite le backend ETHONE.", availability: "backend", quality: "Complète", apiVersion: "Discord OAuth2", badges: ["OAuth", "Cloud"], capabilities: ["Profil", "Serveurs autorises", "Activity Hub"], permissions: ["Identify", "Guilds selon besoin"] })
  ]),
  minecraft: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Récupère votre pseudo, identifiant et skin via l'API publique Mojang. Aucun compte Microsoft requis.", availability: "public", recommended: true, live: true, quality: "Temps reel", apiVersion: "Mojang API", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Pseudo vérifié", "Skin actuel"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Pseudo Minecraft", placeholder: "Notch", required: true } })
  ]),
  twitch: Object.freeze([
    method({ id: "public-profile", label: "Chaine publique", summary: "Statut Live et derniers streams via l'API Twitch publique, juste avec votre pseudo.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "Twitch Helix", live: true, badges: ["Simple", "Lecture seule"], capabilities: ["Statut Live", "Derniers streams"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Pseudo Twitch", placeholder: "votre_pseudo", required: true }, credential: { provider: "twitch", fields: [{ key: "clientId", label: "Client ID Twitch", placeholder: "abcdef123456..." }, { key: "clientSecret", label: "Client Secret Twitch", placeholder: "•••••••••••••" }] } }),
    method({ id: "oauth-secure", label: "Twitch OAuth", summary: "Pour les abonnements et données privées. Necessite le backend ETHONE.", availability: "backend", quality: "Standard", apiVersion: "Twitch OAuth", badges: ["OAuth", "Cloud"], capabilities: ["Chaines", "Activité", "Abonnements"], permissions: ["Scopes OAuth sélectionnés"] })
  ]),
  reddit: Object.freeze([
    method({ id: "oauth-secure", label: "Reddit OAuth", summary: "Connexion via l'application ETHONE, pour votre profil et votre dernière publication.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "Reddit OAuth2", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Profil", "Dernière publication", "Karma"], permissions: ["identity", "history"] }),
    method({ id: "public-profile", label: "Profil public", summary: "Publications et commentaires publics via l'API Reddit, juste avec votre nom d'utilisateur.", availability: "public", quality: "Essentielle", apiVersion: "Reddit API", badges: ["Simple", "Lecture seule"], capabilities: ["Publications publiques", "Commentaires publics"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Nom d'utilisateur Reddit", placeholder: "votre_pseudo", required: true } })
  ]),
  bluesky: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Publications publiques via le protocole AT, juste avec votre identifiant.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "AT Protocol", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Publications publiques"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Identifiant Bluesky", placeholder: "vous.bsky.social", required: true } })
  ]),
  youtube: Object.freeze([
    method({ id: "oauth-secure", label: "Google OAuth", summary: "Connexion via l'application ETHONE, pour votre chaine et votre dernière video publiée.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "YouTube Data API v3", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Chaine", "Dernière video", "Abonnes"], permissions: ["Lecture YouTube (youtube.readonly)"] }),
    method({ id: "public-channel", label: "Chaine publique", summary: "Dernières videos et activité publique de la chaine, juste avec son identifiant.", availability: "public", quality: "Essentielle", apiVersion: "YouTube Data API", badges: ["Simple", "Lecture seule"], capabilities: ["Dernières videos", "Activité publique"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Chaine YouTube", placeholder: "@votre-chaine", required: true } })
  ]),
  lastfm: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Scrobbles et historique musical via l'API Last.fm, juste avec votre nom d'utilisateur.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "Last.fm API", live: true, badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Scrobbles", "Historique musical"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Nom d'utilisateur Last.fm", placeholder: "votre_pseudo", required: true }, credential: { provider: "lastfm", fields: [{ key: "apiKey", label: "Clé API Last.fm", placeholder: "0123456789abcdef0123456789abcdef" }] } })
  ]),
  weather: Object.freeze([
    method({ id: "public-location", label: "Lieu public", summary: "Conditions et prévisions via Open-Météo, une API météo publique et gratuite.", availability: "public", recommended: true, live: true, quality: "Temps reel", apiVersion: "Open-Météo", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Conditions actuelles", "Prévisions"], permissions: ["Aucune permission privée"], field: { type: "text", label: "Ville", placeholder: "Paris, France", required: true } })
  ]),
  riot: Object.freeze([
    method({ id: "server-connector", label: "Riot via Tracker.gg", summary: "Valorant et League of Legends via l'API Tracker.gg, avec un seul Riot ID.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "Tracker.gg API", guideKind: "apikey", live: true, badges: ["Cloud"], capabilities: ["Statistiques Valorant", "Statistiques League of Legends"], permissions: ["Données exposees par Tracker.gg"], field: { type: "text", label: "Riot ID (Nom#Tag)", placeholder: "Pseudo#EUW", required: true }, credential: { provider: "tracker", fields: [{ key: "apiKey", label: "Clé API Tracker.gg", placeholder: "TRN-..." }] } })
  ]),
  "tracker-gg": Object.freeze([
    method({ id: "server-connector", label: "Tracker.gg API", summary: "Rangs et matchs Apex Legends via une clé API Tracker.gg conservee côté Worker.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "Tracker.gg API", guideKind: "apikey", live: true, badges: ["Cloud"], capabilities: ["Rangs", "Matchs récents", "Statistiques"], permissions: ["Données exposees par Tracker.gg"], field: { type: "text", label: "Identifiant (Origin, PSN, Xbox)", placeholder: "VotrePseudo", required: true }, credential: { provider: "tracker", fields: [{ key: "apiKey", label: "Clé API Tracker.gg", placeholder: "TRN-..." }] } })
  ]),
  openai: Object.freeze([
    method({ id: "server-connector", label: "Clé API OpenAI", summary: "Executions via une clé API conservee uniquement côté Worker ETHONE.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "OpenAI API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Clé limitee au Worker ETHONE"] })
  ]),
  anthropic: Object.freeze([
    method({ id: "server-connector", label: "Clé API Anthropic", summary: "Executions via une clé API conservee uniquement côté Worker ETHONE.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "Anthropic API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Clé limitee au Worker ETHONE"] })
  ]),
  gemini: Object.freeze([
    method({ id: "server-connector", label: "Clé API Gemini", summary: "Executions via une clé API conservee uniquement côté Worker ETHONE.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "Gemini API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Clé limitee au Worker ETHONE"] })
  ]),
  groq: Object.freeze([
    method({ id: "server-connector", label: "Clé API Groq", summary: "Executions via une clé API conservee uniquement côté Worker ETHONE.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "Groq API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Clé limitee au Worker ETHONE"] })
  ]),
  github: Object.freeze([
    method({ id: "oauth-secure", label: "GitHub OAuth App", summary: "Connexion via l'application ETHONE, pour le profil et l'activité publique récente.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "GitHub OAuth", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Profil", "Depots publics", "Activité récente"], permissions: ["Lecture du profil (read:user)"] }),
    method({ id: "github-app", label: "GitHub App", summary: "Permissions fines, installation révocable et accès limite aux depots choisis.", availability: "backend", quality: "Complète", apiVersion: "GitHub App API", badges: ["Cloud", "Temps reel"], capabilities: ["Commits", "Pull Requests", "Issues", "Webhooks"], permissions: ["Depots sélectionnés", "Metadonnees", "Lecture ou ecriture explicite"] }),
    method({ id: "public-profile", label: "Profil public", summary: "Contributions et depots publics, sans accès privé.", availability: "public", quality: "Lecture seule", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Profil public", "Depots publics", "Contributions"], permissions: ["Aucune permission privée"], field: { type: "url", label: "Profil GitHub public", placeholder: "https://github.com/utilisateur", required: true } })
  ]),
  "google-calendar": Object.freeze([
    method({ id: "oauth-secure", label: "Google OAuth", summary: "Connexion via l'application ETHONE, pour les prochains événements de votre agenda principal.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "Google Calendar API", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Prochain événement", "Agenda principal"], permissions: ["Lecture agenda (calendar.readonly)"] }),
    method({ id: "ics-readonly", label: "Calendrier ICS", summary: "Abonnement a une adresse ICS partagee, strictement en lecture seule.", availability: "public", quality: "Lecture seule", apiVersion: "iCalendar", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Événements publiés", "Actualisation périodique"], permissions: ["Lecture de l'agenda partage"], field: { type: "url", label: "Adresse ICS partagee", placeholder: "https://.../calendar.ics", required: true } })
  ]),
  "google-drive": Object.freeze([
    method({ id: "oauth-secure", label: "Google OAuth", summary: "Connexion via l'application ETHONE, pour le dernier fichier modifié dans votre Drive.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "Google Drive API v3", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Dernier fichier modifié", "Fichiers récents"], permissions: ["Lecture Drive (drive.readonly)"] })
  ]),
  notion: Object.freeze([
    method({ id: "public-oauth", label: "Connexion publique", summary: "Connexion via l'application ETHONE. Dernière page ou base modifiée parmi celles partagees.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "Notion API", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Dernière page modifiée", "Contenu partage"], permissions: ["Contenu explicitement partage (Read content)"] }),
    method({ id: "internal-backend", label: "Connexion interne", summary: "Pour un seul workspace, avec identifiants conserves uniquement côté serveur.", availability: "backend", quality: "Workspace", apiVersion: "Notion API", badges: ["Cloud", "Workspace"], capabilities: ["Pages partagees", "Bases partagees"], permissions: ["Contenu explicitement partage"] })
  ]),
  todoist: Object.freeze([
    method({ id: "oauth-secure", label: "Todoist OAuth", summary: "Connexion via l'application ETHONE, pour la prochaine tache et le nombre de taches ouvertes.", availability: "backend", recommended: true, live: true, quality: "Temps reel", apiVersion: "Todoist REST API", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Prochaine tache", "Taches ouvertes"], permissions: ["Lecture des taches (data:read)"] })
  ]),
  steam: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Jeux et activité visibles selon les réglages de confidentialité Steam.", availability: "public", recommended: true, quality: "Lecture seule", apiVersion: "Steam Community", live: true, badges: ["Simple", "Lecture seule"], capabilities: ["Jeu actuel", "Bibliotheque publique", "Temps de jeu public"], permissions: ["Profil Steam public"], field: { type: "text", label: "Profil, pseudo ou identifiant Steam", placeholder: "https://steamcommunity.com/id/... ou votre pseudo", required: true } }),
    method({ id: "server-connector", label: "Steam Web API", summary: "Enrichissement via un relais serveur et l'API officielle.", availability: "backend", quality: "Complète", apiVersion: "Steam Web API", guideKind: "apikey", live: true, badges: ["Cloud"], capabilities: ["Profil", "Jeux", "Statistiques disponibles"], permissions: ["Données exposees par Steam"], credential: { provider: "steam", fields: [{ key: "apiKey", label: "Clé API Steam Web API", placeholder: "0123456789ABCDEF0123456789ABCDEF" }] } })
  ]),
  email: Object.freeze([
    method({ id: "provider-oauth", label: "OAuth fournisseur", summary: "Connexion recommandee pour Gmail, Outlook et fournisseurs compatibles.", availability: "backend", recommended: true, quality: "Complète", apiVersion: "OAuth 2.0", badges: ["OAuth", "Cloud"], capabilities: ["Nouveaux messages", "Priorités", "Activity Hub"], permissions: ["Lecture des messages sélectionnés"] }),
    method({ id: "imap-backend", label: "IMAP via backend", summary: "Compatibilité etendue avec traitement exclusivement côté serveur.", availability: "backend", quality: "Compatible", apiVersion: "IMAP", badges: ["Cloud"], capabilities: ["Boite de reception", "Dossiers"], permissions: ["Lecture limitee aux dossiers choisis"] })
  ]),
  "lm-studio": Object.freeze([method({ id: "local-openai", label: "Serveur local compatible", summary: "Connexion directe au serveur local compatible OpenAI de LM Studio.", availability: "local", recommended: true, quality: "Locale", apiVersion: "OpenAI compatible", endpoint: "http://127.0.0.1:1234/v1", badges: ["Local", "Sans secret"], capabilities: ["Modeles locaux", "Executions locales"], permissions: ["Accès boucle locale"], field: { type: "url", label: "Adresse locale LM Studio", placeholder: "http://127.0.0.1:1234/v1", required: true } })]),
  ollama: Object.freeze([method({ id: "local-http", label: "API locale Ollama", summary: "Connexion a Ollama sur la boucle locale, sans exposition Internet.", availability: "local", recommended: true, quality: "Locale", apiVersion: "Ollama API", endpoint: "http://127.0.0.1:11434", badges: ["Local", "Sans secret"], capabilities: ["Modeles locaux", "Executions locales"], permissions: ["Accès boucle locale"], field: { type: "url", label: "Adresse locale Ollama", placeholder: "http://127.0.0.1:11434", required: true } })])
});

const OFFICIAL_HOME = Object.freeze({
  spotify: "https://developer.spotify.com/", plex: "https://www.plex.tv/", jellyfin: "https://jellyfin.org/docs/", emby: "https://dev.emby.media/", youtube: "https://developers.google.com/youtube/v3", twitch: "https://dev.twitch.tv/docs/", lastfm: "https://www.last.fm/api", discord: "https://docs.discord.com/developers/", reddit: "https://www.reddit.com/dev/api/", bluesky: "https://docs.bsky.app/", steam: "https://steamcommunity.com/dev", riot: "https://developer.riotgames.com/", minecraft: "https://learn.microsoft.com/minecraft/creator/", "tracker-gg": "https://tracker.gg/developers", "google-calendar": "https://developers.google.com/workspace/calendar/api", "google-drive": "https://developers.google.com/drive/api/guides/about-sdk", notion: "https://developers.notion.com/", todoist: "https://developer.todoist.com/", linear: "https://developers.linear.app/docs/", clickup: "https://developer.clickup.com/", jira: "https://developer.atlassian.com/cloud/jira/platform/", email: "https://developers.google.com/gmail/api", rss: "https://www.rssboard.org/rss-specification", weather: "https://open-meteo.com/en/docs", github: "https://docs.github.com/en/apps", gitlab: "https://docs.gitlab.com/integration/oauth_provider/", obsidian: "https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin", vscode: "https://code.visualstudio.com/api", fitbit: "https://dev.fitbit.com/build/reference/web-api/", "lm-studio": "https://lmstudio.ai/docs/developer", ollama: "https://docs.ollama.com/api", openai: "https://platform.openai.com/docs/", anthropic: "https://docs.anthropic.com/", gemini: "https://ai.google.dev/gemini-api/docs", groq: "https://console.groq.com/docs"
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
    { label: "Créer une OAuth App GitHub", url: "https://github.com/settings/applications/new", kind: "Guide" },
    { label: "Paramètrès developpeur", url: "https://github.com/settings/developers", kind: "Console" }
  ]),
  "google-calendar": Object.freeze([
    { label: "Créer des identifiants OAuth", url: "https://console.cloud.google.com/apis/credentials", kind: "Guide" },
    { label: "Activer l'API Calendar", url: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com", kind: "Console" }
  ]),
  notion: Object.freeze([
    { label: "Guide d'autorisation", url: "https://developers.notion.com/guides/get-started/authorization", kind: "Documentation" },
    { label: "Mes intégrations", url: "https://www.notion.so/profile/integrations", kind: "Console" }
  ]),
  todoist: Object.freeze([
    { label: "Guide OAuth", url: "https://developer.todoist.com/guides/#oauth", kind: "Documentation" },
    { label: "Console App Management", url: "https://app.todoist.com/app/settings/integrations/app-management", kind: "Console" }
  ]),
  twitch: Object.freeze([
    { label: "Authentification Twitch", url: "https://dev.twitch.tv/docs/authentication/", kind: "Documentation" },
    { label: "Console Twitch", url: "https://dev.twitch.tv/console/apps", kind: "Console" }
  ]),
  lastfm: Object.freeze([
    { label: "Authentification Last.fm", url: "https://www.last.fm/api/authentication", kind: "Documentation" },
    { label: "Comptes API", url: "https://www.last.fm/api/accounts", kind: "Console" }
  ]),
  riot: Object.freeze([
    { label: "Tracker.gg Developers", url: "https://tracker.gg/developers", kind: "Console" }
  ]),
  reddit: Object.freeze([
    { label: "Reddit App Préférences", url: "https://www.reddit.com/prefs/apps", kind: "Console" },
    { label: "Documentation OAuth2 Reddit", url: "https://github.com/reddit-archive/reddit/wiki/OAuth2", kind: "Documentation" }
  ]),
  youtube: Object.freeze([
    { label: "Google Cloud Console (même projet que Calendar)", url: "https://console.cloud.google.com/apis/credentials", kind: "Console" },
    { label: "Activer YouTube Data API v3", url: "https://console.cloud.google.com/apis/library/youtube.googleapis.com", kind: "Console" }
  ]),
  "google-drive": Object.freeze([
    { label: "Google Cloud Console (même projet que Calendar)", url: "https://console.cloud.google.com/apis/credentials", kind: "Console" },
    { label: "Activer Google Drive API", url: "https://console.cloud.google.com/apis/library/drive.googleapis.com", kind: "Console" }
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

const REDIRECT_NOTE = "En attendant que le callback OAuth d'ETHONE soit branche, utilisez https://ethone.dev/ comme valeur temporaire : vous pourrez la corriger plus tard sans recreer l'application.";

const SPECIAL_GUIDES = Object.freeze({
  spotify: Object.freeze({
    "oauth-pkce": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir le Dashboard Spotify for Developers", "Connectez-vous avec votre compte Spotify puis cliquez sur \"Create app\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre (ex : \"ETHONE\"), description libre. Cochez \"Web API\" dans les API utilisées."),
      guideStep("redirect", "Ajouter la Redirect URI", "Cette valeur exacte, sans rien ajouter derriere.", { copyValue: "https://ethone.dev/" }),
      guideStep("id", "Copier le Client ID", "Visible directement dans Settings. Aucun Client Secret n'est nécessaire : ETHONE utilisé le flux PKCE, conçu pour ne jamais exposer de secret."),
      guideStep("users", "Ajouter les utilisateurs autorises", "Tant que l'app reste en mode \"Development\", ajoutez chaque compte Spotify (le votre et vos invites) dans Settings > User Management."),
      guideStep("connect", "Se connecter avec Spotify", "L'application ETHONE est prete : cliquez \"Se connecter avec Spotify\" pour autoriser votre propre compte.")
    ])
  }),
  discord: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir le Discord Developer Portal", "Connectez-vous puis cliquez sur \"New Application\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre (ex : \"ETHONE\"). Dans l'onglet OAuth2, notez le Client ID."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "identify (profil) et guilds (liste des serveurs, uniquement si vous voulez les afficher).", { copyValue: "identify guilds" }),
      guideStep("secret", "Copier le Client Secret", "Dans l'onglet OAuth2, section Client Secret, cliquez \"Reset Secret\" puis copiez la valeur affichee.")
    ])
  }),
  twitch: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la Twitch Developer Console", "Connectez-vous puis \"Register Your Application\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre, catégorie \"Application Intégration\", client type \"Confidential\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "user:read:subscriptions et user:read:follows selon ce que vous voulez afficher.", { copyValue: "user:read:subscriptions user:read:follows" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Le Client ID est visible directement. Cliquez \"New Secret\" pour generer le Client Secret.")
    ]),
    "public-profile": (resource) => Object.freeze([
      guideStep("info", "Clé optionnelle", "Votre pseudo suffit pour tester avec la clé partagee d'ETHONE. Créez votre propre application Twitch si vous voulez votre propre quota, indépendant des autres utilisateurs.", { resource }),
      guideStep("docs", "Ouvrir la Twitch Developer Console", "Connectez-vous puis \"Register Your Application\"."),
      guideStep("app", "Nommer l'application", "Nom libre, catégorie \"Application Intégration\", client type \"Confidential\". Aucune Redirect URI reelle n'est utilisée pour cette méthode."),
      guideStep("keys", "Copier Client ID et Client Secret", "Le Client ID est visible directement. Cliquez \"New Secret\" pour generer le Client Secret."),
      guideStep("paste", "Coller vos identifiants dans ETHONE", "Utilisez le champ \"Votre propre clé\" ci-dessous. Ils sont stockes dans votre compte Supabase, visibles et modifiables seulement par vous.")
    ])
  }),
  reddit: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les Reddit App Préférences", "Connectez-vous puis \"create another app...\" en bas de page.", { resource }),
      guideStep("app", "Configurer le type d'application", "Choisissez \"web app\" (pas \"script\" ni \"installed app\")."),
      guideStep("redirect", "Ajouter la Redirect URI", "Cette valeur exacte, sans rien ajouter derriere.", { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "identity (profil) et history (activité).", { copyValue: "identity history" }),
      guideStep("id", "Copier l'identifiant", "Affiche directement sous le nom de l'application."),
      guideStep("secret", "Copier le secret", "Affiche a côté de l'identifiant."),
      guideStep("wrangler", "Secret conserve côté Worker", "L'identifiant sera configure dans ETHONE une fois transmis. Le secret ne se colle jamais dans le navigateur : il reste enregistre comme secret Worker (REDDIT_CLIENT_SECRET)."),
      guideStep("connect", "Se connecter avec Reddit", "Une fois l'identifiant configure dans ETHONE, cliquez \"Se connecter avec Reddit\" pour autoriser votre propre compte.")
    ])
  }),
  youtube: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console (même projet que Google Calendar)", "Dans le projet déjà utilisé pour Google Calendar, activez \"YouTube Data API v3\" dans la bibliotheque d'API.", { resource }),
      guideStep("scopes", "Ajouter le scope YouTube a l'écran de consentement", "OAuth consent screen > Scopes > Add or remove scopes.", { copyValue: "https://www.googleapis.com/auth/youtube.readonly" }),
      guideStep("id", "Aucun nouvel identifiant nécessaire", "Le même Client ID et Client Secret que Google Calendar fonctionnent pour YouTube : ETHONE les reutilise automatiquement."),
      guideStep("connect", "Se connecter avec YouTube", "L'application ETHONE est prete : cliquez \"Se connecter avec YouTube\" pour autoriser votre propre compte.")
    ])
  }),
  "google-drive": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console (même projet que Google Calendar)", "Dans le projet déjà utilisé pour Google Calendar, activez \"Google Drive API\" dans la bibliotheque d'API.", { resource }),
      guideStep("scopes", "Ajouter le scope Drive a l'écran de consentement", "OAuth consent screen > Scopes > Add or remove scopes.", { copyValue: "https://www.googleapis.com/auth/drive.readonly" }),
      guideStep("id", "Aucun nouvel identifiant nécessaire", "Le même Client ID et Client Secret que Google Calendar fonctionnent pour Drive : ETHONE les reutilise automatiquement."),
      guideStep("connect", "Se connecter avec Google Drive", "L'application ETHONE est prete : cliquez \"Se connecter avec Google Drive\" pour autoriser votre propre compte.")
    ])
  }),
  "google-calendar": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Créez un projet (ou reutilisez-en un), puis activez \"Google Calendar API\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'écran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilisé que par vous et vos invites."),
      guideStep("app", "Créer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter l'URI de redirection autorisee", "Cette valeur exacte, sans rien ajouter derriere.", { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/calendar.readonly", { copyValue: "https://www.googleapis.com/auth/calendar.readonly" }),
      guideStep("id", "Copier le Client ID et le Client Secret", "Affiches après la creation de l'identifiant OAuth."),
      guideStep("wrangler", "Client Secret conserve côté Worker", "Le Client ID est déjà configure dans ETHONE. Le Client Secret ne se colle jamais dans le navigateur : il reste enregistre comme secret Worker (GOOGLE_CLIENT_SECRET)."),
      guideStep("connect", "Se connecter avec Google", "L'application ETHONE est prete : cliquez \"Se connecter avec Google\" pour autoriser votre propre compte.")
    ])
  }),
  email: Object.freeze({
    "provider-oauth": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Créez un projet (ou reutilisez-en un), puis activez \"Gmail API\" dans la bibliotheque d'API. Pour Outlook, utilisez plutot le portail Azure App registrations.", { resource }),
      guideStep("consent", "Configurer l'écran de consentement OAuth", "Type \"External\", renseignez le nom de l'app."),
      guideStep("app", "Créer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/gmail.readonly", { copyValue: "https://www.googleapis.com/auth/gmail.readonly" })
    ])
  }),
  github: Object.freeze({
    "github-app": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les paramètrès developpeur GitHub", "Settings > Developer settings > GitHub Apps > \"New GitHub App\".", { resource }),
      guideStep("app", "Configurer l'application", "Nom libre, Homepage URL: https://ethone.dev, décochez Webhook si vous ne voulez pas d'événements en temps reel."),
      guideStep("redirect", "Ajouter la Callback URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("permissions", "Permissions du depot", "Contents: Read-only, Metadata: Read-only, Pull requests: Read-only, Issues: Read-only."),
      guideStep("install", "Installer l'application", "Une fois créée, installez-la sur les depots que vous voulez suivre, puis notez l'App ID et générez une clé privée (.pem).")
    ]),
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les paramètrès developpeur GitHub", "Settings > Developer settings > OAuth Apps > \"New OAuth App\".", { resource }),
      guideStep("app", "Configurer l'application", "Nom libre, Homepage URL: https://ethone.dev."),
      guideStep("redirect", "Ajouter l'Authorization callback URL", "Cette valeur exacte, sans rien ajouter derriere.", { copyValue: "https://ethone.dev/" }),
      guideStep("id", "Copier le Client ID", "Visible directement après la creation de l'application."),
      guideStep("secret", "Generer le Client Secret", "Cliquez \"Generate a new client secret\" et copiez la valeur affichee une seule fois."),
      guideStep("wrangler", "Client Secret conserve côté Worker", "Le Client ID est déjà configure dans ETHONE. Le Client Secret ne se colle jamais dans le navigateur : il reste enregistre comme secret Worker (GITHUB_CLIENT_SECRET)."),
      guideStep("connect", "Se connecter avec GitHub", "L'application ETHONE est prete : cliquez \"Se connecter avec GitHub\" pour autoriser votre propre compte.")
    ])
  }),
  notion: Object.freeze({
    "public-oauth": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir My Integrations sur Notion", "Connectez-vous puis \"New integration\".", { resource }),
      guideStep("app", "Configurer l'intégration", "Type \"Public\" (nécessaire pour un flux OAuth), nom libre, associez un workspace."),
      guideStep("redirect", "Ajouter la Redirect URI", "Cette valeur exacte, sans rien ajouter derriere.", { copyValue: "https://ethone.dev/" }),
      guideStep("permissions", "Capacités a demander", "Read content uniquement. Ne cochez pas Insert/Update sauf besoin reel."),
      guideStep("id", "Copier le Client ID (OAuth client ID)", "Disponible dans l'onglet \"Distribution\" de l'intégration une fois publiée."),
      guideStep("secret", "Copier le Client Secret", "Affiche a côté du Client ID dans le même onglet \"Distribution\"."),
      guideStep("wrangler", "Client Secret conserve côté Worker", "Le Client ID est déjà configure dans ETHONE. Le Client Secret ne se colle jamais dans le navigateur : il reste enregistre comme secret Worker (NOTION_CLIENT_SECRET)."),
      guideStep("connect", "Se connecter avec Notion", "L'application ETHONE est prete : cliquez \"Se connecter avec Notion\" puis choisissez les pages a partager avec votre compte.")
    ]),
    "internal-backend": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir My Integrations sur Notion", "Connectez-vous puis \"New integration\".", { resource }),
      guideStep("app", "Configurer l'intégration", "Type \"Internal\" (pas de flux OAuth, un seul workspace), nom libre."),
      guideStep("permissions", "Capacités a demander", "Read content uniquement."),
      guideStep("keys", "Copier le jeton d'intégration interne", "Affiche une seule fois dans l'onglet \"Secrets\"."),
      guideStep("share", "Partager les pages", "Dans Notion, ouvrez chaque page a suivre > \"...\" > Connections > ajoutez votre intégration.")
    ])
  }),
  todoist: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir App Management sur Todoist", "Connectez-vous puis \"Create a new app\".", { resource }),
      guideStep("app", "Configurer l'application", "Nom libre, description libre."),
      guideStep("redirect", "Ajouter l'OAuth redirect URL", "Cette valeur exacte, sans rien ajouter derriere.", { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "data:read (lecture seule des taches).", { copyValue: "data:read" }),
      guideStep("id", "Copier le Client ID", "Affiche directement dans les paramètrès de l'application."),
      guideStep("secret", "Copier le Client Secret", "Affiche a côté du Client ID."),
      guideStep("wrangler", "Client Secret conserve côté Worker", "Le Client ID est déjà configure dans ETHONE. Le Client Secret ne se colle jamais dans le navigateur : il reste enregistre comme secret Worker (TODOIST_CLIENT_SECRET)."),
      guideStep("connect", "Se connecter avec Todoist", "L'application ETHONE est prete : cliquez \"Se connecter avec Todoist\" pour autoriser votre propre compte.")
    ])
  }),
  todoist: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la Todoist App Console", "Connectez-vous puis \"Create a new app\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre, description libre."),
      guideStep("redirect", "Ajouter l'OAuth redirect URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "data:read (lecture seule des taches et projets).", { copyValue: "data:read" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles directement dans les paramètrès de l'app.")
    ])
  }),
  linear: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les paramètrès API Linear", "Settings > API > OAuth Applications > \"Create new\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre, icône facultative."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "read (lecture seule des issues, projets et cycles).", { copyValue: "read" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles directement dans les paramètrès de l'app.")
    ])
  }),
  clickup: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les paramètrès d'application ClickUp", "Depuis votre Workspace : Settings > Apps > \"App name\" en bas de page.", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre. ClickUp n'utilisé pas de scopes granulaires : l'accès correspond a ce que votre propre compte peut voir."),
      guideStep("redirect", "Ajouter le Redirect URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles directement une fois l'application créée.")
    ])
  }),
  jira: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la console developpeur Atlassian", "Connectez-vous puis \"Create\" > \"OAuth 2.0 integration\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre. Dans Permissions, ajoutez l'API Jira platform REST."),
      guideStep("redirect", "Ajouter la Callback URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "read:jira-work (issues et projets en lecture seule).", { copyValue: "read:jira-work" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Dans l'onglet Settings de l'intégration.")
    ])
  }),
  gitlab: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les applications GitLab", "Depuis votre profil : Edit profile > Applications > \"Add new application\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "read_api (lecture seule via l'API) ou read_user pour juste le profil.", { copyValue: "read_api" }),
      guideStep("keys", "Copier Application ID et Secret", "Affiches une seule fois juste après la creation.")
    ])
  }),
  fitbit: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la Fitbit Developer Console", "Connectez-vous puis \"Register An App\".", { resource }),
      guideStep("app", "Configurer l'application", "OAuth 2.0 Application Type: \"Server\", nom libre."),
      guideStep("redirect", "Ajouter la Redirect URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "activity, heartrate et profile selon les indicateurs voulus.", { copyValue: "activity heartrate profile" }),
      guideStep("keys", "Copier OAuth 2.0 Client ID et Client Secret", "Visibles directement dans les paramètrès de l'app.")
    ])
  }),
  lastfm: Object.freeze({
    "public-profile": (resource) => Object.freeze([
      guideStep("info", "Clé optionnelle", "Votre nom d'utilisateur suffit pour tester avec la clé partagee d'ETHONE. Créez votre propre clé si vous voulez votre propre quota, indépendant des autres utilisateurs.", { resource }),
      guideStep("docs", "Ouvrir Last.fm API Accounts", "Connectez-vous puis \"Create API account\"."),
      guideStep("key", "Generer votre clé", "Nom d'application libre, aucune URL de callback nécessaire pour cette méthode."),
      guideStep("paste", "Coller votre clé dans ETHONE", "Utilisez le champ \"Votre propre clé\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
    ])
  }),
  steam: Object.freeze({
    "server-connector": (resource) => Object.freeze([
      guideStep("info", "Clé optionnelle", "La méthode \"Profil public\" fonctionne déjà sans clé. Cette méthode enrichit vos données via l'API officielle Steam et fonctionne avec la clé partagee d'ETHONE, ou la votre pour un quota indépendant.", { resource }),
      guideStep("docs", "Ouvrir la page des clés Steam Web API", "Connectez-vous avec votre compte Steam."),
      guideStep("key", "Generer votre clé", "Renseignez un nom de domaine (ethone.dev convient) et validez pour obtenir votre clé personnelle."),
      guideStep("paste", "Coller votre clé dans ETHONE", "Utilisez le champ \"Votre propre clé\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
    ])
  }),
  riot: Object.freeze({
    "server-connector": (resource) => Object.freeze([
      guideStep("id", "Un seul Riot ID pour les deux jeux", "Renseignez votre Riot ID complet (Pseudo#Tag, ex: rub19#boss) dans le champ ci-dessous. Il alimente a la fois la carte Valorant et la carte League of Legends dans Live Now."),
      guideStep("tracker", "Valorant et League of Legends via Tracker.gg", "Les statistiques des deux jeux passent par la même clé Tracker.gg que l'intégration Apex Legends. La clé partagee d'ETHONE est déjà utilisée.", { resource }),
      guideStep("paste", "Votre propre clé Tracker.gg (optionnel)", "Pour un quota indépendant des autres utilisateurs, collez votre propre clé Tracker.gg dans le champ \"Votre propre clé\" ci-dessous. Elle s'applique aussi a l'intégration Apex Legends.", { status: "blocked" })
    ])
  }),
  "tracker-gg": Object.freeze({
    "server-connector": (resource) => Object.freeze([
      guideStep("info", "Approbation manuelle requise", "Tracker.gg valide chaque demande d'accès API individuellement. En attendant, la clé partagee d'ETHONE reste utilisée.", { resource, status: "blocked" }),
      guideStep("docs", "Ouvrir Tracker.gg Developers", "Connectez-vous puis demandez un accès API pour votre propre usage."),
      guideStep("paste", "Coller votre clé dans ETHONE", "Une fois approuvée, utilisez le champ \"Votre propre clé\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
    ])
  }),
  weather: Object.freeze({
    "public-location": () => Object.freeze([
      guideStep("info", "Aucun compte nécessaire", "Open-Météo est une API météo publique et gratuite, sans clé ni inscription."),
      guideStep("city", "Renseigner votre ville", "Tapez le nom de votre ville dans le champ ci-dessous, idealement avec le pays pour eviter toute ambiguite (ex : \"Paris, France\").", { copyValue: "Paris, France" }),
      guideStep("verify", "Vérifier la préparation", "ETHONE récupère les coordonnees de la ville puis les conditions actuelles et les prévisions.")
    ])
  }),
  minecraft: Object.freeze({
    "public-profile": () => Object.freeze([
      guideStep("info", "Aucun compte Microsoft nécessaire", "Cette méthode utilisé l'API publique Mojang, en lecture seule, sans authentification Xbox Live."),
      guideStep("username", "Renseigner votre pseudo Minecraft", "Tapez votre pseudo exact (sensible a la casse) dans le champ ci-dessous.", { copyValue: "Notch" }),
      guideStep("verify", "Vérifier la préparation", "ETHONE retrouve votre identifiant unique (UUID) et votre skin actuel via l'API Mojang.")
    ])
  })
});

function specialGuideFor(integrationId, methodId) {
  return SPECIAL_GUIDES[integrationId]?.[methodId] || null;
}

export function setupGuide(integrationOrId, methodId) {
  const integration = typeof integrationOrId === "string" ? integrationById(integrationOrId) : integrationOrId;
  if (!integration) return Object.freeze([]);
  const selected = connectionMethod(integration, methodId);
  if (!selected) return Object.freeze([]);
  const [primaryResource = null] = officialResources(integration);

  if (selected.availability === "limited" || selected.availability === "restricted") {
    return Object.freeze([
      guideStep("availability", "Vérifier la disponibilité", selected.summary, { resource: primaryResource, status: "blocked" }),
      guideStep("wait", "Connecteur desactive proprement", "ETHONE n'activera pas une méthode non officielle ou non autorisee.", { status: "blocked" })
    ]);
  }

  const special = specialGuideFor(integration.id, selected.id);
  if (special) return special(primaryResource);

  if (selected.availability === "local") {
    return Object.freeze([
      guideStep("service", `Demarrer ${integration.name}`, "Activez le service uniquement sur votre machine et consultez sa documentation officielle.", { resource: primaryResource }),
      guideStep("endpoint", "Vérifier l'adresse locale", "L'adresse proposee reste sur la boucle locale et ne contient aucune donnée sensible.", { copyValue: selected.endpoint }),
      guideStep("permissions", "Limiter l'accès", "Autorisez uniquement les fonctions indispensables a ETHONE."),
      guideStep("verify", "Vérifier la préparation", "Le diagnostic ETHONE contrôle le navigateur, la méthode et la configuration locale.")
    ]);
  }

  if (selected.guideKind === "apikey") {
    return Object.freeze([
      guideStep("docs", "Lire la documentation", `Consultez la documentation officielle de ${integration.name} pour generer une cle API.`, { resource: primaryResource }),
      guideStep("key", "Generer une clé API dédiée", "Créez une clé reservee a ETHONE, avec le perimetre le plus restreint possible."),
      guideStep("backend", "Enregistrer la clé côté Worker", "La clé reste dans le Worker ETHONE et n'est jamais visible dans le navigateur."),
      guideStep("verify", "Vérifier la préparation", "ETHONE valide la configuration locale. Le test distant necessite que la clé soit enregistree côté Worker.")
    ]);
  }

  if (selected.availability === "public" || selected.availability === "bridge") {
    return Object.freeze([
      guideStep("source", "Ouvrir la source officielle", "Vérifiez que les données que vous souhaitez partager sont publiques.", { resource: primaryResource }),
      guideStep("scope", "Choisir le perimetre", `ETHONE utilisera seulement : ${selected.capabilities.join(", ")}.`),
      guideStep("privacy", "Controler la confidentialité", "Aucune donnée privée n'est demandee par cette méthode."),
      guideStep("verify", "Vérifier la préparation", "Le diagnostic ETHONE vérifié la route Worker sans simuler une connexion au service.")
    ]);
  }

  return Object.freeze([
    guideStep("docs", "Lire le guide officiel", "Ouvrez la documentation du fournisseur avant de créer l'intégration.", { resource: primaryResource }),
    guideStep("app", `Creer l'application ${integration.name}`, "Utilisez le tableau de bord officiel et demandez uniquement les permissions affichees par ETHONE."),
    guideStep("backend", "Configurer le relais sécurisé", "L'echange OAuth et les données sensibles doivent rester dans une Edge Function, un Worker ou un backend equivalent."),
    guideStep("consent", "Vérifier le consentement", `Permissions prevues : ${selected.permissions.join(", ")}.`),
    guideStep("verify", "Vérifier la préparation", "ETHONE valide les metadonnees locales. Le test distant restera indisponible tant que le backend n'est pas branche.")
  ]);
}
