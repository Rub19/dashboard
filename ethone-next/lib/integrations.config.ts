export interface IntegrationConfig {
  id: string;
  name: string;
  category: "oauth" | "api_key" | "webhook";
  badge: string;
  description: string;
  developerUrl: string;
  developerButtonLabel: string;
  docsUrl?: string;
  requiresClientSecret: boolean;
  requiresRedirectUri: boolean;
  secretLabel?: string;
  secretPlaceholder?: string;
  idLabel?: string;
  idPlaceholder?: string;
  callbackPath: string;
  steps: {
    title: string;
    description: string;
    copyValueType?: "homepage" | "callback";
  }[];
}

export const INTEGRATIONS_CONFIG: Record<string, IntegrationConfig> = {
  notion: {
    id: "notion",
    name: "Notion",
    category: "oauth",
    badge: "OAUTH 2.0 / API",
    description: "Accès aux bases de données, pages et blocs de votre espace Notion.",
    developerUrl: "https://www.notion.so/my-integrations",
    developerButtonLabel: "Portail Développeur Notion",
    docsUrl: "https://developers.notion.com/docs/authorization",
    requiresClientSecret: true,
    requiresRedirectUri: true,
    idLabel: "Client ID (ou ID d'intégration)",
    idPlaceholder: "ex: 198a2b3c-4d5e-6f7g-8h9i-0123456789ab",
    secretLabel: "Client Secret (ou Secret interne)",
    secretPlaceholder: "secret_xxxxxxxxxxxxxxxxxxxxxxxxxx",
    callbackPath: "/api/integrations/notion/callback",
    steps: [
      {
        title: "Créer une intégration",
        description: "Rendez-vous sur le portail développeur Notion et cliquez sur '+ Nouvelle intégration'.",
      },
      {
        title: "Configurer l'accès public ou interne",
        description: "Sélectionnez l'espace de travail associé et choisissez les permissions de lecture/écriture.",
      },
      {
        title: "Renseigner l'URL de redirection (Redirect URI)",
        description: "Dans l'onglet Distribution > Redirect URIs, ajoutez l'URL suivante :",
        copyValueType: "callback",
      },
      {
        title: "Copier le Secret et l'ID",
        description: "Copiez le 'Internal Integration Secret' ou le Client ID / Client Secret et collez-les ci-dessous.",
      },
    ],
  },
  todoist: {
    id: "todoist",
    name: "Todoist",
    category: "oauth",
    badge: "OAUTH 2.0",
    description: "Synchronisation des projets, sections et tâches de votre compte Todoist.",
    developerUrl: "https://developer.todoist.com/appconsole.html",
    developerButtonLabel: "App Console Todoist",
    docsUrl: "https://developer.todoist.com/guides/#oauth",
    requiresClientSecret: true,
    requiresRedirectUri: true,
    idLabel: "Client ID Todoist",
    idPlaceholder: "ex: 7a8b9c0d1e2f3g4h",
    secretLabel: "Client Secret Todoist",
    secretPlaceholder: "ex: 4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d",
    callbackPath: "/api/integrations/todoist/callback",
    steps: [
      {
        title: "Créer une application Todoist",
        description: "Ouvrez l'App Console Todoist et cliquez sur 'Create a new app'. Donnez un nom (ex: ETHONE OS).",
      },
      {
        title: "Renseigner l'URL de redirection OAuth",
        description: "Dans la section 'App Management' > 'OAuth redirect URL', collez l'URL suivante :",
        copyValueType: "callback",
      },
      {
        title: "Renseigner l'URL du service",
        description: "Dans le champ 'App service URL', renseignez l'adresse de votre application :",
        copyValueType: "homepage",
      },
      {
        title: "Récupérer les identifiants",
        description: "Copiez votre Client ID et votre Client Secret générés dans la console.",
      },
    ],
  },
  github: {
    id: "github",
    name: "GitHub",
    category: "oauth",
    badge: "OAUTH 2.0",
    description: "Accès aux repositories, commits et profil utilisateur.",
    developerUrl: "https://github.com/settings/developers",
    developerButtonLabel: "Paramètres Développeur GitHub",
    docsUrl: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
    requiresClientSecret: true,
    requiresRedirectUri: true,
    idLabel: "Client ID GitHub",
    idPlaceholder: "ex: Ov23li7gnklQJ7ipkgZG",
    secretLabel: "Client Secret GitHub",
    secretPlaceholder: "ex: 5c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    callbackPath: "/api/github/oauth/callback",
    steps: [
      {
        title: "Créer une OAuth App",
        description: "Allez dans Settings > Developer settings > OAuth Apps, puis cliquez sur 'New OAuth App'.",
      },
      {
        title: "Renseigner l'URL d'accueil",
        description: "Dans le champ 'Homepage URL', collez l'adresse de votre application :",
        copyValueType: "homepage",
      },
      {
        title: "Renseigner l'URL de rappel",
        description: "Dans le champ 'Authorization callback URL', collez l'URL suivante :",
        copyValueType: "callback",
      },
      {
        title: "Générer le Client Secret",
        description: "Copiez le Client ID et générez un Client Secret. Collez-les ci-dessous.",
      },
    ],
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    category: "oauth",
    badge: "OAUTH 2.0",
    description: "Lecture en cours, dernières écoutes et profil utilisateur.",
    developerUrl: "https://developer.spotify.com/dashboard",
    developerButtonLabel: "Spotify Developer Dashboard",
    docsUrl: "https://developer.spotify.com/documentation/web-api/tutorials/getting-started",
    requiresClientSecret: true,
    requiresRedirectUri: true,
    idLabel: "Client ID Spotify",
    idPlaceholder: "ex: 6619fbf6315e4e68948dc08532251912",
    secretLabel: "Client Secret Spotify",
    secretPlaceholder: "ex: 1234567890abcdef1234567890abcdef",
    callbackPath: "/api/spotify/oauth/callback",
    steps: [
      {
        title: "Créer une application Spotify",
        description: "Connectez-vous au Spotify Developer Dashboard et cliquez sur 'Create app'.",
      },
      {
        title: "Renseigner l'URL de redirection",
        description: "Dans 'Edit settings' > 'Redirect URIs', ajoutez l'URL suivante :",
        copyValueType: "callback",
      },
      {
        title: "Récupérer les identifiants",
        description: "Copiez le Client ID et le Client Secret affichés dans les paramètres de l'application.",
      },
    ],
  },
  discord: {
    id: "discord",
    name: "Discord",
    category: "oauth",
    badge: "OAUTH 2.0 / LANYARD",
    description: "Présence Discord, statut et activités en temps réel via Lanyard.",
    developerUrl: "https://discord.com/developers/applications",
    developerButtonLabel: "Portail Développeur Discord",
    docsUrl: "https://discord.com/developers/docs/topics/oauth2",
    requiresClientSecret: true,
    requiresRedirectUri: true,
    idLabel: "Client ID Discord",
    idPlaceholder: "ex: 1234567890123456789",
    secretLabel: "Client Secret Discord",
    secretPlaceholder: "ex: abcdef-ghijkl-mnopqr-stuvwxyz",
    callbackPath: "/api/discord/oauth/callback",
    steps: [
      {
        title: "Créer une application Discord",
        description: "Allez dans le Portail Développeur Discord et créez une nouvelle application.",
      },
      {
        title: "Activer OAuth2",
        description: "Dans 'OAuth2' > 'Redirects', ajoutez l'URL suivante :",
        copyValueType: "callback",
      },
      {
        title: "Récupérer les identifiants",
        description: "Copiez le Client ID et le Client Secret dans 'OAuth2'.",
      },
      {
        title: "Configurer Lanyard",
        description: "Pour la présence, autorisez votre compte sur lanyard.run et notez votre ID utilisateur Discord.",
      },
    ],
  },
  linear: {
    id: "linear",
    name: "Linear",
    category: "api_key",
    badge: "API KEY",
    description: "Issues, cycles et projets de vos équipes Linear.",
    developerUrl: "https://linear.app/settings/api",
    developerButtonLabel: "Paramètres API Linear",
    docsUrl: "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
    requiresClientSecret: true,
    requiresRedirectUri: false,
    secretLabel: "Token personnel Linear",
    secretPlaceholder: "lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    callbackPath: "/api/integrations/linear/callback",
    steps: [
      {
        title: "Ouvrir les paramètres API",
        description: "Rendez-vous dans les paramètres API de votre compte Linear.",
      },
      {
        title: "Créer un token personnel",
        description: "Cliquez sur 'Create key', donnez un nom explicite (ex: ETHONE OS) et confirmez.",
      },
      {
        title: "Copier le token",
        description: "Copiez la clé API générée et collez-la dans le champ ci-dessous.",
      },
    ],
  },
};

export function getIntegrationConfig(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS_CONFIG[id];
}
