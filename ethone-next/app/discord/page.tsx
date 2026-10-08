"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  ChevronRight,
  Bot,
  Menu,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn, formatApiError } from "@/lib/utils";
import { useDiscordOnboarding } from "@/lib/hooks/useDiscordOnboarding";
import DiscordOnboardingModal from "@/components/discord/onboarding/DiscordOnboardingModal";
import { ethoneIcon } from "@/components/EthoneIcon";
import { useModuleStatus } from "@/lib/hooks/useModuleStatus";
import ServerPicker from "@/components/discord/ServerPicker";
import BotInstallView from "@/components/discord/BotInstallView";
import ModuleNavigator, { type NavigatorCategory, type NavigatorModule } from "@/components/discord/ModuleNavigator";
import HubSidebar, { type ConsoleView, type HubView } from "@/components/discord/HubSidebar";
import ConsoleSettings from "@/components/discord/console/ConsoleSettings";
import ConsoleAccess from "@/components/discord/console/ConsoleAccess";
import ConsoleLogs from "@/components/discord/console/ConsoleLogs";
import ConsoleWhitelist from "@/components/discord/console/ConsoleWhitelist";
import ConsoleBlacklist from "@/components/discord/console/ConsoleBlacklist";
import ConsoleMembers from "@/components/discord/console/ConsoleMembers";
import ConsoleCommands from "@/components/discord/console/ConsoleCommands";
import ConsoleTools from "@/components/discord/console/ConsoleTools";
import ConsoleProtections from "@/components/discord/console/ConsoleProtections";
import ModuleEmbed from "@/components/discord/console/ModuleEmbed";
import GuildOverviewScreen from "@/components/discord/GuildOverviewScreen";
import GuildAssistedSetup from "@/components/discord/GuildAssistedSetup";
import GuildSecurityScan from "@/components/discord/GuildSecurityScan";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_SNAP, SPRING_PRESS } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { fetchBotPresence } from "@/lib/hooks/useBotGuildIds";
import { useI18n } from "@/lib/hooks/useI18n";

function CloudCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

const BOT_CLIENT_ID = "1545139931154878464";
const PICKED_STORAGE_KEY = "ethone:discord:picked";
const LAST_GUILD_STORAGE_KEY = "ethone:discord:last-guild-id";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

type ModuleType =
  | "overview"
  | "security"
  | "commands"
  | "suggestions"
  | "leveling"
  | "giveaways"
  | "tickets"
  | "welcome"
  | "moderation"
  | "logs"
  | "music"
  | "invites"
  | "voice"
  | "backups"
  | "ai"
  | "forms"
  | "polls"
  | "roles"
  | "analytics"
  | "events"
  | "server"
  | "starboard"
  | "sticky"
  | "reminders"
  | "afk"
  | "counting"
  | "stats"
  | "statroles"
  | "secureroles"
  | "settings"
  | "birthdays"
  | "tags"
  | "serverstats"
  | "highlights"
  | "bot";

interface BotModule {
  id: ModuleType;
  title: string;
  description: string;
  icon: any;
  color: string;
  badge: string;
}

/** Teinte douce de chaque module dans la grille du hub (repérage rapide sans nuire à la lisibilité). */
const MODULE_TINTS: Record<string, string> = {
  overview: "text-indigo-400", security: "text-[var(--accent-primary)]", commands: "text-sky-400", suggestions: "text-yellow-300",
  leveling: "text-amber-400", giveaways: "text-pink-400", tickets: "text-orange-400", welcome: "text-fuchsia-400",
  moderation: "text-red-400", logs: "text-[var(--text-primary)]/85", music: "text-[var(--accent-primary)]", invites: "text-teal-400",
  voice: "text-cyan-400", backups: "text-blue-400", ai: "text-violet-400", forms: "text-lime-400",
  polls: "text-purple-400", roles: "text-rose-400", analytics: "text-indigo-300", events: "text-orange-300",
  server: "text-zinc-300", starboard: "text-yellow-400", sticky: "text-amber-300", reminders: "text-sky-300",
  afk: "text-blue-300", counting: "text-teal-300", stats: "text-sky-300", statroles: "text-amber-300", secureroles: "text-[var(--accent-primary)]", settings: "text-[var(--text-primary)]/85", birthdays: "text-pink-300", tags: "text-cyan-300", serverstats: "text-[var(--accent-primary)]",
  highlights: "text-lime-300", bot: "text-indigo-400", streamers: "text-purple-400", games: "text-amber-400",
};

/** Page complète de chaque module (le bouton ↗ de la carte). */
const MODULE_PAGES: Record<string, string> = {
  overview: "/discord/overview", security: "/discord/security/anti-raid", commands: "/discord/commands", suggestions: "/discord/suggestions",
  leveling: "/discord/leveling", giveaways: "/discord/giveaways", tickets: "/discord/tickets", welcome: "/discord/welcome",
  moderation: "/discord/moderation", logs: "/discord/logs", music: "/discord/music", invites: "/discord/invites", voice: "/discord/voice",
  backups: "/discord/backups", ai: "/discord/ai", forms: "/discord/forms", polls: "/discord/polls", roles: "/discord/roles",
  analytics: "/discord/analytics", events: "/discord/events", server: "/discord/server", starboard: "/discord/starboard",
  sticky: "/discord/sticky", reminders: "/discord/reminders", afk: "/discord/afk", counting: "/discord/counting", stats: "/discord/stats", statroles: "/discord/statroles", secureroles: "/discord/secure-roles", settings: "/discord/settings", birthdays: "/discord/birthdays", tags: "/discord/tags",
  serverstats: "/discord/server-stats", automodnative: "/discord/automod-native", highlights: "/discord/highlights", bot: "/discord/bot", economy: "/discord/economy", calendar: "/discord/calendar", streamers: "/discord/streamers", games: "/discord/games",
};

/** Regroupement façon Dyno / MEE6 : l'utilisateur cherche par intention (protéger, animer, gérer), pas par nom technique. */
const MODULE_CATEGORIES: NavigatorCategory[] = [
  { id: "protect", label: "Sécurité & modération", hint: "Protégez le serveur", modules: ["security", "secureroles", "moderation", "automodnative", "logs", "backups"] },
  { id: "community", label: "Communauté", hint: "Accueillez et animez vos membres", modules: ["welcome", "roles", "statroles", "leveling", "invites", "suggestions", "polls", "forms", "starboard", "highlights", "birthdays"] },
  { id: "fun", label: "Animation & médias", hint: "Musique, jeux et événements", modules: ["streamers", "games", "music", "giveaways", "economy", "counting", "events", "calendar", "voice"] },
  { id: "tools", label: "Outils du quotidien", hint: "Support et automatisations", modules: ["tickets", "commands", "tags", "reminders", "sticky", "afk", "serverstats"] },
  { id: "manage", label: "Gestion & intelligence", hint: "Vue globale, IA et bot", modules: ["overview", "server", "settings", "analytics", "stats", "ai", "bot"] },
];

