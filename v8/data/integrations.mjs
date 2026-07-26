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
  ["threads", "Threads", "social", "restricted", "Acces soumis aux autorisations Meta", "message-circle", "Publication"],
  ["bluesky", "Bluesky", "social", "api", "Flux et publications", "cloud", "Publication"],
  ["steam", "Steam", "gaming", "api", "Jeux, succes et temps de jeu", "gamepad-2", "Jeu lance"],
  ["riot", "Riot Games", "gaming", "api", "Valorant, League of Legends et TFT", "swords", "Partie terminee"],
  ["epic-games", "Epic Games", "gaming", "restricted", "Integration reservee aux services Epic approuves", "panels-top-left", "Activite limitee"],
  ["battle-net", "Battle.net", "gaming", "oauth", "Jeux et activite Blizzard", "orbit", "Activite de jeu"],
  ["ubisoft-connect", "Ubisoft Connect", "gaming", "limited", "Aucune API personnelle publique adaptee", "shield", "Activite indisponible"],
  ["ea-app", "EA App", "gaming", "limited", "Aucune API personnelle publique adaptee", "gamepad-2", "Activite indisponible"],
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
    disabled: input.disabled === true,
    guideKind: input.guideKind || null,
    live: input.live === true,
    credential: input.credential ? Object.freeze({ provider: input.credential.provider, fields: Object.freeze([...input.credential.fields]) }) : null
  });
}

