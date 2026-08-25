export const INTEGRATION_CAPABILITIES: Record<
  string,
  { capabilities: string[]; permissions: string[] }
> = {
  spotify: {
    capabilities: ["Afficher la musique en cours", "Afficher les playlists", "Contrôler la lecture"],
    permissions: ["Profil", "Lecture en cours", "Playlists"],
  },
  discord: {
    capabilities: ["Afficher la présence", "Afficher les serveurs", "Afficher l’activité"],
    permissions: ["Présence", "Identifiant utilisateur"],
  },
  youtube: {
    capabilities: ["Afficher les abonnements", "Lister les dernières vidéos", "Suivre l’activité"],
    permissions: ["Profil", "YouTube Data API"],
  },
  reddit: {
    capabilities: ["Afficher l’activité", "Lister les posts", "Suivre les subreddits"],
    permissions: ["Profil", "Historique"],
  },
  "google-calendar": {
    capabilities: ["Lister les événements", "Afficher le prochain rendez-vous", "Rappels"],
    permissions: ["Calendrier", "Profil"],
  },
  "google-drive": {
    capabilities: ["Lister les fichiers", "Afficher les modifications récentes"],
    permissions: ["Drive", "Profil"],
  },
  twitch: {
    capabilities: ["Statut live", "Chaîne", "Informations de diffusion"],
    permissions: ["Chaîne", "Utilisateur"],
  },
  steam: {
    capabilities: ["Jeux", "Succès", "Profil", "Temps de jeu"],
    permissions: ["Profil public", "Steam Web API"],
  },
  weather: {
    capabilities: ["Météo locale", "Alertes météo"],
    permissions: ["Localisation"],
  },
  notion: {
    capabilities: ["Bases de données", "Pages", "Blocs"],
    permissions: ["Espace de travail", "Intégration interne"],
  },
  todoist: {
    capabilities: ["Projets", "Sections", "Tâches"],
    permissions: ["Projets", "Tâches"],
  },
  linear: {
    capabilities: ["Issues", "Cycles", "Projets"],
    permissions: ["Issues", "Organisation"],
  },
};

export function getCapabilities(id: string): string[] {
  return INTEGRATION_CAPABILITIES[id]?.capabilities || ["Recevoir les signaux", "Synchroniser les données"];
}

export function getPermissions(id: string): string[] {
  return INTEGRATION_CAPABILITIES[id]?.permissions || ["Profil", "Données publiques"];
}