/** Sélection mise en avant par le filtre rapide « Recommandés » du hub (couvre sécurité, accueil, animation, support). */
const RECOMMENDED_MODULE_IDS = ["security", "welcome", "moderation", "leveling", "tickets", "music"];

const MODULE_ICONS = {
  overview: ethoneIcon("mod-overview"),
  security: ethoneIcon("mod-security"),
  commands: ethoneIcon("mod-commands"),
  suggestions: ethoneIcon("mod-suggestions"),
  leveling: ethoneIcon("mod-leveling"),
  giveaways: ethoneIcon("mod-giveaways"),
  tickets: ethoneIcon("mod-tickets"),
  welcome: ethoneIcon("mod-welcome"),
  moderation: ethoneIcon("mod-moderation"),
  logs: ethoneIcon("mod-logs"),
  music: ethoneIcon("mod-music"),
  invites: ethoneIcon("mod-invites"),
  voice: ethoneIcon("mod-voice"),
  backups: ethoneIcon("mod-backups"),
  ai: ethoneIcon("mod-ai"),
  forms: ethoneIcon("mod-forms"),
  polls: ethoneIcon("mod-polls"),
  roles: ethoneIcon("mod-roles"),
  analytics: ethoneIcon("mod-analytics"),
  events: ethoneIcon("mod-events"),
  server: ethoneIcon("mod-server"),
  starboard: ethoneIcon("mod-starboard"),
  sticky: ethoneIcon("mod-sticky"),
  reminders: ethoneIcon("mod-reminders"),
  afk: ethoneIcon("mod-afk"),
  counting: ethoneIcon("mod-counting"),
  stats: ethoneIcon("mod-stats"),
  statroles: ethoneIcon("mod-roles"),
  secureroles: ethoneIcon("mod-security"),
  settings: ethoneIcon("mod-commands"),
  birthdays: ethoneIcon("mod-birthdays"),
  tags: ethoneIcon("mod-tags"),
  serverstats: ethoneIcon("mod-serverstats"),
  highlights: ethoneIcon("mod-highlights"),
  bot: ethoneIcon("mod-bot"),
  streamers: ethoneIcon("mod-events"),
  games: ethoneIcon("games"),
};

