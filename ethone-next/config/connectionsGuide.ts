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
};

export function getConnectionGuide(id: string): ConnectionGuide | undefined {
  return CONNECTION_GUIDES[id];
}
