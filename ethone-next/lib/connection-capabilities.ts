/**
 * ETHONE Connections 2.0 — Capabilities & Widgets Registry
 */

export interface ServiceCapabilityDef {
  capabilities: string[];
  permissions: string[];
  widgets: string[];
  category?: string;
}

export const INTEGRATION_CAPABILITIES: Record<string, ServiceCapabilityDef> = {
  spotify: {
    capabilities: [
      "Afficher la musique en cours en temps réel",
      "Contrôler la lecture (Play, Pause, Next, Seek)",
      "Pochette d'album et intégration Dynamic Island",
      "Cartes 3D interactives TiltCard sur l'Accueil",
    ],
    permissions: ["user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"],
    widgets: ["live", "hero"],
    category: "media",
  },
  discord: {
    capabilities: [
      "Présence et statut d'activité en direct (Lanyard)",
      "Affichage des jeux et musiques en cours",
      "Cartes 3D interactives TiltCard sur l'Accueil",
      "Synchronisation de l'avatar et du profil",
    ],
    permissions: ["identify", "guilds", "connections"],
    widgets: ["live", "connections"],
    category: "social",
  },
  github: {
    capabilities: [
      "Synchronisation des dépôts et commits récents",
      "Suivi des Pull Requests et issues actives",
      "Flux d'activité de code pour ETHONE Brain",
    ],
    permissions: ["read:user", "repo:status", "public_repo"],
    widgets: ["connections", "productivity"],
    category: "development",
  },
  youtube: {
    capabilities: [
      "Afficher les abonnements et notifications de vidéos",
      "Dernières vidéos publiées",
      "Suivre l'activité de chaîne",
    ],
    permissions: ["youtube.readonly"],
    widgets: ["connections"],
    category: "media",
  },
  reddit: {
    capabilities: [
      "Afficher l'activité du profil et les posts récents",
      "Notifications des subreddits favoris",
    ],
    permissions: ["identity", "history"],
    widgets: ["connections"],
    category: "social",
  },
  "google-calendar": {
    capabilities: [
      "Synchroniser les rendez-vous du calendrier",
      "Afficher le prochain événement dans la barre d'accueil",
      "Rappels et notifications proactives de Brain",
    ],
    permissions: ["calendar.events.readonly", "profile"],
    widgets: ["daystream", "hero"],
    category: "productivity",
  },
  "google-drive": {
    capabilities: [
      "Parcourir et inspecter vos fichiers Drive dans ETHONE Files",
      "Téléversement cloud direct et quotas de stockage",
      "Résumés de documents assistés par ETHONE Brain",
    ],
    permissions: ["drive.file", "drive.readonly"],
    widgets: ["hero"],
    category: "productivity",
  },
  twitch: {
    capabilities: [
      "Statut des chaînes suivies en direct",
      "Notifications de début de stream",
    ],
    permissions: ["user:read:follows"],
    widgets: ["connections"],
    category: "media",
  },
  steam: {
    capabilities: [
      "Jeux récemment joués et statut en jeu",
      "Succès débloqués et temps de jeu",
    ],
    permissions: ["Profil public", "Steam Web API"],
    widgets: ["connections"],
    category: "gaming",
  },
  riot: {
    capabilities: [
      "Statistiques et rang Valorant (MMR, tier, elo)",
      "Historique des parties League of Legends",
      "Cartes 3D interactives de combat",
    ],
    permissions: ["Henrik API", "Riot ID"],
    widgets: ["live"],
    category: "gaming",
  },
  minecraft: {
    capabilities: [
      "Statut du joueur et skin 3D animé",
      "Ping et disponibilité des serveurs",
    ],
    permissions: ["Mojang API", "Public UUID"],
    widgets: ["live"],
    category: "gaming",
  },
  weather: {
    capabilities: [
      "Conditions météo locales et température en direct",
      "Carte météo 3D avec reflets gyroscopiques",
    ],
    permissions: ["Localisation ou Ville"],
    widgets: ["live"],
    category: "productivity",
  },
  notion: {
    capabilities: [
      "Rechercher dans les bases de données et pages",
      "Résumés de notes pour ETHONE Brain",
    ],
    permissions: ["Pages", "Databases"],
    widgets: ["recent", "connections"],
    category: "productivity",
  },
  todoist: {
    capabilities: [
      "Synchroniser les tâches et échéances",
      "Intégration directe avec le widget Tâches",
    ],
    permissions: ["data:read_write"],
    widgets: ["productivity", "daystream"],
    category: "productivity",
  },
  linear: {
    capabilities: ["Issues", "Cycles", "Projets d'ingénierie"],
    permissions: ["read", "write"],
    widgets: ["productivity"],
    category: "productivity",
  },
  openai: {
    capabilities: ["Moteur de langage avancé pour ETHONE Brain", "Analyse de documents"],
    permissions: ["Clé API OpenAI"],
    widgets: ["brain"],
    category: "ai",
  },
  anthropic: {
    capabilities: ["Modèles Claude pour les résumés et analyses approfondies"],
    permissions: ["Clé API Anthropic"],
    widgets: ["brain"],
    category: "ai",
  },
  gemini: {
    capabilities: ["Modèles Google Gemini pour l'intelligence multimodale"],
    permissions: ["Clé API Gemini"],
    widgets: ["brain"],
    category: "ai",
  },
  groq: {
    capabilities: ["Inférence ultra-rapide pour les réponses instantanées de Brain"],
    permissions: ["Clé API Groq"],
    widgets: ["brain"],
    category: "ai",
  },
};

export function getCapabilities(id: string): string[] {
  return INTEGRATION_CAPABILITIES[id]?.capabilities || [
    "Recevoir les signaux en direct",
    "Synchroniser les données avec ETHONE",
  ];
}

export function getPermissions(id: string): string[] {
  return INTEGRATION_CAPABILITIES[id]?.permissions || ["Profil public", "Données de base"];
}

export function getAssociatedWidgets(id: string): string[] {
  return INTEGRATION_CAPABILITIES[id]?.widgets || [];
}