const MODULES: BotModule[] = [
  {
    id: "overview",
    title: "Vue d'ensemble",
    description: "Statut du bot, modération, sécurité, musique, tickets, giveaways, backups et activité récente en un coup d'œil.",
    icon: MODULE_ICONS.overview,
    color: "text-[var(--accent-primary)]",
    badge: "Mission Control",
  },
  {
    id: "security",
    title: "Sécurité & Anti-Raid",
    description: "Protection contre les raids, mass joins, anti-spam et verrouillage d'urgence.",
    icon: MODULE_ICONS.security,
    color: "text-[var(--text-muted)]",
    badge: "Sécurité",
  },
  {
    id: "commands",
    title: "Command Builder",
    description: "Créez vos commandes Discord personnalisées avec réponses textes et embeds.",
    icon: MODULE_ICONS.commands,
    color: "text-[var(--text-muted)]",
    badge: "Custom",
  },
  {
    id: "suggestions",
    title: "Boîte à Suggestions",
    description: "Système de boîte à idées avec votes communautaires et statuts.",
    icon: MODULE_ICONS.suggestions,
    color: "text-[var(--text-muted)]",
    badge: "Communauté",
  },
  {
    id: "leveling",
    title: "Leveling & Rôles XP",
    description: "Gain d'expérience par messages et distribution automatique de rôles.",
    icon: MODULE_ICONS.leveling,
    color: "text-[var(--text-muted)]",
    badge: "Progression",
  },
  {
    id: "giveaways",
    title: "Tirages au sort",
    description: "Création et gestion de concours avec sélection aléatoire de gagnants.",
    icon: MODULE_ICONS.giveaways,
    color: "text-[var(--text-muted)]",
    badge: "Événements",
  },
  {
    id: "tickets",
    title: "Tickets Center",
    description: "Helpdesk professionnel, formulaires, équipes de staff, transcripts et statistiques.",
    icon: MODULE_ICONS.tickets,
    color: "text-[var(--text-muted)]",
    badge: "Helpdesk",
  },
  {
    id: "welcome",
    title: "Bienvenue & Onboarding",
    description: "Messages d'accueil, embeds, cartes de bienvenue, auto-rôles, vérification et onboarding complet.",
    icon: MODULE_ICONS.welcome,
    color: "text-[var(--text-muted)]",
    badge: "Onboarding",
  },
  {
    id: "moderation",
    title: "Modération & Sanctions",
    description: "Réglages des avertissements, mutes, expulsions et bannissements.",
    icon: MODULE_ICONS.moderation,
    color: "text-[var(--text-muted)]",
    badge: "Staff",
  },
  {
    id: "logs",
    title: "Journal d'Audit",
    description: "Configuration des salons de logs pour messages et événements serveurs.",
    icon: MODULE_ICONS.logs,
    color: "text-[var(--text-muted)]",
    badge: "Surveillance",
  },
  {
    id: "music",
    title: "Lecteur Musique",
    description: "Contrôle en direct de la musique vocale, queue, playlists et mode DJ.",
    icon: MODULE_ICONS.music,
    color: "text-[var(--text-muted)]",
    badge: "Live Audio",
  },
  {
    id: "invites",
    title: "Invites & Parrainages",
    description: "Tracking précis des invitations Discord, détection des faux joins, scores de risque et récompenses.",
    icon: MODULE_ICONS.invites,
    color: "text-[var(--text-muted)]",
    badge: "Croissance",
  },
  {
    id: "voice",
    title: "Salons Vocaux",
    description: "Join-to-Create, salons temporaires automatiques, hubs et contrôle Discord.",
    icon: MODULE_ICONS.voice,
    color: "text-[var(--text-muted)]",
    badge: "Vocal",
  },
  {
    id: "backups",
    title: "Sauvegardes & Disaster Recovery",
    description: "Snapshots immuables, restauration sécurisée, comparateur diff et planification automatique.",
    icon: MODULE_ICONS.backups,
    color: "text-[var(--text-muted)]",
    badge: "Recovery",
  },
  {
    id: "ai",
    title: "AI Assistant",
    description: "Assistant IA Discord intelligent, base RAG sémantique, builder de personnalité et outils support.",
    icon: MODULE_ICONS.ai,
    color: "text-[var(--text-muted)]",
    badge: "GenAI",
  },
  {
    id: "forms",
    title: "Forms & Applications",
    description: "Form Builder no-code, candidatures staff, logique conditionnelle, scoring et review.",
    icon: MODULE_ICONS.forms,
    color: "text-[var(--text-muted)]",
    badge: "Recrutement",
  },
  {
    id: "polls",
    title: "Sondages & Votes",
    description: "Sondages démocratiques, votes pondérés par rôles, décisions staff, quorums et bulletins secrets.",
    icon: MODULE_ICONS.polls,
    color: "text-[var(--text-muted)]",
    badge: "Démocratie",
  },
  {
    id: "roles",
    title: "Reaction Roles & Auto-Roles",
    description: "Panneaux de sélection de rôles par boutons et menus déroulants, join-roles et rôles temporaires.",
    icon: MODULE_ICONS.roles,
    color: "text-[var(--text-muted)]",
    badge: "Rôles",
  },
  {
    id: "analytics",
    title: "Vue d'Ensemble & Insights",
    description: "Informations générales sur l'état du serveur et statistiques d'utilisation.",
    icon: MODULE_ICONS.analytics,
    color: "text-[var(--text-muted)]",
    badge: "Données",
  },
  {
    id: "events",
    title: "Événements & Calendrier",
    description: "Planification d'événements, calendrier interactif, gestion des RSVP, jauges et rappels automatiques Discord.",
    icon: MODULE_ICONS.events,
    color: "text-[var(--text-muted)]",
    badge: "Événements",
  },
  {
    id: "server",
    title: "Server Management Center",
    description: "Centre de gestion globale : diagnostics santé, score de sécurité, membres, salons, rôles, permissions et emojis.",
    icon: MODULE_ICONS.server,
    color: "text-[var(--text-muted)]",
    badge: "Serveur",
  },
  {
    id: "starboard",
    title: "Starboard",
    description: "Le hall of fame des messages : republication automatique des messages les plus étoilés du serveur.",
    icon: MODULE_ICONS.starboard,
    color: "text-[var(--text-muted)]",
    badge: "Communauté",
  },
  {
    id: "sticky",
    title: "Sticky Messages",
    description: "Garde un message important toujours visible en bas d'un salon : le bot le repositionne automatiquement.",
    icon: MODULE_ICONS.sticky,
    color: "text-[var(--text-muted)]",
    badge: "Communauté",
  },
  {
    id: "reminders",
    title: "Reminders",
    description: "« Rappelle-moi » : programme des rappels personnels que le bot t'envoie à l'échéance, ponctuels ou récurrents.",
    icon: MODULE_ICONS.reminders,
    color: "text-[var(--text-muted)]",
    badge: "Utilitaires",
  },
  {
    id: "settings",
    title: "Paramètres",
    description: "Langue, fuseau horaire, contacts d'urgence prévenus en cas de problème sérieux, préfixe et commandes du bot.",
    icon: MODULE_ICONS.settings,
    color: "text-[var(--text-muted)]",
    badge: "Serveur",
  },
  {
    id: "secureroles",
    title: "Rôles sécurisés",
    description: "Les permissions sensibles de votre équipe (bannir, gérer les rôles…) ne s'activent qu'après un code à usage unique : un compte volé n'a aucun pouvoir.",
    icon: MODULE_ICONS.secureroles,
    color: "text-[var(--text-muted)]",
    badge: "Sécurité",
  },
  {
    id: "statroles",
    title: "Statroles",
    description: "Rôles donnés et retirés automatiquement selon l'activité : messages, vocal, ancienneté, avec un constructeur de conditions.",
    icon: MODULE_ICONS.statroles,
    color: "text-[var(--text-muted)]",
    badge: "Communauté",
  },
  {
    id: "stats",
    title: "Statistiques",
    description: "Messages et vocal par jour, évolution des membres, classements et fiche par membre, comme Statbot.",
    icon: MODULE_ICONS.stats,
    color: "text-[var(--text-muted)]",
    badge: "Gestion",
  },
  {
    id: "counting",
    title: "Comptage",
    description: "Jeu collectif : les membres comptent 1, 2, 3… à tour de rôle dans un salon, avec record et classement.",
    icon: MODULE_ICONS.counting,
    color: "text-[var(--text-muted)]",
    badge: "Animation",
  },
  {
    id: "afk",
    title: "AFK",
    description: "Statut absent : le bot prévient ceux qui te mentionnent et retire ton statut dès que tu reparles.",
    icon: MODULE_ICONS.afk,
    color: "text-[var(--text-muted)]",
    badge: "Utilitaires",
  },
  {
    id: "birthdays",
    title: "Birthdays",
    description: "Anniversaires des membres : annonce quotidienne dans un salon + rôle du jour automatique.",
    icon: MODULE_ICONS.birthdays,
    color: "text-[var(--text-muted)]",
    badge: "Communauté",
  },
  {
    id: "tags",
    title: "Tags",
    description: "Réponses réutilisables du serveur : FAQ, formats de candidature, liens récurrents, via /tag.",
    icon: MODULE_ICONS.tags,
    color: "text-[var(--text-muted)]",
    badge: "Utilitaires",
  },
  {
    id: "serverstats",
    title: "Server Stats",
    description: "Salons compteurs : le nom d'un salon affiche le nombre de membres, de boosts, de membres en ligne…",
    icon: MODULE_ICONS.serverstats,
    color: "text-[var(--text-muted)]",
    badge: "Utilitaires",
  },
  {
    id: "highlights",
    title: "Highlights",
    description: "Mots-clés personnels surveillés : reçois un DM quand quelqu'un d'autre les mentionne dans le serveur.",
    icon: MODULE_ICONS.highlights,
    color: "text-[var(--text-muted)]",
    badge: "Personnel",
  },
  {
    id: "bot",
    title: "Bot Control Center",
    description: "Console centrale du bot : télémétrie temps réel, santé des modules, commandes, bus d'événements, diagnostics et intelligence.",
    icon: MODULE_ICONS.bot,
    color: "text-[var(--text-muted)]",
    badge: "Bot Core",
  },
];