const METHOD_PRESETS = Object.freeze({
  oauth: Object.freeze([
    method({ id: "oauth-secure", label: "OAuth securise", summary: "Autorisation officielle avec permissions minimales et echange cote serveur.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "OAuth 2.0", badges: ["OAuth", "Cloud"], capabilities: ["Synchronisation autorisee", "Actualisation automatique", "Activity Hub"], permissions: ["Identite de compte", "Donnees selectionnees", "Acces revocable"] }),
    method({ id: "public-readonly", label: "Lecture publique", summary: "Utilise uniquement les donnees rendues publiques par le compte.", availability: "public", quality: "Essentielle", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Profil public", "Donnees publiques"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Adresse publique", placeholder: "https://...", required: true } })
  ]),
  api: Object.freeze([
    method({ id: "server-connector", label: "Connecteur serveur", summary: "Les appels et donnees sensibles restent dans un relais ETHONE securise.", availability: "backend", recommended: true, quality: "Complete", badges: ["Cloud"], capabilities: ["Synchronisation planifiee", "Activity Hub", "Diagnostic serveur"], permissions: ["Acces limite au service", "Acces revocable"] }),
    method({ id: "public-readonly", label: "Lecture publique", summary: "Fonctions publiques uniquement, sans controles ni donnees privees.", availability: "public", quality: "Essentielle", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Donnees publiques"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Adresse publique", placeholder: "https://...", required: true } })
  ]),
  local: Object.freeze([
    method({ id: "local-bridge", label: "Bridge local", summary: "Connexion sur votre machine, sans exposer le service sur Internet.", availability: "local", recommended: true, quality: "Locale", badges: ["Local", "Temps reel"], capabilities: ["Etat local", "Mises a jour directes", "Activity Hub"], permissions: ["Acces local explicite"], field: { type: "url", label: "Adresse locale", placeholder: "http://127.0.0.1:...", required: true } })
  ]),
  feed: Object.freeze([
    method({ id: "public-feed", label: "Flux public", summary: "Lecture d'une URL de flux publique avec validation avant activation.", availability: "public", recommended: true, quality: "Lecture seule", apiVersion: "RSS / Atom", badges: ["Simple", "Lecture seule", "Sans secret"], capabilities: ["Nouveaux articles", "Historique recent", "Activity Hub"], permissions: ["Lecture du flux indique"], field: { type: "url", label: "Adresse RSS ou Atom", placeholder: "https://example.com/feed.xml", required: true } })
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
    method({ id: "oauth-pkce", label: "Spotify OAuth", summary: "Lecture actuelle, bibliotheque, playlists et appareils via l'API officielle.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Spotify Web API", badges: ["OAuth", "Temps reel", "Cloud"], capabilities: ["Lecture actuelle", "Historique autorise", "Playlists", "Appareils", "Controle de lecture"], permissions: ["Profil", "Etat de lecture", "Bibliotheque selectionnee"] }),
    method({ id: "discord-lanyard", label: "Discord + Lanyard", summary: "Presence Spotify publique exposee par Discord, sans controle de lecture.", availability: "bridge", quality: "Temps reel", apiVersion: "Lanyard", live: true, badges: ["Simple", "Via Discord", "Via Lanyard", "Lecture seule"], capabilities: ["Morceau actuel", "Artiste", "Album", "Pochette", "Progression"], permissions: ["Presence Discord publique"], dependency: "discord", field: { type: "text", label: "Identifiant Discord public", placeholder: "123456789012345678", required: true } }),
    method({ id: "lastfm-history", label: "Last.fm", summary: "Historique musical et statistiques a partir des scrobbles Last.fm.", availability: "bridge", quality: "Historique", apiVersion: "Last.fm API", live: true, badges: ["Via Last.fm", "Lecture seule", "Cloud"], capabilities: ["Historique", "Top artistes", "Top morceaux", "Statistiques"], permissions: ["Profil Last.fm public ou autorise"], dependency: "lastfm", field: { type: "text", label: "Nom d'utilisateur Last.fm", placeholder: "Votre profil public", required: true } }),
    method({ id: "public-profile", label: "Profil public", summary: "Apercu limite a une URL de profil ou de playlist publique.", availability: "public", quality: "Essentielle", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Profil public", "Playlist publique"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Profil ou playlist publique", placeholder: "https://open.spotify.com/...", required: true } })
  ]),
  discord: Object.freeze([
    method({ id: "lanyard-presence", label: "Presence publique", summary: "Statut et activite Discord en lecture seule, juste avec votre identifiant.", availability: "public", recommended: true, quality: "Temps reel", apiVersion: "Lanyard", live: true, badges: ["Simple", "Temps reel", "Lecture seule"], capabilities: ["Statut", "Activite", "Spotify expose"], permissions: ["Identifiant Discord public"], field: { type: "text", label: "Identifiant Discord", placeholder: "123456789012345678", required: true } }),
    method({ id: "oauth-secure", label: "Discord OAuth", summary: "Pour lister vos serveurs autorises en plus de la presence. Necessite le backend ETHONE.", availability: "backend", quality: "Complete", apiVersion: "Discord OAuth2", badges: ["OAuth", "Cloud"], capabilities: ["Profil", "Serveurs autorises", "Activity Hub"], permissions: ["Identify", "Guilds selon besoin"] })
  ]),
  minecraft: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Recupere votre pseudo, identifiant et skin via l'API publique Mojang. Aucun compte Microsoft requis.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "Mojang API", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Pseudo verifie", "Skin actuel"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Pseudo Minecraft", placeholder: "Notch", required: true } })
  ]),
  twitch: Object.freeze([
    method({ id: "public-profile", label: "Chaine publique", summary: "Statut Live et derniers streams via l'API Twitch publique, juste avec votre pseudo.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "Twitch Helix", live: true, badges: ["Simple", "Lecture seule"], capabilities: ["Statut Live", "Derniers streams"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Pseudo Twitch", placeholder: "votre_pseudo", required: true }, credential: { provider: "twitch", fields: [{ key: "clientId", label: "Client ID Twitch", placeholder: "abcdef123456..." }, { key: "clientSecret", label: "Client Secret Twitch", placeholder: "•••••••••••••" }] } }),
    method({ id: "oauth-secure", label: "Twitch OAuth", summary: "Pour les abonnements et donnees privees. Necessite le backend ETHONE.", availability: "backend", quality: "Standard", apiVersion: "Twitch OAuth", badges: ["OAuth", "Cloud"], capabilities: ["Chaines", "Activite", "Abonnements"], permissions: ["Scopes OAuth selectionnes"] })
  ]),
  reddit: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Publications et commentaires publics via l'API Reddit, juste avec votre nom d'utilisateur.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "Reddit API", badges: ["Simple", "Lecture seule"], capabilities: ["Publications publiques", "Commentaires publics"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Nom d'utilisateur Reddit", placeholder: "votre_pseudo", required: true } }),
    method({ id: "oauth-secure", label: "Reddit OAuth", summary: "Pour les communautes privees et l'activite complete. Necessite le backend ETHONE.", availability: "backend", quality: "Standard", apiVersion: "Reddit OAuth2", badges: ["OAuth", "Cloud"], capabilities: ["Communautes", "Activite"], permissions: ["Scopes OAuth selectionnes"] })
  ]),
  bluesky: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Publications publiques via le protocole AT, juste avec votre identifiant.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "AT Protocol", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Publications publiques"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Identifiant Bluesky", placeholder: "vous.bsky.social", required: true } })
  ]),
  youtube: Object.freeze([
    method({ id: "public-channel", label: "Chaine publique", summary: "Dernieres videos et activite publique de la chaine, juste avec son identifiant.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "YouTube Data API", badges: ["Simple", "Lecture seule"], capabilities: ["Dernieres videos", "Activite publique"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Chaine YouTube", placeholder: "@votre-chaine", required: true } }),
    method({ id: "oauth-secure", label: "Google OAuth", summary: "Pour les abonnements et donnees privees. Necessite le backend ETHONE.", availability: "backend", quality: "Standard", apiVersion: "Google OAuth", badges: ["OAuth", "Cloud"], capabilities: ["Videos", "Chaines", "Activite"], permissions: ["Scopes OAuth selectionnes"] })
  ]),
  lastfm: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Scrobbles et historique musical via l'API Last.fm, juste avec votre nom d'utilisateur.", availability: "public", recommended: true, quality: "Essentielle", apiVersion: "Last.fm API", live: true, badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Scrobbles", "Historique musical"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Nom d'utilisateur Last.fm", placeholder: "votre_pseudo", required: true }, credential: { provider: "lastfm", fields: [{ key: "apiKey", label: "Cle API Last.fm", placeholder: "0123456789abcdef0123456789abcdef" }] } })
  ]),
  weather: Object.freeze([
    method({ id: "public-location", label: "Lieu public", summary: "Conditions et previsions via Open-Meteo, une API meteo publique et gratuite.", availability: "public", recommended: true, live: true, quality: "Temps reel", apiVersion: "Open-Meteo", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Conditions actuelles", "Previsions"], permissions: ["Aucune permission privee"], field: { type: "text", label: "Ville", placeholder: "Paris, France", required: true } })
  ]),
  riot: Object.freeze([
    method({ id: "server-connector", label: "Riot API", summary: "Valorant, League of Legends et TFT via une cle API HenrikDev conservee cote Worker.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "HenrikDev API", guideKind: "apikey", live: true, badges: ["Cloud"], capabilities: ["Parties recentes", "Rangs", "Statistiques"], permissions: ["Donnees exposees par Riot"], field: { type: "text", label: "Riot ID (Nom#Tag)", placeholder: "Pseudo#EUW", required: true }, credential: { provider: "henrik", fields: [{ key: "apiKey", label: "Cle API HenrikDev", placeholder: "HDEV-..." }] } })
  ]),
  "tracker-gg": Object.freeze([
    method({ id: "server-connector", label: "Tracker.gg API", summary: "Rangs et matchs Apex Legends via une cle API Tracker.gg conservee cote Worker.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Tracker.gg API", guideKind: "apikey", live: true, badges: ["Cloud"], capabilities: ["Rangs", "Matchs recents", "Statistiques"], permissions: ["Donnees exposees par Tracker.gg"], field: { type: "text", label: "Identifiant (Origin, PSN, Xbox)", placeholder: "VotrePseudo", required: true }, credential: { provider: "tracker", fields: [{ key: "apiKey", label: "Cle API Tracker.gg", placeholder: "TRN-..." }] } })
  ]),
  openai: Object.freeze([
    method({ id: "server-connector", label: "Cle API OpenAI", summary: "Executions via une cle API conservee uniquement cote Worker ETHONE.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "OpenAI API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Cle limitee au Worker ETHONE"] })
  ]),
  anthropic: Object.freeze([
    method({ id: "server-connector", label: "Cle API Anthropic", summary: "Executions via une cle API conservee uniquement cote Worker ETHONE.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Anthropic API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Cle limitee au Worker ETHONE"] })
  ]),
  gemini: Object.freeze([
    method({ id: "server-connector", label: "Cle API Gemini", summary: "Executions via une cle API conservee uniquement cote Worker ETHONE.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Gemini API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Cle limitee au Worker ETHONE"] })
  ]),
  groq: Object.freeze([
    method({ id: "server-connector", label: "Cle API Groq", summary: "Executions via une cle API conservee uniquement cote Worker ETHONE.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Groq API", guideKind: "apikey", badges: ["Cloud"], capabilities: ["Executions", "Historique d'usage"], permissions: ["Cle limitee au Worker ETHONE"] })
  ]),
  github: Object.freeze([
    method({ id: "github-app", label: "GitHub App", summary: "Permissions fines, installation revocable et acces limite aux depots choisis.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "GitHub App API", badges: ["Cloud", "Temps reel"], capabilities: ["Commits", "Pull Requests", "Issues", "Webhooks"], permissions: ["Depots selectionnes", "Metadonnees", "Lecture ou ecriture explicite"] }),
    method({ id: "oauth-secure", label: "GitHub OAuth App", summary: "Connexion OAuth classique pour les profils et actions autorisees.", availability: "backend", quality: "Standard", apiVersion: "GitHub OAuth", badges: ["OAuth", "Cloud"], capabilities: ["Profil", "Depots autorises", "Activity Hub"], permissions: ["Scopes OAuth selectionnes"] }),
    method({ id: "public-profile", label: "Profil public", summary: "Contributions et depots publics, sans acces prive.", availability: "public", quality: "Lecture seule", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Profil public", "Depots publics", "Contributions"], permissions: ["Aucune permission privee"], field: { type: "url", label: "Profil GitHub public", placeholder: "https://github.com/utilisateur", required: true } })
  ]),
  "google-calendar": Object.freeze([
    method({ id: "oauth-secure", label: "Google OAuth", summary: "Calendriers autorises avec scopes minimaux et synchronisation cote serveur.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Google Calendar API", badges: ["OAuth", "Cloud"], capabilities: ["Evenements", "Calendriers choisis", "Rappels", "Activity Hub"], permissions: ["Lecture agenda", "Ecriture optionnelle"] }),
    method({ id: "ics-readonly", label: "Calendrier ICS", summary: "Abonnement a une adresse ICS partagee, strictement en lecture seule.", availability: "public", quality: "Lecture seule", apiVersion: "iCalendar", badges: ["Simple", "Sans secret", "Lecture seule"], capabilities: ["Evenements publies", "Actualisation periodique"], permissions: ["Lecture de l'agenda partage"], field: { type: "url", label: "Adresse ICS partagee", placeholder: "https://.../calendar.ics", required: true } })
  ]),
  notion: Object.freeze([
    method({ id: "public-oauth", label: "Connexion publique", summary: "OAuth Notion pour choisir les pages partagees avec ETHONE.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "Notion API", badges: ["OAuth", "Cloud"], capabilities: ["Pages partagees", "Bases partagees", "Activity Hub"], permissions: ["Contenu explicitement partage"] }),
    method({ id: "internal-backend", label: "Connexion interne", summary: "Pour un seul workspace, avec identifiants conserves uniquement cote serveur.", availability: "backend", quality: "Workspace", apiVersion: "Notion API", badges: ["Cloud", "Workspace"], capabilities: ["Pages partagees", "Bases partagees"], permissions: ["Contenu explicitement partage"] })
  ]),
  steam: Object.freeze([
    method({ id: "public-profile", label: "Profil public", summary: "Jeux et activite visibles selon les reglages de confidentialite Steam.", availability: "public", recommended: true, quality: "Lecture seule", apiVersion: "Steam Community", live: true, badges: ["Simple", "Lecture seule"], capabilities: ["Jeu actuel", "Bibliotheque publique", "Temps de jeu public"], permissions: ["Profil Steam public"], field: { type: "url", label: "Profil Steam public", placeholder: "https://steamcommunity.com/id/...", required: true } }),
    method({ id: "server-connector", label: "Steam Web API", summary: "Enrichissement via un relais serveur et l'API officielle.", availability: "backend", quality: "Complete", apiVersion: "Steam Web API", guideKind: "apikey", live: true, badges: ["Cloud"], capabilities: ["Profil", "Jeux", "Statistiques disponibles"], permissions: ["Donnees exposees par Steam"], credential: { provider: "steam", fields: [{ key: "apiKey", label: "Cle API Steam Web API", placeholder: "0123456789ABCDEF0123456789ABCDEF" }] } })
  ]),
  email: Object.freeze([
    method({ id: "provider-oauth", label: "OAuth fournisseur", summary: "Connexion recommandee pour Gmail, Outlook et fournisseurs compatibles.", availability: "backend", recommended: true, quality: "Complete", apiVersion: "OAuth 2.0", badges: ["OAuth", "Cloud"], capabilities: ["Nouveaux messages", "Priorites", "Activity Hub"], permissions: ["Lecture des messages selectionnes"] }),
    method({ id: "imap-backend", label: "IMAP via backend", summary: "Compatibilite etendue avec traitement exclusivement cote serveur.", availability: "backend", quality: "Compatible", apiVersion: "IMAP", badges: ["Cloud"], capabilities: ["Boite de reception", "Dossiers"], permissions: ["Lecture limitee aux dossiers choisis"] })
  ]),
  "lm-studio": Object.freeze([method({ id: "local-openai", label: "Serveur local compatible", summary: "Connexion directe au serveur local compatible OpenAI de LM Studio.", availability: "local", recommended: true, quality: "Locale", apiVersion: "OpenAI compatible", endpoint: "http://127.0.0.1:1234/v1", badges: ["Local", "Sans secret"], capabilities: ["Modeles locaux", "Executions locales"], permissions: ["Acces boucle locale"], field: { type: "url", label: "Adresse locale LM Studio", placeholder: "http://127.0.0.1:1234/v1", required: true } })]),
  ollama: Object.freeze([method({ id: "local-http", label: "API locale Ollama", summary: "Connexion a Ollama sur la boucle locale, sans exposition Internet.", availability: "local", recommended: true, quality: "Locale", apiVersion: "Ollama API", endpoint: "http://127.0.0.1:11434", badges: ["Local", "Sans secret"], capabilities: ["Modeles locaux", "Executions locales"], permissions: ["Acces boucle locale"], field: { type: "url", label: "Adresse locale Ollama", placeholder: "http://127.0.0.1:11434", required: true } })])
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

const REDIRECT_NOTE = "En attendant que le callback OAuth d'ETHONE soit branche, utilisez https://ethone.dev/ comme valeur temporaire : vous pourrez la corriger plus tard sans recreer l'application.";

const SPECIAL_GUIDES = Object.freeze({
  spotify: Object.freeze({
    "oauth-pkce": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir le Dashboard Spotify for Developers", "Connectez-vous avec votre compte Spotify puis cliquez sur \"Create app\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre (ex : \"ETHONE\"), description libre. Cochez \"Web API\" dans les API utilisees."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "user-read-currently-playing, user-read-playback-state, user-read-recently-played, playlist-read-private", { copyValue: "user-read-currently-playing user-read-playback-state user-read-recently-played playlist-read-private" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Dans Settings de l'application, copiez les deux valeurs. Le Client Secret ne s'affiche qu'une fois.")
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
      guideStep("app", "Nommer l'application", "Nom libre, categorie \"Application Integration\", client type \"Confidential\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "user:read:subscriptions et user:read:follows selon ce que vous voulez afficher.", { copyValue: "user:read:subscriptions user:read:follows" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Le Client ID est visible directement. Cliquez \"New Secret\" pour generer le Client Secret.")
    ]),
    "public-profile": (resource) => Object.freeze([
      guideStep("info", "Cle optionnelle", "Votre pseudo suffit pour tester avec la cle partagee d'ETHONE. Creez votre propre application Twitch si vous voulez votre propre quota, independant des autres utilisateurs.", { resource }),
      guideStep("docs", "Ouvrir la Twitch Developer Console", "Connectez-vous puis \"Register Your Application\"."),
      guideStep("app", "Nommer l'application", "Nom libre, categorie \"Application Integration\", client type \"Confidential\". Aucune Redirect URI reelle n'est utilisee pour cette methode."),
      guideStep("keys", "Copier Client ID et Client Secret", "Le Client ID est visible directement. Cliquez \"New Secret\" pour generer le Client Secret."),
      guideStep("paste", "Coller vos identifiants dans ETHONE", "Utilisez le champ \"Votre propre cle\" ci-dessous. Ils sont stockes dans votre compte Supabase, visibles et modifiables seulement par vous.")
    ])
  }),
  reddit: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les Reddit App Preferences", "Connectez-vous puis \"create another app...\" en bas de page.", { resource }),
      guideStep("app", "Configurer le type d'application", "Choisissez \"web app\" (pas \"script\" ni \"installed app\")."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "identity (profil), history (activite), mysubreddits (communautes).", { copyValue: "identity history mysubreddits" }),
      guideStep("keys", "Copier l'identifiant et le secret", "L'identifiant apparait sous le nom de l'app, le secret est affiche a droite.")
    ])
  }),
  youtube: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"YouTube Data API v3\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilise que par vous."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/youtube.readonly", { copyValue: "https://www.googleapis.com/auth/youtube.readonly" })
    ])
  }),
  "google-calendar": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"Google Calendar API\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilise que par vous."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/calendar.readonly", { copyValue: "https://www.googleapis.com/auth/calendar.readonly" })
    ])
  }),
  email: Object.freeze({
    "provider-oauth": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"Gmail API\" dans la bibliotheque d'API. Pour Outlook, utilisez plutot le portail Azure App registrations.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/gmail.readonly", { copyValue: "https://www.googleapis.com/auth/gmail.readonly" })
    ])
  }),
  github: Object.freeze({
    "github-app": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les parametres developpeur GitHub", "Settings > Developer settings > GitHub Apps > \"New GitHub App\".", { resource }),
      guideStep("app", "Configurer l'application", "Nom libre, Homepage URL: https://ethone.dev, decochez Webhook si vous ne voulez pas d'evenements en temps reel."),
      guideStep("redirect", "Ajouter la Callback URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("permissions", "Permissions du depot", "Contents: Read-only, Metadata: Read-only, Pull requests: Read-only, Issues: Read-only."),
      guideStep("install", "Installer l'application", "Une fois creee, installez-la sur les depots que vous voulez suivre, puis notez l'App ID et generez une cle privee (.pem).")
    ]),
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les parametres developpeur GitHub", "Settings > Developer settings > OAuth Apps > \"New OAuth App\".", { resource }),
      guideStep("app", "Configurer l'application", "Nom libre, Homepage URL: https://ethone.dev."),
      guideStep("redirect", "Ajouter l'Authorization callback URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "read:user (profil) et public_repo (ou repo pour les depots prives).", { copyValue: "read:user public_repo" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Le Client ID est visible directement. Cliquez \"Generate a new client secret\".")
    ])
  }),
  notion: Object.freeze({
    "public-oauth": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir My Integrations sur Notion", "Connectez-vous puis \"New integration\".", { resource }),
      guideStep("app", "Configurer l'integration", "Type \"Public\" (necessaire pour un flux OAuth), nom libre, associez un workspace."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("permissions", "Capacites a demander", "Read content uniquement. Ne cochez pas Insert/Update sauf besoin reel."),
      guideStep("keys", "Copier OAuth client ID et secret", "Disponibles dans l'onglet \"Distribution\" de l'integration une fois publiee.")
    ]),
    "internal-backend": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir My Integrations sur Notion", "Connectez-vous puis \"New integration\".", { resource }),
      guideStep("app", "Configurer l'integration", "Type \"Internal\" (pas de flux OAuth, un seul workspace), nom libre."),
      guideStep("permissions", "Capacites a demander", "Read content uniquement."),
      guideStep("keys", "Copier le jeton d'integration interne", "Affiche une seule fois dans l'onglet \"Secrets\"."),
      guideStep("share", "Partager les pages", "Dans Notion, ouvrez chaque page a suivre > \"...\" > Connections > ajoutez votre integration.")
    ])
  }),
  "google-drive": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"Google Drive API\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilise que par vous."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/drive.readonly", { copyValue: "https://www.googleapis.com/auth/drive.readonly" })
    ])
  }),
  "google-docs": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"Google Docs API\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilise que par vous."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "https://www.googleapis.com/auth/documents.readonly et https://www.googleapis.com/auth/drive.metadata.readonly (pour lister les documents recents).", { copyValue: "https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.metadata.readonly" })
    ])
  }),
  "google-tasks": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"Google Tasks API\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilise que par vous."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/tasks.readonly", { copyValue: "https://www.googleapis.com/auth/tasks.readonly" })
    ])
  }),
  "google-photos": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Google Cloud Console", "Creez un projet (ou reutilisez-en un), puis activez \"Photos Library API\" dans la bibliotheque d'API.", { resource }),
      guideStep("consent", "Configurer l'ecran de consentement OAuth", "Type \"External\", renseignez le nom de l'app. Statut \"Testing\" suffit tant que ce n'est utilise que par vous."),
      guideStep("app", "Creer un identifiant OAuth", "Credentials > Create Credentials > OAuth client ID > type \"Web application\"."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "https://www.googleapis.com/auth/photoslibrary.readonly", { copyValue: "https://www.googleapis.com/auth/photoslibrary.readonly" })
    ])
  }),
  "apple-music": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir Apple Developer", "Necessite un compte Apple Developer Program payant (99$/an). Rendez-vous dans Certificates, Identifiers & Profiles.", { resource }),
      guideStep("identifier", "Creer un MusicKit Identifier", "Identifiers > + > MusicKit, associez-le a votre compte."),
      guideStep("key", "Generer une cle privee MusicKit", "Keys > + > cochez MusicKit > telechargez le fichier .p8 (une seule fois, a conserver precieusement)."),
      guideStep("token", "Fonctionnement different d'un OAuth classique", "Apple Music ne redirige pas vers ETHONE : le Worker doit generer un jeton developpeur signe (JWT) avec cette cle, puis votre navigateur autorise l'acces via MusicKit JS.", { status: "blocked" }),
      guideStep("verify", "Pas de Redirect URI a configurer", "Cette methode ne suit pas le schema OAuth habituel, il n'y a rien d'autre a renseigner cote Apple pour l'instant.")
    ])
  }),
  "youtube-music": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("unavailable", "Pas d'API officielle pour YouTube Music", "Google ne propose pas d'API publique et documentee pour la lecture en cours sur YouTube Music, contrairement a YouTube (videos) ou Spotify.", { resource, status: "blocked" }),
      guideStep("alternative", "Alternative", "Utilisez YouTube (chaine publique) si vous voulez suivre une activite YouTube, ou Last.fm si vous scrobblez deja votre ecoute.", { status: "blocked" })
    ])
  }),
  todoist: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la Todoist App Console", "Connectez-vous puis \"Create a new app\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre, description libre."),
      guideStep("redirect", "Ajouter l'OAuth redirect URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "data:read (lecture seule des taches et projets).", { copyValue: "data:read" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles directement dans les parametres de l'app.")
    ])
  }),
  linear: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les parametres API Linear", "Settings > API > OAuth Applications > \"Create new\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre, icone facultative."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "read (lecture seule des issues, projets et cycles).", { copyValue: "read" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles directement dans les parametres de l'app.")
    ])
  }),
  clickup: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les parametres d'application ClickUp", "Depuis votre Workspace : Settings > Apps > \"App name\" en bas de page.", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre. ClickUp n'utilise pas de scopes granulaires : l'acces correspond a ce que votre propre compte peut voir."),
      guideStep("redirect", "Ajouter le Redirect URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles directement une fois l'application creee.")
    ])
  }),
  jira: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la console developpeur Atlassian", "Connectez-vous puis \"Create\" > \"OAuth 2.0 integration\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre. Dans Permissions, ajoutez l'API Jira platform REST."),
      guideStep("redirect", "Ajouter la Callback URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "read:jira-work (issues et projets en lecture seule).", { copyValue: "read:jira-work" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Dans l'onglet Settings de l'integration.")
    ])
  }),
  gitlab: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir les applications GitLab", "Depuis votre profil : Edit profile > Applications > \"Add new application\".", { resource }),
      guideStep("app", "Nommer l'application", "Nom libre."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "read_api (lecture seule via l'API) ou read_user pour juste le profil.", { copyValue: "read_api" }),
      guideStep("keys", "Copier Application ID et Secret", "Affiches une seule fois juste apres la creation.")
    ])
  }),
  fitbit: Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir la Fitbit Developer Console", "Connectez-vous puis \"Register An App\".", { resource }),
      guideStep("app", "Configurer l'application", "OAuth 2.0 Application Type: \"Server\", nom libre."),
      guideStep("redirect", "Ajouter la Redirect URL", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scopes a demander", "activity, heartrate et profile selon les indicateurs voulus.", { copyValue: "activity heartrate profile" }),
      guideStep("keys", "Copier OAuth 2.0 Client ID et Client Secret", "Visibles directement dans les parametres de l'app.")
    ])
  }),
  "battle-net": Object.freeze({
    "oauth-secure": (resource) => Object.freeze([
      guideStep("docs", "Ouvrir le Battle.net Developer Portal", "Connectez-vous avec votre compte Battle.net puis \"Create Client\".", { resource }),
      guideStep("app", "Configurer le client", "Redirect URIs, Service URL: https://ethone.dev, cochez uniquement les jeux que vous voulez suivre (WoW, Diablo, Starcraft...)."),
      guideStep("redirect", "Ajouter la Redirect URI", REDIRECT_NOTE, { copyValue: "https://ethone.dev/" }),
      guideStep("scopes", "Scope a demander", "wow.profile (World of Warcraft) et/ou sc2.profile, d3.profile selon le jeu.", { copyValue: "wow.profile" }),
      guideStep("keys", "Copier Client ID et Client Secret", "Visibles dans le tableau de bord une fois le client cree et approuve.")
    ])
  }),
  lastfm: Object.freeze({
    "public-profile": (resource) => Object.freeze([
      guideStep("info", "Cle optionnelle", "Votre nom d'utilisateur suffit pour tester avec la cle partagee d'ETHONE. Creez votre propre cle si vous voulez votre propre quota, independant des autres utilisateurs.", { resource }),
      guideStep("docs", "Ouvrir Last.fm API Accounts", "Connectez-vous puis \"Create API account\"."),
      guideStep("key", "Generer votre cle", "Nom d'application libre, aucune URL de callback necessaire pour cette methode."),
      guideStep("paste", "Coller votre cle dans ETHONE", "Utilisez le champ \"Votre propre cle\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
    ])
  }),
  steam: Object.freeze({
    "server-connector": (resource) => Object.freeze([
      guideStep("info", "Cle optionnelle", "La methode \"Profil public\" fonctionne deja sans cle. Cette methode enrichit vos donnees via l'API officielle Steam et fonctionne avec la cle partagee d'ETHONE, ou la votre pour un quota independant.", { resource }),
      guideStep("docs", "Ouvrir la page des cles Steam Web API", "Connectez-vous avec votre compte Steam."),
      guideStep("key", "Generer votre cle", "Renseignez un nom de domaine (ethone.dev convient) et validez pour obtenir votre cle personnelle."),
      guideStep("paste", "Coller votre cle dans ETHONE", "Utilisez le champ \"Votre propre cle\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
    ])
  }),
  riot: Object.freeze({
    "server-connector": (resource) => Object.freeze([
      guideStep("info", "Approbation manuelle requise", "HenrikDev (le relais utilise pour l'API Riot) valide chaque demande individuellement via son serveur Discord. En attendant, la cle partagee d'ETHONE reste utilisee.", { resource, status: "blocked" }),
      guideStep("docs", "Rejoindre le serveur Discord HenrikDev", "Suivez les instructions du canal dedie a l'obtention d'une cle pour demander la votre."),
      guideStep("paste", "Coller votre cle dans ETHONE", "Une fois approuvee, utilisez le champ \"Votre propre cle\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
    ])
  }),
  "tracker-gg": Object.freeze({
    "server-connector": (resource) => Object.freeze([
      guideStep("info", "Approbation manuelle requise", "Tracker.gg valide chaque demande d'acces API individuellement. En attendant, la cle partagee d'ETHONE reste utilisee.", { resource, status: "blocked" }),
      guideStep("docs", "Ouvrir Tracker.gg Developers", "Connectez-vous puis demandez un acces API pour votre propre usage."),
      guideStep("paste", "Coller votre cle dans ETHONE", "Une fois approuvee, utilisez le champ \"Votre propre cle\" ci-dessous. Elle est stockee dans votre compte Supabase, visible et modifiable seulement par vous.")
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
      guideStep("availability", "Verifier la disponibilite", selected.summary, { resource: primaryResource, status: "blocked" }),
      guideStep("wait", "Connecteur desactive proprement", "ETHONE n'activera pas une methode non officielle ou non autorisee.", { status: "blocked" })
    ]);
  }

  const special = specialGuideFor(integration.id, selected.id);
  if (special) return special(primaryResource);

  if (selected.availability === "local") {
    return Object.freeze([
      guideStep("service", `Demarrer ${integration.name}`, "Activez le service uniquement sur votre machine et consultez sa documentation officielle.", { resource: primaryResource }),
      guideStep("endpoint", "Verifier l'adresse locale", "L'adresse proposee reste sur la boucle locale et ne contient aucune donnee sensible.", { copyValue: selected.endpoint }),
      guideStep("permissions", "Limiter l'acces", "Autorisez uniquement les fonctions indispensables a ETHONE."),
      guideStep("verify", "Verifier la preparation", "Le diagnostic ETHONE controle le navigateur, la methode et la configuration locale.")
    ]);
  }

  if (selected.guideKind === "apikey") {
    return Object.freeze([
      guideStep("docs", "Lire la documentation", `Consultez la documentation officielle de ${integration.name} pour generer une cle API.`, { resource: primaryResource }),
      guideStep("key", "Generer une cle API dediee", "Creez une cle reservee a ETHONE, avec le perimetre le plus restreint possible."),
      guideStep("backend", "Enregistrer la cle cote Worker", "La cle reste dans le Worker ETHONE et n'est jamais visible dans le navigateur."),
      guideStep("verify", "Verifier la preparation", "ETHONE valide la configuration locale. Le test distant necessite que la cle soit enregistree cote Worker.")
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
