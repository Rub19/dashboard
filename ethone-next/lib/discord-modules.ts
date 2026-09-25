/**
 * Index des modules du bot Discord : titre, page complète et mots-clés de recherche. Sert à la palette de commandes
 * (Ctrl K) pour aller directement à un module depuis n'importe quelle page. Les icônes, descriptions et panneaux de
 * configuration rapide restent dans app/discord/page.tsx (hub) ; les identifiants doivent rester identiques.
 */
import type { EthoneIconName } from "@/components/EthoneIcon";

export interface DiscordModuleMeta {
  id: string;
  title: string;
  href: string;
  keywords: string[];
  /** Icône du jeu ETHONE (components/EthoneIcon.tsx) et sa couleur : chaque module a la sienne dans la palette de commandes. */
  icon: EthoneIconName;
  tint: string;
}

export const DISCORD_MODULES: DiscordModuleMeta[] = [
  { id: "overview", title: "Vue d'ensemble", href: "/discord/overview", keywords: ["accueil", "statut", "resume", "apercu", "dashboard"], icon: "mod-overview", tint: "text-indigo-400" },
  { id: "security", title: "Sécurité & Anti-Raid", href: "/discord/security/anti-raid", keywords: ["anti raid", "raid", "securite", "protection", "spam", "verrouillage", "lockdown"], icon: "mod-security", tint: "text-emerald-400" },
  { id: "anti-nuke", title: "Anti-Nuke", href: "/discord/security/anti-nuke", keywords: ["nuke", "suppression massive", "bannissements massifs", "securite"], icon: "mod-security", tint: "text-red-400" },
  { id: "automod", title: "AutoMod", href: "/discord/moderation/automod", keywords: ["automod", "filtre", "insultes", "liens", "spam", "moderation automatique"], icon: "mod-ai", tint: "text-amber-400" },
  { id: "moderation", title: "Modération & Sanctions", href: "/discord/moderation", keywords: ["ban", "kick", "mute", "timeout", "avertissement", "warn", "sanction", "cas"], icon: "mod-moderation", tint: "text-red-400" },
  { id: "reports", title: "Signalements", href: "/discord/moderation/reports", keywords: ["signalement", "report", "plainte"], icon: "mod-forms", tint: "text-orange-400" },
  { id: "logs", title: "Journal d'Audit", href: "/discord/logs", keywords: ["logs", "journal", "audit", "historique", "webhook", "salon de logs"], icon: "mod-logs", tint: "text-slate-300" },
  { id: "backups", title: "Sauvegardes & Disaster Recovery", href: "/discord/backups", keywords: ["backup", "sauvegarde", "restauration", "snapshot"], icon: "mod-backups", tint: "text-blue-400" },
  { id: "welcome", title: "Bienvenue & Onboarding", href: "/discord/welcome", keywords: ["bienvenue", "welcome", "accueil", "onboarding", "regles", "verification", "depart"], icon: "mod-welcome", tint: "text-fuchsia-400" },
  { id: "roles", title: "Reaction Roles & Auto-Roles", href: "/discord/roles", keywords: ["roles", "reaction", "auto role", "menu de roles", "boutons"], icon: "mod-roles", tint: "text-rose-400" },
  { id: "leveling", title: "Leveling & Rôles XP", href: "/discord/leveling", keywords: ["xp", "niveaux", "level", "classement", "rank", "experience"], icon: "mod-leveling", tint: "text-amber-400" },
  { id: "invites", title: "Invites & Parrainages", href: "/discord/invites", keywords: ["invitations", "invites", "parrainage", "referral", "faux joins"], icon: "mod-invites", tint: "text-teal-400" },
  { id: "suggestions", title: "Boîte à Suggestions", href: "/discord/suggestions", keywords: ["suggestion", "idee", "vote", "boite a idees"], icon: "mod-suggestions", tint: "text-yellow-300" },
  { id: "polls", title: "Sondages & Votes", href: "/discord/polls", keywords: ["sondage", "poll", "vote"], icon: "mod-polls", tint: "text-purple-400" },
  { id: "forms", title: "Forms & Applications", href: "/discord/forms", keywords: ["formulaire", "candidature", "application", "recrutement"], icon: "mod-forms", tint: "text-lime-400" },
  { id: "starboard", title: "Starboard", href: "/discord/starboard", keywords: ["etoiles", "star", "meilleurs messages"], icon: "mod-starboard", tint: "text-yellow-400" },
  { id: "highlights", title: "Highlights", href: "/discord/highlights", keywords: ["mots surveilles", "alerte mot", "highlight"], icon: "mod-highlights", tint: "text-lime-300" },
  { id: "birthdays", title: "Anniversaires", href: "/discord/birthdays", keywords: ["anniversaire", "birthday", "fete"], icon: "mod-birthdays", tint: "text-pink-300" },
  { id: "music", title: "Lecteur Musique", href: "/discord/music", keywords: ["musique", "music", "play", "playlist", "dj", "spotify", "lavalink", "24/7"], icon: "mod-music", tint: "text-green-400" },
  { id: "giveaways", title: "Tirages au sort", href: "/discord/giveaways", keywords: ["giveaway", "concours", "tirage", "cadeau"], icon: "mod-giveaways", tint: "text-pink-400" },
  { id: "economy", title: "Économie & Boutique", href: "/discord/economy", keywords: ["economie", "monnaie", "credits", "boutique", "shop", "daily", "pieces"], icon: "mod-economy", tint: "text-yellow-300" },
  { id: "events", title: "Événements & Calendrier", href: "/discord/events", keywords: ["evenement", "event", "inscription", "rsvp"], icon: "mod-events", tint: "text-orange-300" },
  { id: "calendar", title: "Calendrier du serveur", href: "/discord/calendar", keywords: ["calendrier", "agenda", "planning"], icon: "calendar", tint: "text-orange-400" },
  { id: "voice", title: "Salons Vocaux", href: "/discord/voice", keywords: ["vocal", "voice", "salon temporaire", "hub", "create"], icon: "mod-voice", tint: "text-cyan-400" },
  { id: "tickets", title: "Tickets Center", href: "/discord/tickets", keywords: ["ticket", "support", "aide", "transcript", "panel"], icon: "mod-tickets", tint: "text-orange-400" },
  { id: "commands", title: "Command Builder", href: "/discord/commands", keywords: ["commande", "custom", "personnalisee", "slash", "prefixe"], icon: "mod-commands", tint: "text-sky-400" },
  { id: "tags", title: "Tags", href: "/discord/tags", keywords: ["tag", "reponse rapide", "faq", "snippet"], icon: "mod-tags", tint: "text-cyan-300" },
  { id: "reminders", title: "Reminders", href: "/discord/reminders", keywords: ["rappel", "reminder", "alarme"], icon: "mod-reminders", tint: "text-sky-300" },
  { id: "sticky", title: "Sticky Messages", href: "/discord/sticky", keywords: ["message epingle", "sticky", "toujours visible"], icon: "mod-sticky", tint: "text-amber-300" },
  { id: "statroles", title: "Statroles", href: "/discord/statroles", keywords: ["statrole", "role automatique", "activite", "recompense", "role actif", "retirer role"], icon: "mod-roles", tint: "text-amber-300" },
  { id: "stats", title: "Statistiques", href: "/discord/stats", keywords: ["stats", "statistiques", "messages", "vocal", "activite", "classement", "graphique", "statbot"], icon: "mod-stats", tint: "text-sky-300" },
  { id: "counting", title: "Comptage", href: "/discord/counting", keywords: ["compter", "comptage", "counting", "jeu", "nombre", "record"], icon: "mod-counting", tint: "text-teal-300" },
  { id: "afk", title: "AFK", href: "/discord/afk", keywords: ["absent", "afk", "away"], icon: "mod-afk", tint: "text-blue-300" },
  { id: "serverstats", title: "Server Stats", href: "/discord/server-stats", keywords: ["statistiques", "compteur", "membres en ligne", "salon compteur"], icon: "mod-serverstats", tint: "text-emerald-300" },
  { id: "server", title: "Server Management Center", href: "/discord/server", keywords: ["serveur", "membres", "salons", "roles", "permissions", "emojis", "webhooks", "parametres"], icon: "mod-server", tint: "text-zinc-300" },
  { id: "analytics", title: "Vue d'Ensemble & Insights", href: "/discord/analytics", keywords: ["analytics", "insights", "stats", "activite", "graphique"], icon: "mod-analytics", tint: "text-indigo-300" },
  { id: "ai", title: "AI Assistant", href: "/discord/ai", keywords: ["ia", "ai", "assistant", "chatbot", "brain", "openrouter"], icon: "mod-ai", tint: "text-violet-400" },
  { id: "bot", title: "Bot Control Center", href: "/discord/bot", keywords: ["bot", "controle", "diagnostic", "statut", "presence", "maintenance", "taches"], icon: "mod-bot", tint: "text-indigo-400" },
];