/** Modules ayant un panneau de configuration rapide dans cette page ; les autres ouvrent directement leur page. */
// Sans `?guildId=`, faute de valeur dynamique à ce niveau (module-scope) : le lien « Ouvrir la page complète » de
// chaque carte (icône ↗, ModuleNavigator.tsx) atterrissait sur le premier serveur du bot plutôt que celui affiché
// ici. `useNavModules` ci-dessous complète ces hrefs avec le serveur sélectionné avant de les passer au composant.
const NAV_MODULES_BASE: NavigatorModule[] = [
  ...MODULES.map((m) => ({ id: m.id, title: m.title, description: m.description, icon: m.icon, tint: MODULE_TINTS[m.id] ?? m.color, href: MODULE_PAGES[m.id] ?? `/discord/${m.id}` })),
  { id: "economy", title: "Économie & Boutique", description: "Monnaie du serveur, récompense quotidienne, boutique de rôles et classement.", icon: ethoneIcon("mod-economy"), tint: "text-yellow-300", href: MODULE_PAGES.economy },
  { id: "calendar", title: "Calendrier", description: "Vue mensuelle des événements, anniversaires et rappels du serveur.", icon: ethoneIcon("calendar"), tint: "text-orange-300", href: MODULE_PAGES.calendar },
  { id: "automodnative", title: "AutoMod natif Discord", description: "Règles d'auto-modération intégrées à Discord (mots-clés, spam, mentions), exécutées même si le bot est hors ligne.", icon: MODULE_ICONS.security, tint: "text-red-300", href: MODULE_PAGES.automodnative },
  { id: "streamers", title: "Alertes Streamers", description: "Notifications en direct Twitch, YouTube & Kick avec rôle @En Live automatique et embeds animés.", icon: MODULE_ICONS.streamers, tint: "text-purple-400", href: MODULE_PAGES.streamers },
  { id: "games", title: "Mini-Jeux & Casino", description: "Blackjack 21, Roulette Royale, Duels de dés PvP, cagnotte progressive et quêtes actives.", icon: MODULE_ICONS.games, tint: "text-amber-400", href: MODULE_PAGES.games },
];
/** Modules affichés dans la console (page complète intégrée, voir ModuleEmbed). */
const INLINE_MODULE_IDS = new Set<string>(NAV_MODULES_BASE.map((m) => m.id));


// Vérification de permission : Propriétaire OU Administrateur (0x8) OU Gérer le serveur (0x20)
function canManageGuild(guild: DiscordGuild): boolean {
  if (guild.owner) return true;
  if (!guild.permissions) return false;
  try {
    const perms = BigInt(guild.permissions);
    const admin = BigInt(8);
    const manageGuild = BigInt(32);
    return (perms & admin) === admin || (perms & manageGuild) === manageGuild;
  } catch {
    const num = Number(guild.permissions);
    return (num & 8) === 8 || (num & 32) === 32;
  }
}

interface GuildSettings {
  prefix: string;
  antiRaidEnabled: boolean;
  antiSpamEnabled: boolean;
  mentionLimit: number;
  emergencyLockdown: boolean;
  customCommands: Array<{ name: string; response: string; enabled: boolean }>;
}

const DEFAULT_SETTINGS: GuildSettings = {
  prefix: "!",
  antiRaidEnabled: true,
  antiSpamEnabled: true,
  mentionLimit: 5,
  emergencyLockdown: false,
  customCommands: [
    { name: "regles", response: "Bienvenue sur le serveur ! Merci de respecter les membres et de ne pas spammer.", enabled: true },
    { name: "site", response: "Découvrez notre plateforme sur https://ethone.dev", enabled: true },
  ],
};

