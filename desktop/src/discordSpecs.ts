export interface DiscordRowAction { title: string; path: string; method?: string; destructive?: boolean; body?: Record<string, unknown>; textPrompt?: string; textPromptKey?: string }
export interface DiscordConfig { title: string; get: string; put: string; method?: string; strict?: boolean }
export interface DiscordList { title: string; path: string; key?: string; idKey?: string; drill?: string; rowActions?: DiscordRowAction[] }
export interface DiscordAction { title: string; path: string; method?: string; destructive?: boolean; body?: Record<string, unknown> }
export interface DiscordModule { id: string; title: string; group: string; scope?: "bot"; base?: string; overview: string | null; configs?: DiscordConfig[]; lists?: DiscordList[]; actions?: DiscordAction[] }

export const DISCORD_GROUPS: string[] = ["Modération et sécurité","Communauté","Engagement","Serveur","IA, musique et vocal","Bot (propriétaire)"];

export const DISCORD_MODULES: DiscordModule[] = [
 {
  "id": "automod",
  "title": "AutoMod",
  "group": "Modération et sécurité",
  "overview": "/overview",
  "lists": [
   {
    "title": "Règles",
    "path": "/rules"
   },
   {
    "title": "Historique",
    "path": "/history"
   }
  ]
 },
 {
  "id": "automod-native",
  "title": "AutoMod natif Discord",
  "group": "Modération et sécurité",
  "overview": null,
  "lists": [
   {
    "title": "Règles",
    "path": "/",
    "key": "rules",
    "rowActions": [
     {
      "title": "Activer / désactiver",
      "path": "/{id}/toggle",
      "method": "PATCH"
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ],
  "actions": [
   {
    "title": "Créer les règles recommandées",
    "path": "/recommended"
   }
  ]
 },
 {
  "id": "welcome",
  "title": "Accueil et vérification",
  "group": "Modération et sécurité",
  "overview": "/overview",
  "configs": [
   {
    "title": "Accueil",
    "get": "/",
    "put": "/",
    "method": "PATCH"
   },
   {
    "title": "Vérification",
    "get": "/verification",
    "put": "/verification"
   },
   {
    "title": "Onboarding",
    "get": "/onboarding",
    "put": "/onboarding"
   }
  ],
  "lists": [
   {
    "title": "Modèles",
    "path": "/templates"
   }
  ]
 },
 {
  "id": "report-system",
  "title": "Signalements",
  "group": "Modération et sécurité",
  "overview": null,
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config"
   }
  ],
  "actions": [
   {
    "title": "Configuration automatique (créer salon + rôle)",
    "path": "/setup"
   }
  ]
 },
 {
  "id": "secure-roles",
  "title": "Rôles sécurisés",
  "group": "Modération et sécurité",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/overview",
    "put": "/config",
    "strict": true
   }
  ],
  "lists": [
   {
    "title": "Rôles sécurisés",
    "path": "/overview",
    "key": "roles",
    "rowActions": [
     {
      "title": "Restaurer (ne plus sécuriser)",
      "path": "/roles/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "logs",
  "title": "Journaux (réglages)",
  "group": "Modération et sécurité",
  "overview": "/overview",
  "configs": [
   {
    "title": "Journaux",
    "get": "/config",
    "put": "/config"
   }
  ]
 },
 {
  "id": "reminders",
  "title": "Rappels",
  "group": "Communauté",
  "overview": "/overview",
  "lists": [
   {
    "title": "Rappels",
    "path": "/list",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "tags",
  "title": "Tags",
  "group": "Communauté",
  "overview": "/overview",
  "lists": [
   {
    "title": "Tags",
    "path": "/list",
    "idKey": "name",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "custom-commands",
  "title": "Commandes personnalisées",
  "group": "Communauté",
  "overview": null,
  "lists": [
   {
    "title": "Commandes",
    "path": "/list",
    "rowActions": [
     {
      "title": "Activer / désactiver",
      "path": "/{id}/toggle"
     },
     {
      "title": "Dupliquer",
      "path": "/{id}/duplicate"
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "polls",
  "title": "Sondages",
  "group": "Communauté",
  "overview": "/overview",
  "lists": [
   {
    "title": "Sondages",
    "path": "/",
    "key": "polls",
    "idKey": "id",
    "rowActions": [
     {
      "title": "Publier",
      "path": "/{id}/publish"
     },
     {
      "title": "Mettre en pause",
      "path": "/{id}/pause"
     },
     {
      "title": "Reprendre",
      "path": "/{id}/resume"
     },
     {
      "title": "Terminer",
      "path": "/{id}/end",
      "destructive": true
     },
     {
      "title": "Dupliquer",
      "path": "/{id}/duplicate"
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "events",
  "title": "Événements",
  "group": "Communauté",
  "overview": "/stats/overview",
  "lists": [
   {
    "title": "Événements",
    "path": "/",
    "key": "events",
    "drill": "eventParticipants",
    "rowActions": [
     {
      "title": "Dupliquer",
      "path": "/{id}/duplicate"
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "forms",
  "title": "Formulaires",
  "group": "Communauté",
  "overview": "/overview",
  "lists": [
   {
    "title": "Formulaires (toucher pour lire les réponses)",
    "path": "/",
    "key": "forms",
    "drill": "formResponses",
    "rowActions": [
     {
      "title": "Publier",
      "path": "/{id}/publish"
     },
     {
      "title": "Dupliquer",
      "path": "/{id}/duplicate"
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "birthdays",
  "title": "Anniversaires",
  "group": "Communauté",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config"
   }
  ],
  "lists": [
   {
    "title": "Anniversaires",
    "path": "/list"
   }
  ]
 },
 {
  "id": "afk",
  "title": "AFK",
  "group": "Communauté",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config"
   }
  ]
 },
 {
  "id": "counting",
  "title": "Comptage",
  "group": "Communauté",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/overview",
    "put": "/config",
    "strict": true
   }
  ],
  "actions": [
   {
    "title": "Remettre le compteur à zéro",
    "path": "/reset",
    "destructive": true
   }
  ]
 },
 {
  "id": "starboard",
  "title": "Starboard",
  "group": "Communauté",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config"
   }
  ],
  "lists": [
   {
    "title": "Messages épinglés",
    "path": "/entries"
   }
  ]
 },
 {
  "id": "sticky",
  "title": "Messages épinglés (sticky)",
  "group": "Communauté",
  "overview": "/overview",
  "lists": [
   {
    "title": "Salons épinglés",
    "path": "/overview",
    "key": "channels",
    "idKey": "channelId",
    "rowActions": [
     {
      "title": "Republier maintenant",
      "path": "/config/{id}/repost"
     },
     {
      "title": "Supprimer",
      "path": "/config/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "highlights",
  "title": "Highlights",
  "group": "Communauté",
  "overview": "/overview"
 },
 {
  "id": "suggestions",
  "title": "Suggestions (réglages)",
  "group": "Communauté",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config/settings",
    "put": "/config/settings"
   }
  ]
 },
 {
  "id": "economy",
  "title": "Économie",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config",
    "method": "PATCH"
   }
  ],
  "lists": [
   {
    "title": "Classement",
    "path": "/leaderboard"
   },
   {
    "title": "Boutique",
    "path": "/shop",
    "key": "items",
    "idKey": "id",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/shop/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Transactions",
    "path": "/transactions"
   }
  ]
 },
 {
  "id": "leveling",
  "title": "Niveaux",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config",
    "method": "PATCH"
   }
  ],
  "lists": [
   {
    "title": "Classement",
    "path": "/leaderboard"
   },
   {
    "title": "Récompenses",
    "path": "/rewards",
    "idKey": "id",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/rewards/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Boosts d'XP",
    "path": "/boosts",
    "idKey": "id",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/boosts/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ],
  "actions": [
   {
    "title": "Réinitialiser tous les niveaux",
    "path": "/reset",
    "destructive": true
   }
  ]
 },
 {
  "id": "invites",
  "title": "Invitations",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Classement",
    "path": "/leaderboard"
   },
   {
    "title": "Liens",
    "path": "/links"
   },
   {
    "title": "Récompenses",
    "path": "/rewards",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/rewards/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Campagnes",
    "path": "/campaigns"
   }
  ],
  "actions": [
   {
    "title": "Synchroniser les invitations",
    "path": "/sync"
   }
  ]
 },
 {
  "id": "stats",
  "title": "Statistiques d'activité",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config"
   }
  ],
  "lists": [
   {
    "title": "Classement",
    "path": "/leaderboard"
   }
  ]
 },
 {
  "id": "server-stats",
  "title": "Salons de statistiques",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config"
   }
  ],
  "actions": [
   {
    "title": "Rafraîchir les salons",
    "path": "/refresh"
   }
  ]
 },
 {
  "id": "statroles",
  "title": "Rôles automatiques par statistiques",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/overview",
    "put": "/config",
    "strict": true
   }
  ],
  "actions": [
   {
    "title": "Lancer maintenant",
    "path": "/run"
   }
  ]
 },
 {
  "id": "analytics",
  "title": "Analytique du serveur",
  "group": "Engagement",
  "overview": "/overview"
 },
 {
  "id": "calendar",
  "title": "Calendrier du serveur",
  "group": "Engagement",
  "overview": null,
  "lists": [
   {
    "title": "Calendrier",
    "path": "/"
   }
  ]
 },
 {
  "id": "games",
  "title": "Mini-Jeux & Casino",
  "group": "Engagement",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages du casino",
    "get": "/config",
    "put": "/config",
    "method": "PATCH"
   }
  ],
  "lists": [
   {
    "title": "Historique des parties",
    "path": "/history",
    "key": "history"
   },
   {
    "title": "Quêtes actives",
    "path": "/quests",
    "key": "quests"
   }
  ],
  "actions": [
   {
    "title": "Alimenter le Jackpot (+1 000 🪙)",
    "path": "/jackpot/seed",
    "body": {
     "amount": 1000
    }
   }
  ]
 },
 {
  "id": "server",
  "title": "Serveur",
  "group": "Serveur",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages du serveur",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Santé",
    "path": "/health"
   },
   {
    "title": "Salons",
    "path": "/channels",
    "key": "channels",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/channels/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Rôles",
    "path": "/roles",
    "key": "roles",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/roles/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Émojis",
    "path": "/emojis",
    "rowActions": [
     {
      "title": "Renommer",
      "path": "/emojis/{id}",
      "method": "PATCH",
      "textPrompt": "Nouveau nom de l'émoji (2 à 32 caractères) :",
      "textPromptKey": "name"
     },
     {
      "title": "Supprimer",
      "path": "/emojis/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Webhooks",
    "path": "/webhooks",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/webhooks/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Audit Discord",
    "path": "/audit"
   }
  ]
 },
 {
  "id": "roles",
  "title": "Rôles à réaction et autorôles",
  "group": "Serveur",
  "overview": null,
  "configs": [
   {
    "title": "Autorôle",
    "get": "/autorole",
    "put": "/autorole",
    "method": "PATCH"
   }
  ],
  "lists": [
   {
    "title": "Panneaux",
    "path": "/panels",
    "rowActions": [
     {
      "title": "Synchroniser",
      "path": "/panels/{id}/sync"
     },
     {
      "title": "Dupliquer",
      "path": "/panels/{id}/duplicate"
     },
     {
      "title": "Supprimer",
      "path": "/panels/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ],
  "actions": [
   {
    "title": "Synchroniser l'autorôle maintenant",
    "path": "/autorole/sync"
   }
  ]
 },
 {
  "id": "backups",
  "title": "Sauvegardes",
  "group": "Serveur",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Sauvegardes",
    "path": "/",
    "key": "backups",
    "idKey": "id",
    "rowActions": [
     {
      "title": "Protéger / déprotéger",
      "path": "/{id}/protect",
      "method": "PATCH"
     },
     {
      "title": "Tester",
      "path": "/{id}/test"
     },
     {
      "title": "Restaurer les éléments manquants",
      "path": "/{id}/restore",
      "destructive": true,
      "body": {
       "safetyLevel": "SAFE",
       "mode": "RESTORE_MISSING"
      }
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ]
 },
 {
  "id": "settings",
  "title": "Réglages généraux du bot",
  "group": "Serveur",
  "base": "guilds/{g}",
  "overview": null,
  "configs": [
   {
    "title": "Réglages",
    "get": "/settings",
    "put": "/settings",
    "method": "PATCH"
   }
  ],
  "lists": [
   {
    "title": "Santé de la configuration",
    "path": "/settings/health"
   }
  ]
 },
 {
  "id": "streamers",
  "title": "Alertes Streamers",
  "group": "IA, musique et vocal",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages des alertes",
    "get": "/config",
    "put": "/config",
    "method": "PUT"
   }
  ],
  "lists": [
   {
    "title": "Streamers suivis",
    "path": "",
    "key": "streamers",
    "rowActions": [
     {
      "title": "Tester l'alerte en direct",
      "path": "/{id}/test"
     },
     {
      "title": "Supprimer",
      "path": "/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   }
  ],
  "actions": [
   {
    "title": "Simuler une alerte de stream",
    "path": "/simulate"
   }
  ]
 },
 {
  "id": "ai",
  "title": "Assistant IA",
  "group": "IA, musique et vocal",
  "overview": "/overview",
  "configs": [
   {
    "title": "Personnalité",
    "get": "/personality",
    "put": "/personality"
   },
   {
    "title": "Réglages",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Base de connaissances",
    "path": "/knowledge",
    "rowActions": [
     {
      "title": "Supprimer",
      "path": "/knowledge/{id}",
      "method": "DELETE",
      "destructive": true
     }
    ]
   },
   {
    "title": "Outils",
    "path": "/tools"
   },
   {
    "title": "Analytique",
    "path": "/analytics"
   }
  ]
 },
 {
  "id": "music",
  "title": "Musique",
  "group": "IA, musique et vocal",
  "overview": "/state",
  "configs": [
   {
    "title": "Réglages",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Playlists",
    "path": "/playlists"
   },
   {
    "title": "Favoris",
    "path": "/favorites"
   },
   {
    "title": "Historique",
    "path": "/history"
   }
  ],
  "actions": [
   {
    "title": "Pause",
    "path": "/pause"
   },
   {
    "title": "Reprendre",
    "path": "/resume"
   },
   {
    "title": "Piste suivante",
    "path": "/skip"
   },
   {
    "title": "Piste précédente",
    "path": "/previous"
   },
   {
    "title": "Arrêter",
    "path": "/stop",
    "destructive": true
   }
  ]
 },
 {
  "id": "voice",
  "title": "Salons vocaux",
  "group": "IA, musique et vocal",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Hubs",
    "path": "/hubs"
   },
   {
    "title": "Salons actifs",
    "path": "/rooms"
   },
   {
    "title": "Sessions",
    "path": "/sessions"
   }
  ]
 },
 {
  "id": "control",
  "title": "Centre de contrôle",
  "group": "Bot (propriétaire)",
  "scope": "bot",
  "base": "bot",
  "overview": "/overview",
  "configs": [
   {
    "title": "Réglages du bot",
    "get": "/settings",
    "put": "/settings"
   }
  ],
  "lists": [
   {
    "title": "Commandes",
    "path": "/commands"
   },
   {
    "title": "Événements",
    "path": "/events",
    "key": "data.topEvents"
   },
   {
    "title": "Tâches planifiées",
    "path": "/jobs",
    "rowActions": [
     {
      "title": "Lancer maintenant",
      "path": "/jobs/{id}/run"
     }
    ]
   },
   {
    "title": "Erreurs",
    "path": "/errors",
    "key": "data.fingerprints",
    "idKey": "fingerprint",
    "rowActions": [
     {
      "title": "Marquer résolue",
      "path": "/errors/{id}/resolve"
     }
    ]
   },
   {
    "title": "Intégrations",
    "path": "/integrations",
    "rowActions": [
     {
      "title": "Tester",
      "path": "/integrations/{id}/test"
     }
    ]
   },
   {
    "title": "Performance",
    "path": "/performance",
    "key": "data.points"
   },
   {
    "title": "Télémétrie",
    "path": "/telemetry"
   },
   {
    "title": "IA (usage)",
    "path": "/ai"
   },
   {
    "title": "Sécurité du bot",
    "path": "/security"
   }
  ],
  "actions": [
   {
    "title": "Lancer les diagnostics",
    "path": "/diagnostics/run"
   },
   {
    "title": "Optimiser les performances",
    "path": "/performance/optimize"
   },
   {
    "title": "Redémarrer le bot",
    "path": "/restart",
    "destructive": true
   },
   {
    "title": "Mettre à jour le bot",
    "path": "/update",
    "destructive": true
   }
  ]
 },
 {
  "id": "presence",
  "title": "Présence du bot",
  "group": "Bot (propriétaire)",
  "scope": "bot",
  "base": "bot/presence",
  "overview": "/",
  "configs": [
   {
    "title": "Rotation automatique",
    "get": "/rotation",
    "put": "/rotation"
   },
   {
    "title": "Identité — nom d'utilisateur",
    "get": "/identity",
    "put": "/identity/username"
   },
   {
    "title": "Identité — avatar (URL)",
    "get": "/identity",
    "put": "/identity/avatar"
   }
  ],
  "lists": [
   {
    "title": "Activités de rotation",
    "path": "/rotation",
    "key": "data.activities"
   },
   {
    "title": "Planning",
    "path": "/schedule"
   },
   {
    "title": "Profils",
    "path": "/profiles",
    "rowActions": [
     {
      "title": "Appliquer",
      "path": "/profiles/{id}/apply"
     }
    ]
   },
   {
    "title": "Serveurs",
    "path": "/servers"
   },
   {
    "title": "Historique",
    "path": "/history"
   }
  ],
  "actions": [
   {
    "title": "Activer le mode maintenance",
    "path": "/maintenance",
    "body": {
     "enabled": true
    }
   },
   {
    "title": "Désactiver le mode maintenance",
    "path": "/maintenance",
    "body": {
     "enabled": false
    }
   }
  ]
 },
 {
  "id": "owner-shield",
  "title": "Owner Shield",
  "group": "Bot (propriétaire)",
  "scope": "bot",
  "base": "bot/owner-shield",
  "overview": "/status",
  "configs": [
   {
    "title": "Réglages",
    "get": "/config",
    "put": "/config",
    "method": "POST"
   }
  ],
  "lists": [
   {
    "title": "Serveurs protégés",
    "path": "/status",
    "key": "data.guilds",
    "idKey": "guildId",
    "rowActions": [
     {
      "title": "Basculer la protection",
      "path": "/guilds/{id}/toggle"
     }
    ]
   },
   {
    "title": "Historique",
    "path": "/status",
    "key": "data.history"
   }
  ],
  "actions": [
   {
    "title": "Activer la défense automatique",
    "path": "/toggle",
    "body": {
     "enabled": true
    }
   },
   {
    "title": "Désactiver la défense automatique",
    "path": "/toggle",
    "body": {
     "enabled": false
    }
   },
   {
    "title": "Activer partout",
    "path": "/enable-all"
   },
   {
    "title": "Désactiver partout",
    "path": "/disable-all",
    "destructive": true
   }
  ]
 }
];
