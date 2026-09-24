/**
 * Index des modules du bot Discord : titre, page complète et mots-clés de recherche. Sert à la palette de commandes
 * (Ctrl K) pour aller directement à un module depuis n'importe quelle page. Les icônes, descriptions et panneaux de
 * configuration rapide restent dans app/discord/page.tsx (hub) ; les identifiants doivent rester identiques.
 */
export interface DiscordModuleMeta {
  id: string;
  title: string;
  href: string;
  keywords: string[];
}

export const DISCORD_MODULES: DiscordModuleMeta[] = [
  { id: "overview", title: "Vue d'ensemble", href: "/discord/overview", keywords: ["accueil", "statut", "resume", "apercu", "dashboard"] },
  { id: "security", title: "Sécurité & Anti-Raid", href: "/discord/security/anti-raid", keywords: ["anti raid", "raid", "securite", "protection", "spam", "verrouillage", "lockdown"] },
  { id: "anti-nuke", title: "Anti-Nuke", href: "/discord/security/anti-nuke", keywords: ["nuke", "suppression massive", "bannissements massifs", "securite"] },
  { id: "automod", title: "AutoMod", href: "/discord/moderation/automod", keywords: ["automod", "filtre", "insultes", "liens", "spam", "moderation automatique"] },
  { id: "moderation", title: "Modération & Sanctions", href: "/discord/moderation", keywords: ["ban", "kick", "mute", "timeout", "avertissement", "warn", "sanction", "cas"] },
  { id: "reports", title: "Signalements", href: "/discord/moderation/reports", keywords: ["signalement", "report", "plainte"] },
  { id: "logs", title: "Journal d'Audit", href: "/discord/logs", keywords: ["logs", "journal", "audit", "historique", "webhook", "salon de logs"] },
  { id: "backups", title: "Sauvegardes & Disaster Recovery", href: "/discord/backups", keywords: ["backup", "sauvegarde", "restauration", "snapshot"] },
  { id: "welcome", title: "Bienvenue & Onboarding", href: "/discord/welcome", keywords: ["bienvenue", "welcome", "accueil", "onboarding", "regles", "verification", "depart"] },
  { id: "roles", title: "Reaction Roles & Auto-Roles", href: "/discord/roles", keywords: ["roles", "reaction", "auto role", "menu de roles", "boutons"] },
  { id: "leveling", title: "Leveling & Rôles XP", href: "/discord/leveling", keywords: ["xp", "niveaux", "level", "classement", "rank", "experience"] },
  { id: "invites", title: "Invites & Parrainages", href: "/discord/invites", keywords: ["invitations", "invites", "parrainage", "referral", "faux joins"] },
  { id: "suggestions", title: "Boîte à Suggestions", href: "/discord/suggestions", keywords: ["suggestion", "idee", "vote", "boite a idees"] },
  { id: "polls", title: "Sondages & Votes", href: "/discord/polls", keywords: ["sondage", "poll", "vote"] },
  { id: "forms", title: "Forms & Applications", href: "/discord/forms", keywords: ["formulaire", "candidature", "application", "recrutement"] },
  { id: "starboard", title: "Starboard", href: "/discord/starboard", keywords: ["etoiles", "star", "meilleurs messages"] },
  { id: "highlights", title: "Highlights", href: "/discord/highlights", keywords: ["mots surveilles", "alerte mot", "highlight"] },
  { id: "birthdays", title: "Anniversaires", href: "/discord/birthdays", keywords: ["anniversaire", "birthday", "fete"] },
  { id: "music", title: "Lecteur Musique", href: "/discord/music", keywords: ["musique", "music", "play", "playlist", "dj", "spotify", "lavalink", "24/7"] },
  { id: "giveaways", title: "Tirages au sort", href: "/discord/giveaways", keywords: ["giveaway", "concours", "tirage", "cadeau"] },
  { id: "economy", title: "Économie & Boutique", href: "/discord/economy", keywords: ["economie", "monnaie", "credits", "boutique", "shop", "daily", "pieces"] },
  { id: "events", title: "Événements & Calendrier", href: "/discord/events", keywords: ["evenement", "event", "inscription", "rsvp"] },
  { id: "calendar", title: "Calendrier du serveur", href: "/discord/calendar", keywords: ["calendrier", "agenda", "planning"] },
  { id: "voice", title: "Salons Vocaux", href: "/discord/voice", keywords: ["vocal", "voice", "salon temporaire", "hub", "create"] },
  { id: "tickets", title: "Tickets Center", href: "/discord/tickets", keywords: ["ticket", "support", "aide", "transcript", "panel"] },
  { id: "commands", title: "Command Builder", href: "/discord/commands", keywords: ["commande", "custom", "personnalisee", "slash", "prefixe"] },
  { id: "tags", title: "Tags", href: "/discord/tags", keywords: ["tag", "reponse rapide", "faq", "snippet"] },
  { id: "reminders", title: "Reminders", href: "/discord/reminders", keywords: ["rappel", "reminder", "alarme"] },
  { id: "sticky", title: "Sticky Messages", href: "/discord/sticky", keywords: ["message epingle", "sticky", "toujours visible"] },
  { id: "afk", title: "AFK", href: "/discord/afk", keywords: ["absent", "afk", "away"] },
  { id: "serverstats", title: "Server Stats", href: "/discord/server-stats", keywords: ["statistiques", "compteur", "membres en ligne", "salon compteur"] },
  { id: "server", title: "Server Management Center", href: "/discord/server", keywords: ["serveur", "membres", "salons", "roles", "permissions", "emojis", "webhooks", "parametres"] },
  { id: "analytics", title: "Vue d'Ensemble & Insights", href: "/discord/analytics", keywords: ["analytics", "insights", "stats", "activite", "graphique"] },
  { id: "ai", title: "AI Assistant", href: "/discord/ai", keywords: ["ia", "ai", "assistant", "chatbot", "brain", "openrouter"] },
  { id: "bot", title: "Bot Control Center", href: "/discord/bot", keywords: ["bot", "controle", "diagnostic", "statut", "presence", "maintenance", "taches"] },
];