export default function DiscordDashboardPage() {
  const i18n = useI18n();
  const { success, info, error: showError } = useToast();
  const { profile, loading: discordLoading, connect } = useDiscordOAuth();
  const {
    isOpen: isOnboardingOpen,
    currentStep: onboardingStep,
    setCurrentStep: setOnboardingStep,
    openOnboarding,
    closeOnboarding,
    completeOnboarding,
    prefersReducedMotion,
  } = useDiscordOnboarding();

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [skippedInstallGuildIds, setSkippedInstallGuildIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem("ethone:discord:skipped_install_guilds");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch {}
    return new Set();
  });
  const [lastGuildId, setLastGuildId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [showAllModules, setShowAllModules] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [consoleView, setConsoleView] = useState<ConsoleView | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { reduced: motionReduced } = useMotionPref();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [onlyManageable, setOnlyManageable] = useState(true);
  // IDs of the servers the bot is actually in — used to sort those first and
  // show an "invite" affordance on the rest. `botPresenceKnown` stays false when
  // the bot API is unreachable / not authenticated, so we don't wrongly label
  // every server "à ajouter".
  const [botGuildIds, setBotGuildIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("ethone:discord:bot_guild_ids");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch {}
    return new Set();
  });
  const [botPresenceKnown, setBotPresenceKnown] = useState(false);
  // 401 du bot : la session Discord du BOT (cookie) est absente, distincte de la session du site.
  const [botAuthRequired, setBotAuthRequired] = useState(false);

  // Serveurs réels de l'utilisateur (ZÉRO FAKE INFO)
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("ethone:discord:guilds");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  }, [profile?.guilds]);

  // Où le bot est-il installé parmi MES serveurs ? L'ancien appel
  // (/api/bot/presence/servers) était réservé au bot owner → 403 pour tout
  // autre compte, donc aucun serveur n'était jamais marqué. /api/guild-presence
  // ne demande qu'une session valide et ne renvoie que l'intersection.
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    if (!api || allGuilds.length === 0) return;
    let cancelled = false;
    // Même appel partagé que les autres pages du bot (cache 60 s) : plus de requête relancée à chaque rendu.
    fetchBotPresence(allGuilds.map((g) => g.id))
      .then((res) => {
        if (res.status !== 200) throw new Error(String(res.status));
        if (cancelled) return;
        const present = res.present;
        setBotGuildIds(new Set(present));
        try {
          localStorage.setItem("ethone:discord:bot_guild_ids", JSON.stringify(present));
        } catch {}
        setBotPresenceKnown(true);
        setBotAuthRequired(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setBotPresenceKnown(false);
        setBotAuthRequired(err instanceof Error && err.message === "401");
      });
    return () => {
      cancelled = true;
    };
  }, [allGuilds]);

  // Filtrage : uniquement les serveurs où l'utilisateur est Admin / Owner
  const displayGuilds: DiscordGuild[] = useMemo(() => {
    if (!onlyManageable) return allGuilds;
    const manageable = allGuilds.filter((g) => canManageGuild(g));
    // If user has guilds but none strictly flagged with canManageGuild, show all so user isn't stuck
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, onlyManageable]);

  // Bot installé d'abord, puis le dernier serveur utilisé, ordre d'origine sinon.
  const filteredGuilds = useMemo(() => {
    const rank = (g: DiscordGuild) => (botGuildIds.has(g.id) ? 0 : 2) + (g.id === lastGuildId ? 0 : 1);
    return [...displayGuilds].sort((a, b) => rank(a) - rank(b));
  }, [displayGuilds, botGuildIds, lastGuildId]);

  const selectedGuild = useMemo(() => (pickedId ? allGuilds.find((g) => g.id === pickedId) ?? null : null), [allGuilds, pickedId]);

  const router = useRouter();
  /** Carte cliquée : configuration rapide sur place si le module en a une, sinon ouverture de sa page. */
  const handleSelectModule = useCallback(
    (id: string) => {
      setMenuOpen(false);
      setShowScan(false);
      setConsoleView(null);
      // Sécurité = page Protections de la console (anti-raid et anti-nuke réunis).
      if (id === "security") {
        setActiveModule(null);
        setShowSetup(false);
        setShowAllModules(false);
        setConsoleView("protections");
        return;
      }
      if (INLINE_MODULE_IDS.has(id)) {
        setActiveModule(id as ModuleType);
      } else {
        router.push(`${MODULE_PAGES[id] ?? `/discord/${id}`}?guildId=${selectedGuild?.id ?? ""}`);
      }
    },
    [router, selectedGuild?.id]
  );
  const goHome = useCallback(() => {
    setActiveModule(null);
    setShowAllModules(false);
    setShowSetup(false);
    setShowScan(false);
    setConsoleView(null);
    setMenuOpen(false);
  }, []);
  const goAllModules = useCallback(() => {
    setActiveModule(null);
    setShowAllModules(true);
    setShowSetup(false);
    setShowScan(false);
    setConsoleView(null);
    setMenuOpen(false);
  }, []);
  const goSetup = useCallback(() => {
    setActiveModule(null);
    setShowAllModules(false);
    setShowSetup(true);
    setShowScan(false);
    setConsoleView(null);
    setMenuOpen(false);
  }, []);
  const [logsTab, setLogsTab] = useState<"incidents" | "channels">("incidents");
  const openConsoleView = useCallback((v: ConsoleView, opts?: { logsTab?: "incidents" | "channels" }) => {
    setLogsTab(opts?.logsTab ?? "incidents");
    setActiveModule(null);
    setShowAllModules(false);
    setShowSetup(false);
    setShowScan(false);
    setConsoleView(v);
    setMenuOpen(false);
  }, []);
  const goScan = useCallback(() => {
    setActiveModule(null);
    setShowAllModules(false);
    setShowSetup(false);
    setShowScan(true);
    setMenuOpen(false);
  }, []);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeModule, showAllModules, showSetup, showScan]);
  // Chaque carte a un lien « Ouvrir la page complète » distinct de son clic principal (voir NAV_MODULES_BASE) :
  // il doit pointer vers le serveur affiché ici, pas vers celui que la page de destination devinerait sans indice.
  const navModules = useMemo(
    () =>
      selectedGuild
        ? NAV_MODULES_BASE.map((m) => ({ ...m, href: `${m.href}${m.href.includes("?") ? "&" : "?"}guildId=${selectedGuild.id}` }))
        : NAV_MODULES_BASE,
    [selectedGuild]
  );
  // Au chargement : `?guildId=` (lien depuis une sous-page) ou serveur choisi plus tôt dans cette visite.
  // Lu dans un effet (export statique : pas de useSearchParams sans Suspense).
  useEffect(() => {
    let id: string | null = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      id = sp.get("guildId");
      if (sp.get("view") === "setup") {
        setShowSetup(true);
      } else if (sp.get("view") === "scan" || sp.get("tab") === "scan") {
        setShowScan(true);
      } else if (["settings", "access", "logs", "whitelist", "blacklist", "members", "commands", "tools", "protections"].includes(sp.get("view") ?? "")) {
        setConsoleView(sp.get("view") as ConsoleView);
      } else if (sp.get("module") && INLINE_MODULE_IDS.has(sp.get("module")!)) {
        // Lien direct vers un module affiché dans la console (?module=leveling).
        setActiveModule(sp.get("module") as ModuleType);
      }
    } catch {}
    try {
      if (!id) id = sessionStorage.getItem(PICKED_STORAGE_KEY);
      setLastGuildId(localStorage.getItem(LAST_GUILD_STORAGE_KEY));
    } catch {}
    if (id) {
      setPickedId(id);
      try {
        sessionStorage.setItem(PICKED_STORAGE_KEY, id);
      } catch {}
    }
    setHydrated(true);
  }, []);

  // Serveur choisi introuvable dans la liste (compte différent, serveur quitté) : retour au sélecteur.
  useEffect(() => {
    if (!hydrated || !pickedId || selectedGuild || discordLoading) return;
    setPickedId(null);
    try {
      sessionStorage.removeItem(PICKED_STORAGE_KEY);
    } catch {}
  }, [hydrated, pickedId, selectedGuild, discordLoading]);

  const pickGuild = useCallback((guild: DiscordGuild) => {
    setPickedId(guild.id);
    setSkippedInstallGuildIds((prev) => {
      if (!prev.has(guild.id)) return prev;
      const next = new Set(prev);
      next.delete(guild.id);
      try {
        sessionStorage.setItem("ethone:discord:skipped_install_guilds", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    try {
      sessionStorage.setItem(PICKED_STORAGE_KEY, guild.id);
      localStorage.setItem(LAST_GUILD_STORAGE_KEY, guild.id);
    } catch {}
    setLastGuildId(guild.id);
  }, []);

  const changeGuild = useCallback(() => {
    setPickedId(null);
    setShowScan(false);
    setConsoleView(null);
    setShowSetup(false);
    setShowAllModules(false);
    setActiveModule(null);
    try {
      sessionStorage.removeItem(PICKED_STORAGE_KEY);
    } catch {}
  }, []);

  // Rien à afficher tant qu'on ignore quel serveur était choisi (évite un flash du sélecteur).
  const pageReady = hydrated && !(pickedId && !selectedGuild && discordLoading);

  // Paramètres réels du serveur sélectionné avec persistance locale par guildId
  const [guildSettings, setGuildSettings] = useState<GuildSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  // Salon de notification des sanctions : géré à part de `guildSettings` car sa vérité est côté bot
  // (sanctionService.getConfig), pas localStorage — évite de laisser croire qu'il est « sauvegardé »
  // localement alors qu'aucun backend ne le lisait (l'ancien champ texte libre ne faisait jamais rien).
  const [modLogChannelId, setModLogChannelId] = useState<string | null>(null);

  // Charger les paramètres du serveur sélectionné : préfixe + anti-raid + salon de notification des
  // sanctions depuis le bot quand il est joignable, sinon la copie locale. Avant, TOUT venait du
  // localStorage et « Enregistrer » n'envoyait jamais rien au bot.
  useEffect(() => {
    if (!selectedGuild) return;
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    let local: GuildSettings = DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(`ethone:discord:settings:${selectedGuild.id}`);
      if (saved) local = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    setGuildSettings(local);
    setModLogChannelId(null);
    if (!api) return;
    // Si la présence du bot est connue et qu'il n'est pas sur ce serveur, on n'appelle pas l'API
    if (botPresenceKnown && !botGuildIds.has(selectedGuild.id)) return;

    let cancelled = false;
    const base = `${api}/api/guilds/${selectedGuild.id}`;
    Promise.all([
      fetch(`${base}/settings`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}/anti-raid/config`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}/moderation/mod-log-channel`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([settingsRes, raidRes, modLogRes]) => {
      if (cancelled) return;
      setGuildSettings((prev) => ({
        ...prev,
        ...(settingsRes?.config?.prefix ? { prefix: settingsRes.config.prefix } : {}),
        ...(raidRes?.config
          ? {
              antiRaidEnabled: Boolean(raidRes.config.enabled),
              antiSpamEnabled: Boolean(raidRes.config.messageRaid?.enabled),
              mentionLimit:
                raidRes.config.mentionRaid?.enabled === false
                  ? 0
                  : typeof raidRes.config.mentionRaid?.maxMentionsPerMessage === "number"
                  ? raidRes.config.mentionRaid.maxMentionsPerMessage
                  : prev.mentionLimit,
            }
          : {}),
      }));
      if (modLogRes && typeof modLogRes.modLogChannelId !== "undefined") setModLogChannelId(modLogRes.modLogChannelId);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedGuild, botPresenceKnown, botGuildIds]);

  // Utilitaires : Copie ID, Exporter / Importer Configuration
  const [copiedId, setCopiedId] = useState(false);
  const handleCopyId = useCallback(() => {
    if (!selectedGuild) return;
    navigator.clipboard.writeText(selectedGuild.id);
    setCopiedId(true);
    success("ID copié", `L'identifiant de "${selectedGuild.name}" a été copié.`);
    setTimeout(() => setCopiedId(false), 2000);
  }, [selectedGuild, success]);

  const handleExportConfig = useCallback(() => {
    if (!selectedGuild) return;
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      guild: {
        id: selectedGuild.id,
        name: selectedGuild.name,
      },
      settings: guildSettings,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethone-config-${selectedGuild.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${selectedGuild.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success("Configuration exportée", "Le fichier de sauvegarde JSON a été téléchargé.");
  }, [selectedGuild, guildSettings, success]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleImportConfig = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (!parsed || typeof parsed !== "object") throw new Error("Format JSON invalide");
          const imported = parsed.settings || parsed;
          setGuildSettings((prev) => ({
            ...prev,
            ...(imported.prefix ? { prefix: String(imported.prefix) } : {}),
            ...(typeof imported.antiRaidEnabled === "boolean" ? { antiRaidEnabled: imported.antiRaidEnabled } : {}),
            ...(typeof imported.antiSpamEnabled === "boolean" ? { antiSpamEnabled: imported.antiSpamEnabled } : {}),
            ...(typeof imported.mentionLimit === "number" ? { mentionLimit: imported.mentionLimit } : {}),
            ...(Array.isArray(imported.customCommands) ? { customCommands: imported.customCommands } : {}),
          }));
          success("Configuration importée", "Les réglages ont été appliqués. Cliquez sur « Enregistrer » pour les synchroniser.");
        } catch (err: any) {
          showError("Erreur d'import", err.message || "Fichier de configuration invalide.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [success, showError]
  );

  // Sauvegarder : préfixe → PATCH /settings, anti-raid/anti-spam/mentions →
  // PUT /anti-raid/config, salon de notification des sanctions → PUT
  // /moderation/mod-log-channel. Tous les champs de ce formulaire ont
  // désormais un backend réel (les 3 champs fantômes qui n'en avaient
  // aucun — canal de suggestions, taux et cooldown XP — ont été retirés).
  const handleSaveSettings = useCallback(async () => {
    if (!selectedGuild) return;
    setIsSaving(true);
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    try {
      localStorage.setItem(`ethone:discord:settings:${selectedGuild.id}`, JSON.stringify(guildSettings));
    } catch {}
    if (!api) {
      success("Configuration enregistrée (local)", "API du bot non configurée — réglages gardés dans ce navigateur.");
      setIsSaving(false);
      return;
    }
    if (botPresenceKnown && !botGuildIds.has(selectedGuild.id)) {
      info("Sauvegardé localement", `Le bot n'est pas encore installé sur "${selectedGuild.name}". Les réglages seront synchronisés dès son invitation.`);
      setIsSaving(false);
      return;
    }
    const base = `${api}/api/guilds/${selectedGuild.id}`;
    try {
      let currentRaidConfig: any = null;
      try {
        const getRes = await fetch(`${base}/anti-raid/config`, { credentials: "include" });
        if (getRes.ok) {
          const data = await getRes.json().catch(() => null);
          currentRaidConfig = data?.config;
        }
      } catch {}

      const [settingsRes, raidRes, modLogRes] = await Promise.all([
        fetch(`${base}/settings`, {
          method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({ prefix: guildSettings.prefix }),
        }),
        fetch(`${base}/anti-raid/config`, {
          method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(currentRaidConfig || {}),
            enabled: guildSettings.antiRaidEnabled,
            messageRaid: {
              ...(currentRaidConfig?.messageRaid || {}),
              enabled: guildSettings.antiSpamEnabled,
            },
            mentionRaid: {
              ...(currentRaidConfig?.mentionRaid || {}),
              enabled: guildSettings.mentionLimit > 0,
              maxMentionsPerMessage: guildSettings.mentionLimit >= 2 ? guildSettings.mentionLimit : 5,
            },
          }),
        }),
        fetch(`${base}/moderation/mod-log-channel`, {
          method: "PUT", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelId: modLogChannelId }),
        }),
      ]);
      const failed: string[] = [];
      const formatError = async (res: Response, label: string) => {
        try {
          const data = await res.json().catch(() => null);
          const msg = formatApiError(data?.error, `${res.status}`);
          return `${label} (${msg})`;
        } catch {
          return `${label} (${res.status})`;
        }
      };
      if (!settingsRes.ok) failed.push(await formatError(settingsRes, "préfixe"));
      if (!raidRes.ok) failed.push(await formatError(raidRes, "anti-raid"));
      if (!modLogRes.ok) failed.push(await formatError(modLogRes, "salon de sanctions"));
      if (failed.length > 0) {
        showError("Enregistrement partiel", `Échec : ${failed.join(", ")}.`);
      } else {
        success("Configuration enregistrée", `Préfixe, protections et salon de sanctions appliqués sur "${selectedGuild.name}".`);
      }
    } catch {
      showError("Erreur de sauvegarde", "Le bot n'a pas répondu — réglages gardés localement.");
    } finally {
      setIsSaving(false);
    }
  }, [selectedGuild, guildSettings, modLogChannelId, botPresenceKnown, botGuildIds, success, info, showError]);


  // Gestion de création d'une nouvelle commande personnalisée



  const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
  const { status: moduleStatus, setModuleEnabled } = useModuleStatus(selectedGuild?.id, !botPresenceKnown || Boolean(selectedGuild && botGuildIds.has(selectedGuild.id)));
  // Modules dont le toggle est en cours d'envoi au bot : pastille de chargement sur la carte le temps de la réponse
  // (useModuleStatus fait déjà une mise à jour optimiste + rollback, mais n'expose pas cet état intermédiaire).
  const [pendingModuleIds, setPendingModuleIds] = useState<Set<string>>(new Set());
  const handleModuleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      setPendingModuleIds((prev) => new Set(prev).add(id));
      try {
        const ok = await setModuleEnabled(id, enabled);
        const title = NAV_MODULES_BASE.find((m) => m.id === id)?.title ?? id;
        if (ok) success(enabled ? "Module activé" : "Module désactivé", `${title} : ${enabled ? "ses commandes sont de nouveau disponibles." : "ses commandes répondent maintenant « module désactivé »."}`);
        else showError("Action refusée", `Impossible de modifier « ${title} » (droits ou bot injoignable).`);
      } finally {
        setPendingModuleIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [setModuleEnabled, success, showError]
  );
  const activeModuleCount = useMemo(() => Object.values(moduleStatus).filter(Boolean).length, [moduleStatus]);
  const totalModuleCount = MODULES.length;
  const isDiscordConnected = Boolean(
    profile?.connected ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("ethone:connected:discord") === "true" ||
        localStorage.getItem("ethone:token:discord")))
  );

  const botAbsent = botPresenceKnown && selectedGuild != null && !botGuildIds.has(selectedGuild.id);
  const botLoginHref = `${BOT_API_URL}/api/auth/login?return_to=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/discord` : "")}`;
  // Styles partagés par tous les panneaux de modules : la DA (surfaces, boutons, micro-interactions) se règle ici.
  const calloutCls = "flex flex-col gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-4 sm:flex-row sm:items-center sm:justify-between";
  const inviteBtnCls = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]";

  const onboardingModal = (
    <DiscordOnboardingModal
      isOpen={isOnboardingOpen}
      currentStep={onboardingStep}
      onStepChange={setOnboardingStep}
      onClose={closeOnboarding}
      onComplete={completeOnboarding}
      prefersReducedMotion={prefersReducedMotion}
    />
  );

  if (!pageReady) return <div className="min-h-[calc(100dvh-3rem)]" aria-busy="true" />;

  if (!selectedGuild) {
    return (
      <>
        <ServerPicker
          guilds={filteredGuilds}
          totalCount={allGuilds.length}
          botGuildIds={botGuildIds}
          botPresenceKnown={botPresenceKnown || botGuildIds.size > 0}
          inviteUrl={BOT_INVITE_URL}
          userName={isDiscordConnected ? profile?.user?.displayName || profile?.user?.username : undefined}
          userAvatar={isDiscordConnected ? profile?.user?.avatarUrl || profile?.user?.avatarUrlSmall || null : null}
          isConnected={isDiscordConnected}
          connecting={discordLoading}
          onConnect={connect}
          onlyManageable={onlyManageable}
          onToggleManageable={() => setOnlyManageable((v) => !v)}
          botAuthHref={botAuthRequired ? botLoginHref : null}
          onPick={pickGuild}
        />
        {onboardingModal}
      </>
    );
  }

  const isBotInstalled = botPresenceKnown
    ? botGuildIds.has(selectedGuild.id)
    : botGuildIds.size > 0
    ? botGuildIds.has(selectedGuild.id)
    : false;
  const isInstallSkipped = skippedInstallGuildIds.has(selectedGuild.id);

  if (!isBotInstalled && !isInstallSkipped) {
    return (
      <>
        <BotInstallView
          guild={selectedGuild}
          onBack={changeGuild}
          onBotDetected={(g) => {
            setBotGuildIds((prev) => new Set(prev).add(g.id));
            setSkippedInstallGuildIds((prev) => {
              if (!prev.has(g.id)) return prev;
              const next = new Set(prev);
              next.delete(g.id);
              try {
                sessionStorage.setItem("ethone:discord:skipped_install_guilds", JSON.stringify(Array.from(next)));
              } catch {}
              return next;
            });
            try {
              const stored = localStorage.getItem("ethone:discord:bot_guild_ids");
              const parsed = stored ? JSON.parse(stored) : [];
              if (Array.isArray(parsed) && !parsed.includes(g.id)) {
                localStorage.setItem(
                  "ethone:discord:bot_guild_ids",
                  JSON.stringify([...parsed, g.id])
                );
              }
            } catch {}
          }}
          onSkip={(g) => {
            setSkippedInstallGuildIds((prev) => {
              const next = new Set(prev).add(g.id);
              try {
                sessionStorage.setItem("ethone:discord:skipped_install_guilds", JSON.stringify(Array.from(next)));
              } catch {}
              return next;
            });
          }}
          userName={
            isDiscordConnected
              ? profile?.user?.displayName || profile?.user?.username
              : undefined
          }
          userAvatar={
            profile?.user?.avatarUrl || profile?.user?.avatarUrlSmall || null
          }
          botInviteUrl={BOT_INVITE_URL}
        />
        {onboardingModal}
      </>
    );
  }

  const userName = isDiscordConnected ? profile?.user?.displayName || profile?.user?.username : undefined;
  const activeMeta = activeModule ? (MODULES.find((m) => m.id === activeModule) ?? NAV_MODULES_BASE.find((m) => m.id === activeModule)) ?? null : null;
  const view: HubView = consoleView ?? (showScan ? "scan" : showSetup ? "setup" : activeModule ? "module" : showAllModules ? "modules" : "home");
  const inviteHref = `${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`;

  return (
    <>
      <div className="relative flex h-full min-h-0 w-full">
        <input type="file" ref={fileInputRef} onChange={handleImportConfig} accept=".json" className="hidden" />
        <HubSidebar
          guildName={selectedGuild.name}
          guildIconUrl={selectedGuild.iconUrl}
          guilds={filteredGuilds}
          selectedGuildId={selectedGuild.id}
          botGuildIds={botGuildIds}
          onSelectGuild={pickGuild}
          onChangeGuild={changeGuild}
          onOpenIntro={() => openOnboarding(0)}
          onOpenSetup={goSetup}
          onOpenScan={goScan}
          onExportConfig={handleExportConfig}
          onImportConfig={() => fileInputRef.current?.click()}
          onCopyGuildId={handleCopyId}
          copiedId={copiedId}
          onOpenView={openConsoleView}
          activeModuleCount={activeModuleCount}
          totalModuleCount={totalModuleCount}
          botInviteUrl={BOT_INVITE_URL}
          modules={navModules}
          categories={MODULE_CATEGORIES}
          view={view}
          activeId={activeModule ?? ""}
          status={moduleStatus}
          onHome={goHome}
          onAllModules={goAllModules}
          onSelect={handleSelectModule}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 sm:px-8 bg-[var(--surface-raised)]/40">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)] lg:hidden"
                aria-label="Ouvrir le menu des modules"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={changeGuild}
                  className="truncate max-w-[200px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {selectedGuild.name}
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="font-medium text-[var(--text-primary)]">
                  {view === "settings"
                    ? i18n("dSettings", "Réglages")
                    : view === "access"
                    ? i18n("dAccess", "Accès")
                    : view === "logs"
                    ? i18n("dLogs", "Logs")
                    : view === "whitelist"
                    ? i18n("dWhitelist", "Whitelist")
                    : view === "blacklist"
                    ? i18n("dBlacklist", "Blacklist")
                    : view === "members"
                    ? i18n("dRolesAndMembers", "Rôles et membres")
                    : view === "commands"
                    ? i18n("dCommands", "Commandes")
                    : view === "tools"
                    ? i18n("dTools", "Outils")
                    : view === "protections"
                    ? i18n("dProtections", "Protections")
                    : view === "scan"
                    ? i18n("dSecurityScan", "Scan de sécurité")
                    : view === "setup"
                    ? i18n("dAssistedSetup", "Configuration assistée")
                    : activeMeta
                    ? activeMeta.title
                    : showAllModules
                    ? i18n("dAllModules", "Tous les modules")
                    : i18n("dOverview", "Vue d'ensemble")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none"
                title="Cliquez pour forcer la synchronisation"
              >
                <CloudCheckIcon className={cn("h-4 w-4 shrink-0", isSaving ? "animate-pulse text-amber-400" : "text-emerald-400")} />
                <span className="font-normal">
                  {isSaving ? i18n("dSaving", "Sauvegarde...") : i18n("dAllSaved", "Tout est enregistré")}
                </span>
              </button>
            </div>
          </header>

          <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overscroll-behavior:contain]">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
              {(botAuthRequired || botAbsent) && (
                <div className="mb-6 space-y-3">
                  {botAuthRequired && (
                    <a href={botLoginHref} className={cn(calloutCls, "transition-colors hover:border-[var(--input-border-hover)]")}>
                      <span className="text-sm leading-relaxed text-[var(--text-muted)]">
                        <strong className="font-semibold text-[var(--text-primary)]">Connecte le bot à ton compte Discord.</strong> Sans ça, le site ne voit ni les serveurs où le bot est actif, ni la musique en direct. Clique pour autoriser.
                      </span>
                    </a>
                  )}
                  {botAbsent && (
                    <div className={calloutCls}>
                      <div className="flex items-start gap-3">
                        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            Invitez le bot sur « {selectedGuild.name} » pour activer la modération en temps réel, la musique, les tickets et les commandes personnalisées.
                          </p>
                        </div>
                      </div>
                      <a href={inviteHref} target="_blank" rel="noopener noreferrer" className={inviteBtnCls}>
                        <span>Inviter le bot</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeModule ? `module-${activeModule}` : view}
                initial={motionReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={motionReduced ? undefined : { opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.28, ease: EASE_SNAP }}
              >
              {view === "home" && (
                <GuildOverviewScreen
                  guild={selectedGuild}
                  userName={userName}
                  guildSettings={guildSettings}
                  moduleStatus={moduleStatus}
                  activeModuleCount={activeModuleCount}
                  totalModuleCount={totalModuleCount}
                  onOpenSetup={goSetup}
                  onOpenScan={goScan}
                  onAllModules={goAllModules}
                  onOpenLogs={() => openConsoleView("logs", { logsTab: "channels" })}
                />
              )}

              {view === "settings" && <ConsoleSettings guildId={selectedGuild.id} />}
              {view === "access" && <ConsoleAccess guildId={selectedGuild.id} />}
              {view === "logs" && <ConsoleLogs key={logsTab} guildId={selectedGuild.id} initialTab={logsTab} />}
              {view === "whitelist" && <ConsoleWhitelist guildId={selectedGuild.id} />}
              {view === "blacklist" && <ConsoleBlacklist guildId={selectedGuild.id} />}
              {view === "members" && <ConsoleMembers guildId={selectedGuild.id} />}
              {view === "commands" && <ConsoleCommands guildId={selectedGuild.id} />}
              {view === "tools" && <ConsoleTools guildId={selectedGuild.id} />}
              {view === "protections" && <ConsoleProtections guildId={selectedGuild.id} onOpenView={openConsoleView} onOpenSetup={goSetup} />}

              {view === "scan" && (
                <GuildSecurityScan
                  guild={selectedGuild}
                  onOpenProtections={() => openConsoleView("protections")}
                  onBack={goHome}
                />
              )}

              {view === "setup" && (
                <GuildAssistedSetup
                  guild={selectedGuild}
                  onCancel={goHome}
                  onManualSetup={goAllModules}
                  onFinish={goHome}
                />
              )}

              {view === "modules" && (
                <ModuleNavigator
                  modules={navModules}
                  categories={MODULE_CATEGORIES}
                  activeId=""
                  onSelect={handleSelectModule}
                  status={moduleStatus}
                  onToggle={handleModuleToggle}
                  recommendedIds={RECOMMENDED_MODULE_IDS}
                  pendingIds={pendingModuleIds}
                  heading="Tous les modules"
                  summary={`${activeModuleCount} / ${totalModuleCount} modules activés`}
                />
              )}

              {activeMeta && (
                <div id="module-panel" className="hub-module-panel">
                  {(() => {
                    const panelOn = moduleStatus[activeMeta.id];
                    const panelPending = pendingModuleIds.has(activeMeta.id);
                    const fullPage = MODULE_PAGES[activeMeta.id];
                    return (
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)]", MODULE_TINTS[activeMeta.id])}>
                            <activeMeta.icon className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[var(--text-primary)]">{activeMeta.title}</p>
                            <p className="truncate text-xs text-[var(--text-muted)]">{activeMeta.description}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {fullPage && (
                            <Link href={`${fullPage}?guildId=${selectedGuild.id}`} className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                              Pleine page
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {typeof panelOn === "boolean" && (
                            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                              {panelOn ? "Activé" : "Désactivé"}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={panelOn}
                                disabled={panelPending}
                                aria-label={`${panelOn ? "Désactiver" : "Activer"} ${activeMeta.title}`}
                                onClick={() => handleModuleToggle(activeMeta.id, !panelOn)}
                                className={cn(
                                  "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
                                  panelPending ? "cursor-wait opacity-60" : "cursor-pointer",
                                  panelOn ? "bg-[var(--success)]" : "bg-[var(--panel-border)]"
                                )}
                              >
                                <motion.span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" initial={false} animate={{ x: panelOn ? 16 : 0 }} transition={SPRING_PRESS} />
                              </button>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <ModuleEmbed key={`${selectedGuild.id}-${activeMeta.id}`} moduleId={activeMeta.id} />
                </div>
              )}
              </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      {onboardingModal}
    </>
  );
}
