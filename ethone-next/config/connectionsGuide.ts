export type ConnectionGuideField = {
  label: string;
  placeholder: string;
  type: "text" | "password";
};

export type ConnectionGuide = {
  id: string;
  title: string;
  badge: "LOCAL" | "CLOUD" | "OAUTH";
  fields: ConnectionGuideField[];
  keyGuide: {
    dashboardUrl: string;
    linkText: string;
    steps: string[];
  };
};

export const CONNECTION_GUIDES: Record<string, ConnectionGuide> = {
  jellyfin: {
    id: "jellyfin",
    title: "Jellyfin",
    badge: "LOCAL",
    fields: [
      { label: "URL Jellyfin", placeholder: "http://localhost:8096", type: "text" },
      { label: "Clé API Jellyfin", placeholder: "Votre clé API", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://jellyfin.org/docs/general/server/manage-users/",
      linkText: "Documentation Jellyfin",
      steps: [
        "Connectez-vous à votre serveur Jellyfin avec un compte Administrateur",
        "Ouvrez le Tableau de bord (icône en haut à droite)",
        "Allez dans Avancé > Clés d'API",
        "Cliquez sur le bouton '+' pour générer une nouvelle clé",
        "Donnez un nom à la clé (ex: ETHONE OS) et confirmez",
        "Copiez la clé affichée et collez-la ci-dessus",
      ],
    },
  },
  emby: {
    id: "emby",
    title: "Emby",
    badge: "LOCAL",
    fields: [
      { label: "URL Emby", placeholder: "http://localhost:8096", type: "text" },
      { label: "Clé API Emby", placeholder: "Votre clé API", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://dev.emby.media/",
      linkText: "Documentation Emby",
      steps: [
        "Connectez-vous à Emby avec un compte administrateur",
        "Ouvrez le tableau de bord > Avancé > API Keys",
        "Générez une nouvelle clé API",
        "Copiez la clé et collez-la ci-dessus",
      ],
    },
  },
  plex: {
    id: "plex",
    title: "Plex",
    badge: "LOCAL",
    fields: [
      { label: "URL Plex (optionnel)", placeholder: "https://plex.tv", type: "text" },
      { label: "Token Plex", placeholder: "Votre token Plex", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://app.plex.tv/desktop/#!/settings/account",
      linkText: "Compte Plex",
      steps: [
        "Connectez-vous à votre compte Plex",
        "Rendez-vous dans les paramètres de votre compte",
        "Affichez la section Informations / Token",
        "Copiez le token affiché (ou utilisez l'URL de réclamation fournie)",
        "Collez le token ci-dessus",
      ],
    },
  },
  spotify: {
    id: "spotify",
    title: "Spotify",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Spotify", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://developer.spotify.com/dashboard/",
      linkText: "Spotify Developer Dashboard",
      steps: [
        "Rendez-vous sur le Spotify Developer Dashboard",
        "Connectez-vous avec votre compte Spotify",
        "Cliquez sur 'Create an App'",
        "Nommez l'application 'ETHONE OS' et ajoutez une description",
        "Récupérez le Client ID et le Client Secret dans les paramètres de l'application",
        "Ajoutez l'URL de redirection fournie par ETHONE dans les paramètres Redirect URI",
      ],
    },
  },
  youtube: {
    id: "youtube",
    title: "YouTube",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Google Cloud", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://console.cloud.google.com/apis/credentials",
      linkText: "Google Cloud Console",
      steps: [
        "Rendez-vous sur Google Cloud Console",
        "Créez un projet ou sélectionnez-en un",
        "Activez l'API YouTube Data v3",
        "Dans Identifiants, cliquez sur 'Créer des identifiants' > ID client OAuth",
        "Configurez l'écran de consentement si demandé",
        "Récupérez le Client ID et Client Secret, et ajoutez l'URL de redirection fournie",
      ],
    },
  },
  twitch: {
    id: "twitch",
    title: "Twitch",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Twitch", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://dev.twitch.tv/console",
      linkText: "Twitch Developer Console",
      steps: [
        "Connectez-vous à la Twitch Developer Console",
        "Allez dans 'Your Console' > 'Register Your Application'",
        "Remplissez le nom, la catégorie et l'URL de redirection",
        "Récupérez le Client ID",
        "Générez un Client Secret dans l'onglet Secret",
      ],
    },
  },
  lastfm: {
    id: "lastfm",
    title: "Last.fm",
    badge: "CLOUD",
    fields: [
      { label: "API Key Last.fm", placeholder: "Votre clé API Last.fm", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://www.last.fm/api/account/create",
      linkText: "Créer une API Last.fm",
      steps: [
        "Connectez-vous à Last.fm",
        "Rendez-vous sur la page API Account",
        "Créez une nouvelle application API",
        "Récupérez la clé API générée",
        "Collez la clé ci-dessus",
      ],
    },
  },
  discord: {
    id: "discord",
    title: "Discord",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Discord", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://discord.com/developers/applications",
      linkText: "Discord Developer Portal",
      steps: [
        "Rendez-vous sur le Discord Developer Portal",
        "Cliquez sur 'New Application'",
        "Nommez l'application 'ETHONE OS'",
        "Dans OAuth2 > Général, ajoutez l'URL de redirection",
        "Récupérez le Client ID et le Client Secret",
      ],
    },
  },
  reddit: {
    id: "reddit",
    title: "Reddit",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Reddit", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://www.reddit.com/prefs/apps",
      linkText: "Reddit App Preferences",
      steps: [
        "Connectez-vous à Reddit",
        "Allez dans Préférences > Applications",
        "Cliquez sur 'Create another app...'",
        "Choisissez 'web app' et donnez un nom",
        "Récupérez le Client ID (sous le nom) et le Client Secret",
      ],
    },
  },
  bluesky: {
    id: "bluesky",
    title: "Bluesky",
    badge: "CLOUD",
    fields: [
      { label: "Handle Bluesky", placeholder: "nom.bsky.social", type: "text" },
      { label: "App Password", placeholder: "Votre mot de passe d'application", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://bsky.app/settings/app-passwords",
      linkText: "Bluesky App Passwords",
      steps: [
        "Connectez-vous à Bluesky",
        "Allez dans Paramètres > Mots de passe d'application",
        "Cliquez sur 'Add App Password'",
        "Donnez un nom (ex: ETHONE) et copiez le mot de passe",
        "Collez le handle et le mot de passe ci-dessus",
      ],
    },
  },
  steam: {
    id: "steam",
    title: "Steam",
    badge: "CLOUD",
    fields: [
      { label: "Steam Web API Key", placeholder: "Votre clé Steam", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://steamcommunity.com/dev/apikey",
      linkText: "Steam Web API Key",
      steps: [
        "Connectez-vous à Steam avec votre compte",
        "Rendez-vous sur la page Steam Web API Key",
        "Entrez un nom de domaine (ex: localhost)",
        "Acceptez et copiez la clé API générée",
      ],
    },
  },
  github: {
    id: "github",
    title: "GitHub",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID GitHub", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://github.com/settings/developers",
      linkText: "Console développeur GitHub",
      steps: [
        "Allez dans Paramètres > Développeur > Applications OAuth",
        "Cliquez sur 'New OAuth App'",
        "Remplissez le nom de l'application, l'URL d'accueil et l'URL de rappel d'autorisation",
        "Récupérez le Client ID généré",
        "Générez un nouveau Client Secret et copiez-le immédiatement",
      ],
    },
  },
  gitlab: {
    id: "gitlab",
    title: "GitLab",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID GitLab", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://gitlab.com/-/profile/applications",
      linkText: "GitLab Applications",
      steps: [
        "Connectez-vous à GitLab",
        "Allez dans Préférences > Applications",
        "Ajoutez une nouvelle application",
        "Cochez les scopes nécessaires (read_user, read_api)",
        "Récupérez le Client ID et le Client Secret",
      ],
    },
  },
  "google-calendar": {
    id: "google-calendar",
    title: "Google Calendar",
    badge: "OAUTH",
    fields: [{ label: "Client ID", placeholder: "Votre Client ID Google Cloud", type: "text" }],
    keyGuide: {
      dashboardUrl: "https://console.cloud.google.com/apis/credentials",
      linkText: "Google Cloud Console",
      steps: [
        "Rendez-vous sur Google Cloud Console",
        "Créez un nouveau projet (ou sélectionnez-en un)",
        "Activez l'API Google Calendar",
        "Dans Identifiants, cliquez sur 'Créer des identifiants' > ID client OAuth",
        "Configurez l'écran de consentement si demandé",
        "Récupérez le Client ID et ajoutez l'URL de redirection fournie",
      ],
    },
  },
  "google-drive": {
    id: "google-drive",
    title: "Google Drive",
    badge: "OAUTH",
    fields: [{ label: "Client ID", placeholder: "Votre Client ID Google Cloud", type: "text" }],
    keyGuide: {
      dashboardUrl: "https://console.cloud.google.com/apis/credentials",
      linkText: "Google Cloud Console",
      steps: [
        "Rendez-vous sur Google Cloud Console",
        "Créez un nouveau projet (ou sélectionnez-en un)",
        "Activez l'API Google Drive",
        "Dans Identifiants, cliquez sur 'Créer des identifiants' > ID client OAuth",
        "Configurez l'écran de consentement si demandé",
        "Récupérez le Client ID et ajoutez l'URL de redirection fournie",
      ],
    },
  },
  notion: {
    id: "notion",
    title: "Notion",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Notion", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://www.notion.so/my-integrations",
      linkText: "My Integrations Notion",
      steps: [
        "Rendez-vous sur My Integrations Notion",
        "Cliquez sur 'New integration'",
        "Nommez l'intégration 'ETHONE OS'",
        "Sélectionnez l'espace de travail concerné",
        "Récupérez le Client ID et le Client Secret (OAuth) dans les paramètres",
      ],
    },
  },
  todoist: {
    id: "todoist",
    title: "Todoist",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Todoist", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://developer.todoist.com/appconsole.html",
      linkText: "Todoist App Console",
      steps: [
        "Connectez-vous au Todoist App Console",
        "Créez une nouvelle application",
        "Récupérez le Client ID et le Client Secret",
        "Ajoutez l'URL de redirection fournie par ETHONE",
      ],
    },
  },
  linear: {
    id: "linear",
    title: "Linear",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Linear", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://linear.app/settings/api",
      linkText: "Linear API Settings",
      steps: [
        "Connectez-vous à Linear",
        "Allez dans Paramètres > API",
        "Créez une application OAuth",
        "Récupérez le Client ID et le Client Secret",
        "Ajoutez l'URL de redirection autorisée",
      ],
    },
  },
  clickup: {
    id: "clickup",
    title: "ClickUp",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID ClickUp", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://app.clickup.com/settings/apps",
      linkText: "ClickUp App Settings",
      steps: [
        "Connectez-vous à ClickUp",
        "Allez dans Paramètres > Integrations > API",
        "Créez une nouvelle application",
        "Récupérez le Client ID et le Client Secret",
      ],
    },
  },
  jira: {
    id: "jira",
    title: "Jira",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Atlassian", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://developer.atlassian.com/console/myapps/",
      linkText: "Atlassian Developer Console",
      steps: [
        "Rendez-vous sur l'Atlassian Developer Console",
        "Créez une application OAuth 2.0",
        "Ajoutez l'URL de redirection",
        "Récupérez le Client ID et le Client Secret",
      ],
    },
  },
  tmdb: {
    id: "tmdb",
    title: "TMDB",
    badge: "CLOUD",
    fields: [{ label: "Clé API TMDB", placeholder: "Votre clé API TMDB", type: "password" }],
    keyGuide: {
      dashboardUrl: "https://www.themoviedb.org/settings/api",
      linkText: "Panneau API TMDB",
      steps: [
        "Créez un compte sur themoviedb.org",
        "Rendez-vous dans Paramètres > API",
        "Cliquez sur 'Créer' dans la section Clé API",
        "Acceptez les conditions et choisissez l'usage 'Personal' ou 'Educational'",
        "Copiez la clé API générée et collez-la ci-dessus",
      ],
    },
  },
  openai: {
    id: "openai",
    title: "OpenAI",
    badge: "CLOUD",
    fields: [{ label: "Clé API OpenAI", placeholder: "sk-...", type: "password" }],
    keyGuide: {
      dashboardUrl: "https://platform.openai.com/api-keys",
      linkText: "OpenAI API Keys",
      steps: [
        "Connectez-vous à OpenAI",
        "Allez dans API Keys",
        "Cliquez sur 'Create new secret key'",
        "Donnez un nom et copiez la clé (affichée une seule fois)",
      ],
    },
  },
  anthropic: {
    id: "anthropic",
    title: "Anthropic",
    badge: "CLOUD",
    fields: [{ label: "Clé API Anthropic", placeholder: "Votre clé API", type: "password" }],
    keyGuide: {
      dashboardUrl: "https://console.anthropic.com/settings/keys",
      linkText: "Anthropic Console",
      steps: [
        "Connectez-vous à la console Anthropic",
        "Allez dans Settings > API Keys",
        "Créez une nouvelle clé",
        "Copiez la clé et collez-la ci-dessus",
      ],
    },
  },
  gemini: {
    id: "gemini",
    title: "Gemini",
    badge: "CLOUD",
    fields: [{ label: "Clé API Gemini", placeholder: "Votre clé API Google AI", type: "password" }],
    keyGuide: {
      dashboardUrl: "https://aistudio.google.com/app/apikey",
      linkText: "Google AI Studio",
      steps: [
        "Rendez-vous sur Google AI Studio",
        "Connectez-vous avec un compte Google",
        "Allez dans 'Get API key'",
        "Créez une clé API et copiez-la",
      ],
    },
  },
  groq: {
    id: "groq",
    title: "Groq",
    badge: "CLOUD",
    fields: [{ label: "Clé API Groq", placeholder: "gsk_...", type: "password" }],
    keyGuide: {
      dashboardUrl: "https://console.groq.com/keys",
      linkText: "Groq Console",
      steps: [
        "Connectez-vous à la Groq Console",
        "Allez dans API Keys",
        "Créez une nouvelle clé",
        "Copiez la clé et collez-la ci-dessus",
      ],
    },
  },
  fitbit: {
    id: "fitbit",
    title: "Fitbit",
    badge: "OAUTH",
    fields: [
      { label: "Client ID", placeholder: "Votre Client ID Fitbit", type: "text" },
      { label: "Client Secret", placeholder: "Votre Client Secret", type: "password" },
    ],
    keyGuide: {
      dashboardUrl: "https://dev.fitbit.com/apps",
      linkText: "Fitbit App Registration",
      steps: [
        "Connectez-vous au Fitbit App Registration",
        "Créez une nouvelle application",
        "Récupérez le Client ID et le Client Secret",
        "Ajoutez l'URL de redirection fournie",
      ],
    },
  },
  obsidian: {
    id: "obsidian",
    title: "Obsidian",
    badge: "LOCAL",
    fields: [{ label: "Dossier Obsidian", placeholder: "/Users/.../Vault", type: "text" }],
    keyGuide: {
      dashboardUrl: "https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin",
      linkText: "Documentation Obsidian",
      steps: [
        "Identifiez le chemin de votre coffre Obsidian",
        "Assurez-vous qu'ETHONE a accès en lecture au dossier",
        "Collez le chemin ci-dessus",
      ],
    },
  },
  vscode: {
    id: "vscode",
    title: "VS Code",
    badge: "LOCAL",
    fields: [{ label: "Chemin du workspace", placeholder: "/Users/.../project", type: "text" }],
    keyGuide: {
      dashboardUrl: "https://code.visualstudio.com/api",
      linkText: "Documentation VS Code API",
      steps: [
        "Ouvrez VS Code",
        "Identifiez le chemin du workspace à surveiller",
        "Collez le chemin ci-dessus",
      ],
    },
  },
  "lm-studio": {
    id: "lm-studio",
    title: "LM Studio",
    badge: "LOCAL",
    fields: [
      { label: "URL LM Studio", placeholder: "http://localhost:1234", type: "text" },
      { label: "Modèle", placeholder: "nom-du-modèle", type: "text" },
    ],
    keyGuide: {
      dashboardUrl: "https://lmstudio.ai/docs/developer",
      linkText: "Documentation LM Studio",
      steps: [
        "Lancez LM Studio sur votre machine",
        "Activez le serveur local (Developer > Server)",
        "Notez le port utilisé (par défaut 1234)",
        "Collez l'URL ci-dessus",
      ],
    },
  },
  ollama: {
    id: "ollama",
    title: "Ollama",
    badge: "LOCAL",
    fields: [
      { label: "URL Ollama", placeholder: "http://localhost:11434", type: "text" },
      { label: "Modèle", placeholder: "llama3", type: "text" },
    ],
    keyGuide: {
      dashboardUrl: "https://docs.ollama.com/api",
      linkText: "Documentation Ollama",
      steps: [
        "Installez et lancez Ollama localement",
        "Assurez-vous que le serveur est démarré",
        "Notez le port par défaut 11434",
        "Collez l'URL et le nom du modèle ci-dessus",
      ],
    },
  },
  rss: {
    id: "rss",
    title: "RSS",
    badge: "CLOUD",
    fields: [{ label: "URL du flux", placeholder: "https://example.com/feed.xml", type: "text" }],
    keyGuide: {
      dashboardUrl: "https://www.rssboard.org/rss-specification",
      linkText: "Spécification RSS",
      steps: [
        "Récupérez l'URL du flux RSS/Atom",
        "Assurez-vous qu'elle est accessible publiquement",
        "Collez l'URL ci-dessus",
      ],
    },
  },
  weather: {
    id: "weather",
    title: "Météo",
    badge: "CLOUD",
    fields: [{ label: "Ville", placeholder: "Paris", type: "text" }],
    keyGuide: {
      dashboardUrl: "https://open-meteo.com/en/docs",
      linkText: "Open-Meteo Docs",
      steps: [
        "Aucune clé requise. Open-Meteo est gratuit.",
        "Entrez simplement une ville ci-dessus",
      ],
    },
  },
};

export function getConnectionGuide(id: string): ConnectionGuide | undefined {
  return CONNECTION_GUIDES[id];
}
