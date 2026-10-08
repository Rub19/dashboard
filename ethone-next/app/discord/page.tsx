"use client";

import { confirmDialog } from "@/lib/confirmDialog";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Bomb,
  Shield,
  Key,
  BarChart3,
  Code2,
  Lightbulb,
  Award,
  Gift,
  Hammer,
  FileText,
  ExternalLink,
  ChevronRight,
  Server,
  Users,
  AlertTriangle,
  Sparkles,
  Sliders,
  RefreshCw,
  Plus,
  Hash,
  Send,
  Crown,
  Settings2,
  Radio,
  Zap,
  Music2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Ticket,
  UserPlus,
  Archive,
  Bot,
  Vote,
  Tag,
  Clock,
  Calendar,
  Layers,
  Terminal,
  Cpu,
  Star,
  Pin,
  Moon,
  Cake,
  Eye,
  LayoutDashboard,
  Menu,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn, formatApiError } from "@/lib/utils";
import { useDiscordOnboarding } from "@/lib/hooks/useDiscordOnboarding";
import DiscordOnboardingModal from "@/components/discord/onboarding/DiscordOnboardingModal";
import { Checkbox } from "@/components/ui/Checkbox";
import GuildLiveStats from "@/components/discord/GuildLiveStats";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { ethoneIcon } from "@/components/EthoneIcon";
import { useModuleStatus } from "@/lib/hooks/useModuleStatus";
import ServerPicker from "@/components/discord/ServerPicker";
import BotInstallView from "@/components/discord/BotInstallView";
import ModuleNavigator, { type NavigatorCategory, type NavigatorModule } from "@/components/discord/ModuleNavigator";
import HubSidebar, { type ConsoleView, type HubView } from "@/components/discord/HubSidebar";
import ConsoleSettings from "@/components/discord/console/ConsoleSettings";
import ConsoleAccess from "@/components/discord/console/ConsoleAccess";
import ConsoleLogs from "@/components/discord/console/ConsoleLogs";
import GuildOverviewScreen from "@/components/discord/GuildOverviewScreen";
import GuildAssistedSetup from "@/components/discord/GuildAssistedSetup";
import GuildSecurityScan from "@/components/discord/GuildSecurityScan";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_SNAP } from "@/lib/ease";
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
const INLINE_MODULE_IDS = new Set<string>(MODULES.map((m) => m.id));
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
  const { success, info, error: showError, toggle } = useToast();
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
  // Preview toggles shown on the Logs module gateway card (informational —
  // the real per-event routing lives in the Audit Center at /discord/logs).
  const [logsPreview, setLogsPreview] = useState({ messages: true, roles: true, members: true });

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
    setConsoleView(null);
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
  const openConsoleView = useCallback((v: ConsoleView) => {
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
      } else if (sp.get("view") === "settings" || sp.get("view") === "access" || sp.get("view") === "logs") {
        setConsoleView(sp.get("view") as ConsoleView);
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

  // Lockdown d'urgence : action immédiate côté bot (verrouille les salons),
  // pas un simple flag local.
  const handleToggleLockdown = useCallback(async () => {
    if (!selectedGuild) return;
    const api = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
    const next = !guildSettings.emergencyLockdown;
    if (!api) {
      setGuildSettings((p) => ({ ...p, emergencyLockdown: next }));
      return;
    }
    if (next && !await confirmDialog(`Verrouiller immédiatement les salons de « ${selectedGuild.name} » ?`)) return;
    try {
      const res = await fetch(`${api}/api/guilds/${selectedGuild.id}/anti-raid/lockdown`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next, reason: "Action manuelle depuis le Dashboard ETHONE" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, `Erreur HTTP ${res.status}`));
      setGuildSettings((p) => ({ ...p, emergencyLockdown: Boolean(data?.lockdownActive) }));
      success(data?.lockdownActive ? "Lockdown activé" : "Lockdown levé", `${data?.affectedChannelsCount ?? 0} salon(s) concerné(s).`);
    } catch (e: any) {
      showError("Lockdown impossible", e?.message || "Le bot n'a pas répondu.");
    }
  }, [selectedGuild, guildSettings.emergencyLockdown, success, showError]);

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
  // --- Live Music Center State ---
  const [liveMusicState, setLiveMusicState] = useState<any>({
    status: "IDLE",
    currentTrack: null,
    queue: [],
    volume: 80,
  });

  const fetchLiveMusic = useCallback(async () => {
    if (!selectedGuild || !BOT_API_URL || (botPresenceKnown && !botGuildIds.has(selectedGuild.id))) {
      setLiveMusicState({ status: "IDLE", currentTrack: null, queue: [], volume: 80 });
      return;
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/state`);
      if (res.ok) {
        const data = await res.json();
        setLiveMusicState(data.state);
      }
    } catch {
      // Offline fallback
    }
  }, [selectedGuild, BOT_API_URL, botPresenceKnown, botGuildIds]);

  useEffect(() => {
    if (!BOT_API_URL || (botPresenceKnown && selectedGuild && !botGuildIds.has(selectedGuild.id))) return;
    fetchLiveMusic();
    const interval = setInterval(fetchLiveMusic, 3000);
    return () => clearInterval(interval);
  }, [fetchLiveMusic, BOT_API_URL, botPresenceKnown, selectedGuild, botGuildIds]);

  const handleMusicPlayPause = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setLiveMusicState((prev: any) => ({
        ...prev,
        status: prev?.status === "PLAYING" ? "PAUSED" : "PLAYING",
      }));
      return;
    }
    const isPlaying = liveMusicState?.status === "PLAYING";
    const action = isPlaying ? "pause" : "resume";
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/${action}`, { method: "POST" });
      fetchLiveMusic();
    } catch {
      showError("Action impossible", "Erreur lors de la mise en pause/reprise.");
    }
  };

  const handleMusicSkip = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      showError("Musique", "Bot injoignable.");
      return;
    }
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/skip`, { method: "POST", credentials: "include" });
      fetchLiveMusic();
    } catch {
      showError("Action impossible", "Erreur lors du passage de piste.");
    }
  };

  const handleMusicPrev = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      showError("Musique", "Bot injoignable.");
      return;
    }
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/previous`, { method: "POST", credentials: "include" });
      fetchLiveMusic();
    } catch {
      showError("Action impossible", "Erreur lors du retour en arrière.");
    }
  };

  const isDiscordConnected = Boolean(
    profile?.connected ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("ethone:connected:discord") === "true" ||
        localStorage.getItem("ethone:token:discord")))
  );

  const botAbsent = botPresenceKnown && selectedGuild != null && !botGuildIds.has(selectedGuild.id);
  const botLoginHref = `${BOT_API_URL}/api/auth/login?return_to=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/discord` : "")}`;
  // Styles partagés par tous les panneaux de modules : la DA (surfaces, boutons, micro-interactions) se règle ici.
  const secondaryBtn =
    "group/btn inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.02] px-3.5 text-sm font-medium text-[var(--text-muted)] outline-none transition-[border-color,background-color,color,transform] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.05] hover:text-[var(--text-primary)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50";
  const primaryBtn =
    "group/btn btn-sheen relative inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] outline-none transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] [&>svg:last-child]:transition-transform [&>svg:last-child]:duration-300 hover:[&>svg:last-child]:translate-x-0.5";
  const cardCls =
    "relative rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/45 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] transition-[border-color,background-color,transform] duration-300 [transition-timing-function:var(--ease-snap)] hover:border-[var(--text-primary)]/[0.12]";
  const gatewayCls = `flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center ${cardCls} hover:bg-[var(--surface-raised)]/60`;
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
  const activeMeta = activeModule ? MODULES.find((m) => m.id === activeModule) ?? null : null;
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
                initial={motionReduced ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={motionReduced ? undefined : { opacity: 0, y: -6, filter: "blur(3px)", transition: { duration: 0.14 } }}
                transition={{ duration: 0.4, ease: EASE_SNAP }}
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
                  onOpenLogs={() => openConsoleView("logs")}
                />
              )}

              {view === "settings" && <ConsoleSettings guildId={selectedGuild.id} />}
              {view === "access" && <ConsoleAccess guildId={selectedGuild.id} />}
              {view === "logs" && <ConsoleLogs guildId={selectedGuild.id} />}

              {view === "scan" && (
                <GuildSecurityScan
                  guild={selectedGuild}
                  onOpenProtections={() => {
                    setShowScan(false);
      setConsoleView(null);
    setConsoleView(null);
                    router.push(`/discord/security?guildId=${selectedGuild.id}`);
                  }}
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
                      <div className="relative mb-7 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 sm:p-6">
                        <div
                          aria-hidden
                          className={cn("pointer-events-none absolute -right-10 -top-16 h-56 w-56 opacity-60", MODULE_TINTS[activeMeta.id])}
                          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, currentColor 14%, transparent), transparent)" }}
                        />
                        <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--text-primary)]/20 to-transparent" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-4">
                            <motion.span
                              initial={motionReduced ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 320, damping: 36 }}
                              className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-current/10", MODULE_TINTS[activeMeta.id])}
                            >
                              <activeMeta.icon className="h-6 w-6" />
                            </motion.span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">{activeMeta.title}</h1>
                                {typeof panelOn === "boolean" && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                                      panelOn ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--text-primary)]/[0.07] text-[var(--text-muted)]"
                                    )}
                                  >
                                    <span className={cn("h-1.5 w-1.5 rounded-full", panelOn ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")} />
                                    {panelOn ? "Activé" : "Désactivé"}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">{activeMeta.description}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {typeof panelOn === "boolean" && (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={panelOn}
                                disabled={panelPending}
                                aria-label={`${panelOn ? "Désactiver" : "Activer"} ${activeMeta.title}`}
                                title={panelPending ? "Envoi en cours…" : panelOn ? "Désactiver ce module sur ce serveur" : "Activer ce module sur ce serveur"}
                                onClick={() => handleModuleToggle(activeMeta.id, !panelOn)}
                                className={cn(
                                  "relative h-6 w-11 shrink-0 rounded-full outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                                  panelPending ? "cursor-wait opacity-60" : "cursor-pointer",
                                  panelOn ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/15"
                                )}
                              >
                                <motion.span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" initial={false} animate={{ x: panelOn ? 20 : 0 }} transition={{ type: "spring", stiffness: 450, damping: 43 }} />
                              </button>
                            )}
                            {fullPage && (
                              <Link href={`${fullPage}?guildId=${selectedGuild.id}`} className={secondaryBtn}>
                                Page complète
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            )}
                            <button type="button" onClick={() => setActiveModule(null)} className={secondaryBtn}>
                              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                              {showAllModules ? "Modules" : "Accueil"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MODULE 0: Vue d'ensemble */}
                  {activeModule === "overview" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Mission Control</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Statut du bot, modération, sécurité, musique, tickets, giveaways, backups et activité récente réunis en un coup d'œil — données réelles, pas de tuile fictive.
                          </p>
                        </div>
                        <Link
                          href={`/discord/overview?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Ouvrir la Vue d'ensemble</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <GuildLiveStats guildId={selectedGuild.id} />
                    </div>
                  )}

                  {/* MODULE 1: Sécurité & Anti-Raid */}
                  {activeModule === "security" && (
                    <div className="space-y-4">
                      {/* Anti-Raid Command Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Centre de Sécurité Anti-Raid</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Calcul dynamique du Risk Score (0-100), Live Monitor, activation du Raid Mode d'urgence et dossiers d'investigation.
                          </p>
                        </div>
                        <Link
                          href={`/discord/security/anti-raid?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <ShieldAlert className="h-4 w-4" />
                          <span>Ouvrir Anti-Raid</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      {/* Anti-Nuke Command Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Centre Anti-Nuke</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Détection des bannissements massifs et suppressions de salons/rôles, sanction automatique configurable sur l'auteur.
                          </p>
                        </div>
                        <Link
                          href={`/discord/security/anti-nuke?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Bomb className="h-4 w-4" />
                          <span>Ouvrir Anti-Nuke</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "flex items-center justify-between gap-4")}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Protection Anti-Raid automatique</p>
                          <p className="text-xs text-[var(--text-muted)]">Détecte et bloque les arrivées massives de bots ou comptes suspects.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={guildSettings.antiRaidEnabled}
                          onClick={() => {
                            const next = !guildSettings.antiRaidEnabled;
                            setGuildSettings((p) => ({ ...p, antiRaidEnabled: next }));
                            toggle(
                              "Protection Anti-Raid",
                              next,
                              next ? "Activée sur ce serveur." : "Désactivée sur ce serveur."
                            );
                          }}
                          className={cn(
                            "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                            guildSettings.antiRaidEnabled ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/15"
                          )}
                        >
                          <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", guildSettings.antiRaidEnabled ? "translate-x-5" : "translate-x-0")} />
                        </button>
                      </div>

                      <div className={cn(cardCls, "flex items-center justify-between gap-4")}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Filtre Anti-Spam & Flooding</p>
                          <p className="text-xs text-[var(--text-muted)]">Supprime automatiquement les répétitions excessives de messages.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={guildSettings.antiSpamEnabled}
                          onClick={() => {
                            const next = !guildSettings.antiSpamEnabled;
                            setGuildSettings((p) => ({ ...p, antiSpamEnabled: next }));
                            toggle(
                              "Filtre Anti-Spam",
                              next,
                              next ? "Activé sur ce serveur." : "Désactivé sur ce serveur."
                            );
                          }}
                          className={cn(
                            "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                            guildSettings.antiSpamEnabled ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/15"
                          )}
                        >
                          <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", guildSettings.antiSpamEnabled ? "translate-x-5" : "translate-x-0")} />
                        </button>
                      </div>

                      {/* Mentions Limit */}
                      <div className={cn(cardCls, "flex flex-col gap-4")}>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-[var(--text-primary)]">Limite de mentions par message</p>
                            {guildSettings.mentionLimit === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Désactivée (Spam libre)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent-primary)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
                                Actif ({guildSettings.mentionLimit}/msg)
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {guildSettings.mentionLimit === 0
                              ? "Désactivée : aucune limite de mentions, les membres peuvent mentionner librement sans sanction (spam autorisé)."
                              : "Nombre maximum d'utilisateurs ou rôles mentionnables avant sanction."}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { val: 3, label: "3 mentions" },
                            { val: 5, label: "5 (Recommandé)" },
                            { val: 10, label: "10 mentions" },
                            { val: 0, label: "Désactivé (Spam)" },
                          ].map(({ val, label }) => {
                            const isActive = guildSettings.mentionLimit === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setGuildSettings((p) => ({ ...p, mentionLimit: val }));
                                  if (val === 0) {
                                    toggle(
                                      "Limite de mentions",
                                      false,
                                      "Désactivée — Les membres peuvent mentionner sans limite (spam libre)."
                                    );
                                  } else {
                                    toggle(
                                      "Limite de mentions",
                                      true,
                                      `Activée à ${val} mentions maximum par message.`
                                    );
                                  }
                                }}
                                className={cn(
                                  "h-9 cursor-pointer rounded-xl border px-3.5 text-sm font-medium transition-colors",
                                  isActive
                                    ? val === 0
                                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                                      : "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                                    : "border-[var(--panel-border)] text-[var(--text-muted)] hover:border-[var(--input-border-hover)] hover:text-[var(--text-primary)]"
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-4">
                        <div>
                          <p className="flex items-center gap-1.5 text-sm font-medium text-rose-300">
                            <AlertTriangle className="h-4 w-4" />
                            Verrouillage d'urgence (Lockdown)
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">Empêche tout nouveau membre d'écrire dans les salons en cas d'attaque.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleLockdown}
                          className={cn(
                            "h-9 shrink-0 cursor-pointer rounded-xl px-4 text-sm font-semibold transition-colors",
                            guildSettings.emergencyLockdown
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                          )}
                        >
                          {guildSettings.emergencyLockdown ? "Actif (Déverrouiller)" : "Déclencher"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MODULE 2: Command Builder */}
                  {activeModule === "commands" && (
                    <div className="space-y-4">
                      {/* Command Studio Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Command Studio & Builder</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Créez des commandes Slash (/) et Préfixe (!) sur-mesure, générez des embeds Discord riches, intégrez des variables dynamiques ({'{user}'}, {'{server}'}) et testez en direct dans le simulateur.
                          </p>
                        </div>
                        <Link
                          href={`/discord/commands?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Code2 className="h-4 w-4" />
                          <span>Ouvrir Command Studio</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Catalogue</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Slash & Préfixe</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Activation / désactivation en 1 clic</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Embed Studio</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Live Discord Render</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Bordures, footers & boutons</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Dynamique</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Variables Live</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{'{user}'}, {'{server}'}, {'{time}'}</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Testing</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Simulateur Terminal</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Test immédiat sans bot</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/commands?guildId=${selectedGuild.id}&tab=catalog`}
                          className={secondaryBtn}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Catalogue des Commandes</span>
                        </Link>
                        <Link
                          href={`/discord/commands?guildId=${selectedGuild.id}&tab=builder`}
                          className={secondaryBtn}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Créer une Commande No-Code</span>
                        </Link>
                        <Link
                          href={`/discord/commands?guildId=${selectedGuild.id}&tab=simulator`}
                          className={secondaryBtn}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Simulateur Discord Live</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE 3: Suggestions & Feedback */}
                  {activeModule === "suggestions" && (
                    <div className="space-y-4">
                      {/* Suggestions Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Boîte à Suggestions & Feedback</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Collectez les idées des membres, organisez les votes communautaires (👍 / 👎), traitez les propositions sur un tableau Kanban et publiez les décisions officielles du Staff.
                          </p>
                        </div>
                        <Link
                          href={`/discord/suggestions?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Lightbulb className="h-4 w-4" />
                          <span>Ouvrir Suggestions Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Traitement</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Kanban Staff</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">En Attente / Approuvée / Rejetée</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Communauté</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Votes Discord</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Boutons interactifs 👍 👎</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Réponses</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Avis Officiel</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Mise à jour directe de l'embed</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Protection</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Anti-Doublon</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Filtres et cooldown par membre</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=kanban`}
                          className={secondaryBtn}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Tableau Kanban des Idées</span>
                        </Link>
                        <Link
                          href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=response_studio`}
                          className={secondaryBtn}
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Modération & Réponses Staff</span>
                        </Link>
                        <Link
                          href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=hall_of_fame`}
                          className={secondaryBtn}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          <span>Top Idées (Hall of Fame)</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE 4: Leveling & XP */}
                  {activeModule === "leveling" && (
                    <div className="space-y-4">
                      {/* Leveling Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Leveling & Rôles XP Center</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Stimulez l'activité de votre serveur : classement interactif, designer de cartes de profil Discord (/rank), attribution automatique de rôles par paliers et bonus pour Nitro Boosters.
                          </p>
                        </div>
                        <Link
                          href={`/discord/leveling?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Award className="h-4 w-4" />
                          <span>Ouvrir Leveling Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Leaderboard</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Top 100 Live</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Trophées, barres d'XP & ranks</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Rank Card</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Card Studio Live</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Bannières, couleurs & thèmes</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Paliers</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Rôles Récompenses</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Déblocage auto par niveau</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Multiplicateurs</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Vocal & Boosters</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Gains en vocal et bonus x1.5</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/leveling?guildId=${selectedGuild.id}&tab=leaderboard`}
                          className={secondaryBtn}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          <span>Classement & Leaderboard</span>
                        </Link>
                        <Link
                          href={`/discord/leveling?guildId=${selectedGuild.id}&tab=card_designer`}
                          className={secondaryBtn}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Rank Card Designer</span>
                        </Link>
                        <Link
                          href={`/discord/leveling?guildId=${selectedGuild.id}&tab=rewards`}
                          className={secondaryBtn}
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>Gérer les Rôles Récompenses</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE 5: Giveaways & Concours */}
                  {activeModule === "giveaways" && (
                    <div className="space-y-4">
                      {/* Giveaways Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Giveaways & Tirages au Sort</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Pilotez vos concours Discord : création assistée, restrictions de rôles et d'ancienneté, tirage cryptographique impartial (SHA-256 CSPRNG) et système de Reroll en un clic.
                          </p>
                        </div>
                        <Link
                          href={`/discord/giveaways?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Gift className="h-4 w-4" />
                          <span>Ouvrir Giveaways Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Concours</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Live Discord</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Comptes à rebours & embeds</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Impartialité</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">SHA-256 CSPRNG</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Graines vérifiables sans triche</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Conditions</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Rôles & Bonus</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Chances + pour Boosters</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Gestion</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Reroll 1-Clic</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Redistribution immédiate</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=create`}
                          className={secondaryBtn}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Lancer un Nouveau Concours</span>
                        </Link>
                        <Link
                          href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=active`}
                          className={secondaryBtn}
                        >
                          <Gift className="h-3.5 w-3.5" />
                          <span>Concours en Cours</span>
                        </Link>
                        <Link
                          href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=history`}
                          className={secondaryBtn}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Historique des Gagnants & Reroll</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Tickets Center */}
                  {activeModule === "tickets" && (
                    <div className="space-y-4">
                      {/* Tickets Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Tickets Center & Helpdesk</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Helpdesk complet multi-catégories, formulaires avec questions dynamiques, équipes de staff, assignation/transfert, transcripts HTML/TXT/JSON et liaisons avec les Dossiers de Modération.
                          </p>
                        </div>
                        <Link
                          href={`/discord/tickets?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Ticket className="h-4 w-4" />
                          <span>Ouvrir Tickets Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Helpdesk</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Multi-Équipes</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Support, Mod & Facturation</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Formulaires</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Modals Discord</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Champs configurables</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Archivage</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Transcripts</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">HTML, TXT & JSON</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Audit & Qualité</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Notes & CSAT</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Avis membres (1-5★)</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/tickets?guildId=${selectedGuild.id}&tab=panels`}
                          className={secondaryBtn}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Créer un Panneau Discord</span>
                        </Link>
                        <Link
                          href={`/discord/tickets?guildId=${selectedGuild.id}&tab=categories`}
                          className={secondaryBtn}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          <span>Gérer les Catégories</span>
                        </Link>
                        <Link
                          href={`/discord/tickets?guildId=${selectedGuild.id}&tab=transcripts`}
                          className={secondaryBtn}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Historique des Transcripts</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Welcome & Onboarding */}
                  {activeModule === "welcome" && (
                    <div className="space-y-4">
                      {/* Welcome Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Bienvenue & Onboarding Center</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Personnalisation complète sans coder : Message & Embed Builder avec Live Preview, boutons interactifs, cartes de bienvenue, DM Welcome, onboarding multi-étapes et entonnoir de conversion.
                          </p>
                        </div>
                        <Link
                          href={`/discord/welcome?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Ouvrir Welcome Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Welcome & Embed</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Live Preview</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Rendu Discord instantané</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Parcours</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Onboarding Flow</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Règles, rôles & questions</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Sécurité</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Vérification</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Boutons & déblocage rôles</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Conversion</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Funnel Analytics</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Taux de complétion en direct</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/welcome?guildId=${selectedGuild.id}&tab=builder`}
                          className={secondaryBtn}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Message & Embed Builder</span>
                        </Link>
                        <Link
                          href={`/discord/welcome?guildId=${selectedGuild.id}&tab=onboarding`}
                          className={secondaryBtn}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Configurer l&apos;Onboarding</span>
                        </Link>
                        <Link
                          href={`/discord/welcome?guildId=${selectedGuild.id}&tab=templates`}
                          className={secondaryBtn}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Templates Prêts à l&apos;Emploi</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE 6: Modération & Sanctions */}
                  {activeModule === "moderation" && (
                    <div className="space-y-4">
                      {/* Moderation Center / Case System Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Centre de Modération & Case System</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Suivi centralisé des sanctions (Cases #1, #2...), annulation avec audit trail, scheduler d&apos;expiration, notes staff privées et protection anti-abus.
                          </p>
                        </div>
                        <Link
                          href={`/discord/moderation?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Hammer className="h-4 w-4" />
                          <span>Ouvrir Moderation</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      {/* AutoMod Command Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Centre de Modération Intelligente AutoMod</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Moteur multi-détecteurs (Spam, Flood, Liens, Invites, Mentions, Caps, Regex, Profils), Rule Builder dynamique, Sanctions progressives (Strikes) et Sandbox de test.
                          </p>
                        </div>
                        <Link
                          href={`/discord/moderation/automod?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Zap className="h-4 w-4" />
                          <span>Ouvrir AutoMod</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Salon de notification des sanctions</p>
                        <ChannelPicker
                          value={modLogChannelId}
                          onChange={(id) => setModLogChannelId(id || null)}
                          guildId={selectedGuild.id}
                          emptyLabel="Détection automatique (salon « mod-logs », « logs » ou « audit »)"
                          allowClear
                        />
                        <p className="text-xs text-[var(--text-muted)]">
                          Toutes les sanctions appliquées (<code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/warn</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/mute</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/kick</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/ban</code>) y seront journalisées. Sans sélection, le bot cherche automatiquement un salon nommé « mod-logs », « logs » ou « audit ».
                        </p>
                      </div>
                    </div>
                  )}

                  {/* MODULE 7: Audit & Logs */}
                  {activeModule === "logs" && (
                    <div className="space-y-4">
                      {/* Audit Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Audit Center & Traçabilité Temps Réel</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Moteur de traçabilité temps réel, mode enquête (&plusmn;15 min), diffs avant/après, corrélation des sanctions (Cases &amp; Raids), routage multi-salons Discord et exports CSV/JSON.
                          </p>
                        </div>
                        <Link
                          href={`/discord/logs?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <FileText className="h-4 w-4" />
                          <span>Ouvrir Audit Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Surveillance des événements serveur</p>
                        <div className="space-y-3">
                          <Checkbox
                            checked={logsPreview.messages}
                            onCheckedChange={(v) => setLogsPreview((p) => ({ ...p, messages: v }))}
                            label="Journaliser la suppression et modification de messages"
                          />
                          <Checkbox
                            checked={logsPreview.roles}
                            onCheckedChange={(v) => setLogsPreview((p) => ({ ...p, roles: v }))}
                            label="Journaliser les modifications de rôles, permissions et salons"
                          />
                          <Checkbox
                            checked={logsPreview.members}
                            onCheckedChange={(v) => setLogsPreview((p) => ({ ...p, members: v }))}
                            label="Journaliser les arrivées, départs, bans et timeouts"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Lecteur Musique */}
                  {activeModule === "music" && (
                    <div className="space-y-4">
                      {/* Music Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Centre de Contrôle Musical ETHONE</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Lecteur audio synchronisé en direct, file d&apos;attente drag & drop, recherche multi-sources, playlists, favoris et mode DJ.
                          </p>
                        </div>
                        <Link
                          href={`/discord/music?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Music2 className="h-4 w-4" />
                          <span>Ouvrir Music Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">État du lecteur audio</p>
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <p className="text-sm text-[var(--text-primary)]">
                              {liveMusicState?.currentTrack ? liveMusicState.currentTrack.title : "Aucune musique en cours"}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {liveMusicState?.currentTrack
                                ? `${liveMusicState.currentTrack.artist} • File: ${liveMusicState.queueLength} titres`
                                : "Utilisez la commande /music play ou le Music Center pour écouter."}
                            </p>
                          </div>
                          {liveMusicState?.currentTrack && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleMusicPrev}
                                aria-label="Piste précédente"
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-[color,background-color,border-color,transform] hover:bg-white/[0.07] hover:text-[var(--text-primary)] active:scale-[0.97]"
                              >
                                <SkipBack className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={handleMusicPlayPause}
                                aria-label={liveMusicState.status === "PLAYING" ? "Pause" : "Lecture"}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                              >
                                {liveMusicState.status === "PLAYING" ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
                              </button>
                              <button
                                onClick={handleMusicSkip}
                                aria-label="Piste suivante"
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-[color,background-color,border-color,transform] hover:bg-white/[0.07] hover:text-[var(--text-primary)] active:scale-[0.97]"
                              >
                                <SkipForward className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Invites & Parrainages */}
                  {activeModule === "invites" && (
                    <div className="space-y-4">
                      {/* Invites & Referrals Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Invite Tracker &amp; Referral Center</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Tracking précis des invitations Discord, calcul de diff par snapshot, détection des faux joins (Risk Score 0-100), campagnes avec objectifs et distribution sécurisée de rôles récompenses.
                          </p>
                        </div>
                        <Link
                          href={`/discord/invites?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Ouvrir Invites Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Fonctionnalités actives du tracker</p>
                        <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Snapshot en temps réel de toutes les invitations de la guilde</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Algorithme heuristique anti-triche (âge du compte, burst, churn)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Suivi de la rétention des membres (24h, 3j, 7j, 30j)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Attribution de rôles par paliers avec vérification de hiérarchie</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Salons Vocaux */}
                  {activeModule === "voice" && (
                    <div className="space-y-4">
                      {/* Voice Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Voice Channels &amp; Hubs Temporaires</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Salons vocaux temporaires automatiques, hubs multiples (Gaming, Chill, Ranked, VIP), panneaux de contrôle Discord, transfert d&apos;ownership et règles d&apos;automatisation.
                          </p>
                        </div>
                        <Link
                          href={`/discord/voice?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Radio className="h-4 w-4" />
                          <span>Ouvrir Voice Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Fonctionnalités vocales actives</p>
                        <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Création instantanée dès la connexion à un salon Hub</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Suppression automatique avec délai de grâce anti-accidents</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Panneau de contrôle intégré dans Discord (Renommer, Lock, Limite)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Stratégies intelligentes de transfert de propriété</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Server Backup & Disaster Recovery */}
                  {activeModule === "backups" && (
                    <div className="space-y-4">
                      {/* Backup Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Server Backup &amp; Disaster Recovery</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Sauvegardez l&apos;intégralité de la structure Discord et des modules ETHONE, comparez les versions et restaurez sélectivement avec rollback automatique.
                          </p>
                        </div>
                        <Link
                          href={`/discord/backups?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Archive className="h-4 w-4" />
                          <span>Ouvrir Backup Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Garanties &amp; Protections de Secours</p>
                        <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Snapshots immuables certifiés SHA-256</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Rollback automatique capturé avant toute restauration</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Comparateur visuel de diffs (Ajouté, Modifié, Supprimé)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Sauvegardes protégées inviolables contre la purge</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: AI Assistant */}
                  {activeModule === "ai" && (
                    <div className="space-y-4">
                      {/* AI Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">ETHONE AI Assistant &amp; Knowledge Hub</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Assistant IA Discord intelligent, base de connaissances RAG sémantique, builder de personnalités à 5 curseurs, permissions de salons et handoff de tickets de support.
                          </p>
                        </div>
                        <Link
                          href={`/discord/ai?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Bot className="h-4 w-4" />
                          <span>Ouvrir AI Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Fonctionnalités IA Disponibles</p>
                        <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>RAG sémantique (sources globales, par salon ou restreintes aux rôles)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Bouclier de sécurité anti-jailbreak &amp; prompt injection strict</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Commandes slash /ask et /summarize natives avec boutons d&apos;action</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Intégration Helpdesk &amp; escalade en ticket privé pour le staff</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Forms & Applications */}
                  {activeModule === "forms" && (
                    <div className="space-y-4">
                      {/* Forms Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Forms &amp; Applications — No-Code Builder</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Créez des formulaires glisser-déposer sur-mesure (candidatures staff, whitelist, partenariats, feedbacks), publiez-les sur Discord et traitez les candidatures avec review privée et scoring.
                          </p>
                        </div>
                        <Link
                          href={`/discord/forms?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <FileText className="h-4 w-4" />
                          <span>Ouvrir Forms Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Fonctionnalités Clés du Form Builder</p>
                        <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Builder drag &amp; drop 20 types de champs (Texte, Rôles, Fichiers, Étoiles)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Moteur de logique conditionnelle dynamique et étapes multi-steps</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Panneau Discord interactif (Bouton d&apos;application + Modal natif)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Review staff privée, attribution de rôles automatique et scoring pondéré</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Polls & Voting */}
                  {activeModule === "polls" && (
                    <div className="space-y-4">
                      {/* Polls Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Polls &amp; Voting Center</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Sondages démocratiques, consultations privées du staff, pondération des voix selon les rôles Discord, votes à bulletin secret et quorums d&apos;approbation.
                          </p>
                        </div>
                        <Link
                          href={`/discord/polls?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Vote className="h-4 w-4" />
                          <span>Ouvrir Polls Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Garanties &amp; Fonctionnalités de Vote</p>
                        <div className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>9 modes de scrutin (Choix unique, multiple, préférentiel, pondéré, etc.)</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Calcul automatique de quorum et majorité qualifiée</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Pondération des voix paramétrable selon les rôles du serveur</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                            <span>Bulletins secrets avec anonymisation intégrale garantie</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Reaction Roles & Auto-Roles */}
                  {activeModule === "roles" && (
                    <div className="space-y-4">
                      {/* Roles Center Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Reaction Roles & Auto-Roles</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Panneaux de sélection de rôles par boutons cliquables et menus déroulants Discord, attribution automatique à l'arrivée (Join-Roles), rôles temporaires avec expiration et audit de hiérarchie.
                          </p>
                        </div>
                        <Link
                          href={`/discord/roles?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Tag className="h-4 w-4" />
                          <span>Ouvrir Roles Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Panneaux</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Boutons & Menus</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Composants natifs Discord</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Sélection</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Unique ou Multiple</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Règles d'exclusivité de groupe</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Accueil</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Join-Roles Auto</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Immédiat ou différé X minutes</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Sécurité</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Hiérarchie Bot</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Prévention anti-escalade 403</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/roles?guildId=${selectedGuild.id}&tab=panels`}
                          className={secondaryBtn}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Panneaux de Rôles Actifs</span>
                        </Link>
                        <Link
                          href={`/discord/roles?guildId=${selectedGuild.id}&tab=builder`}
                          className={secondaryBtn}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Créer un Panneau Discord</span>
                        </Link>
                        <Link
                          href={`/discord/roles?guildId=${selectedGuild.id}&tab=join_roles`}
                          className={secondaryBtn}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Configurer les Join-Roles</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE 8: Analytics & Insights */}
                  {activeModule === "analytics" && (
                    <div className="space-y-4">
                      {/* Analytics Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Analytics & Server Insights</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Surveillez la santé de votre serveur en temps réel : volume de messages, flux d'arrivées et départs, heatmaps horaires d'affluence, rétention et classement des membres les plus actifs.
                          </p>
                        </div>
                        <Link
                          href={`/discord/analytics?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Ouvrir Analytics Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Activité</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Messages 14j</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Graphiques & répartitions médias</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Croissance</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Flux Membres</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Arrivées nettes & taux de rétention</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Créneaux</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Heatmap 24h/7j</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Pics d'affluence pour annonces</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Salons</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Part de Voix</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Salons textuels & heures vocales</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/analytics?guildId=${selectedGuild.id}&tab=messages`}
                          className={secondaryBtn}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Activité des Messages</span>
                        </Link>
                        <Link
                          href={`/discord/analytics?guildId=${selectedGuild.id}&tab=growth`}
                          className={secondaryBtn}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Croissance & Rétention</span>
                        </Link>
                        <Link
                          href={`/discord/analytics?guildId=${selectedGuild.id}&tab=heatmap`}
                          className={secondaryBtn}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Heatmap d'Affluence</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Events & Calendar */}
                  {activeModule === "events" && (
                    <div className="space-y-4">
                      {/* Events Gateway */}
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Events &amp; Calendar</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Planifiez vos soirées gaming, tournois et réunions avec calendrier interactif (Mois, Semaine, Agenda), gestion des inscriptions (Going, Maybe, Waitlist), pointages et rappels automatiques.
                          </p>
                        </div>
                        <Link
                          href={`/discord/events?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Calendar className="h-4 w-4" />
                          <span>Ouvrir Events Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Affichage</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Calendrier Interactif</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Vues Mois, Semaine, Jour &amp; Agenda</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Inscriptions</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">RSVP &amp; Waitlist</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Jauges &amp; promotion automatique</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Discord</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Embeds &amp; Boutons</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Pointage vocal &amp; slash /event</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Export</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">iCal (.ics)</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Synchro Google / Apple Calendar</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/events?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Tous les Événements</span>
                        </Link>
                        <Link
                          href={`/discord/calendar?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Vue Calendrier</span>
                        </Link>
                        <Link
                          href={`/discord/events/create?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Créer un Événement</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE 20: Server Management Center */}
                  {activeModule === "server" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Server Management Center</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Contrôle intégral : diagnostic santé, score de sécurité, membres, salons, rôles, permission debugger et emojis.
                          </p>
                        </div>
                        <Link
                          href={`/discord/server?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Server className="h-4 w-4" />
                          <span>Ouvrir Server Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Sécurité</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Score 0-100</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Évaluation transparente</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Membres</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Profil &amp; Risk</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Timeout, Kick &amp; Ban</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Salons &amp; Rôles</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Arborescence</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Hiérarchie &amp; Plafond Bot</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Permissions</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Debugger</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Résolution pas à pas</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/discord/server/members?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Membres</span>
                        </Link>
                        <Link
                          href={`/discord/server/channels?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Hash className="h-3.5 w-3.5" />
                          <span>Salons</span>
                        </Link>
                        <Link
                          href={`/discord/server/roles?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>Rôles</span>
                        </Link>
                        <Link
                          href={`/discord/server/permissions?guildId=${selectedGuild.id}`}
                          className={secondaryBtn}
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>Permissions &amp; Debugger</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* MODULE: Starboard */}
                  {activeModule === "starboard" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Starboard — Hall of Fame</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Quand un message atteint un seuil de réactions ⭐, le bot le republie dans un salon dédié avec un embed maintenu à jour. Salon, emoji, seuil et options se règlent ici.
                          </p>
                        </div>
                        <Link
                          href={`/discord/starboard?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Star className="h-4 w-4" />
                          <span>Ouvrir le Starboard</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Mise en route</p>
                        <ol className="list-decimal space-y-1 pl-4 text-sm text-[var(--text-muted)]">
                          <li>Ouvrez le Starboard et choisissez le salon de publication.</li>
                          <li>Réglez l&apos;emoji (⭐ par défaut) et le seuil de réactions.</li>
                          <li>Activez — ou lancez <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/starboard setup</code> directement sur Discord.</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {activeModule === "sticky" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Sticky Messages</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Épingle un message en bas d&apos;un salon (règles, format d&apos;une candidature, lien utile…). Dès qu&apos;un membre écrit, le bot supprime l&apos;ancien et le republie tout en bas, avec un anti-rebond réglable.
                          </p>
                        </div>
                        <Link
                          href={`/discord/sticky?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Pin className="h-4 w-4" />
                          <span>Ouvrir Sticky Messages</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Mise en route</p>
                        <ol className="list-decimal space-y-1 pl-4 text-sm text-[var(--text-muted)]">
                          <li>Ouvrez Sticky Messages et choisissez un salon.</li>
                          <li>Écrivez le contenu, choisissez texte ou embed, et le délai anti-rebond.</li>
                          <li>Enregistrez — ou lancez <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/sticky set</code> directement sur Discord.</li>
                        </ol>
                        <p className="text-xs text-[var(--text-muted)]">Le bot a besoin des permissions <strong>Envoyer des messages</strong> et <strong>Gérer les messages</strong> dans le salon.</p>
                      </div>
                    </div>
                  )}

                  {activeModule === "reminders" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Reminders</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Programme un rappel (<code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/reminder add 2h révise le TP</code>). À l&apos;échéance, le bot te mentionne dans le salon avec ton message. Récurrence quotidienne / hebdomadaire possible.
                          </p>
                        </div>
                        <Link
                          href={`/discord/reminders?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Clock className="h-4 w-4" />
                          <span>Ouvrir Reminders</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Commandes</p>
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/reminder add</code> — délai (<code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">10m</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">2h</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">1d</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">1h30m</code>) + message + récurrence</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/reminder list</code> — tes rappels en attente</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/reminder cancel &lt;id&gt;</code> — annuler</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeModule === "statroles" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Statroles</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Donne et retire un rôle selon l&apos;activité dans la durée (ex. « Actif » : 100 messages sur 30 jours ET 30 jours d&apos;ancienneté). Ce qu&apos;un rôle de niveau ne sait pas faire : le rôle se retire tout seul. Désactivé par défaut ; s&apos;appuie sur le module Statistiques.
                          </p>
                        </div>
                        <Link
                          href={`/discord/statroles?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <span>Ouvrir Statroles</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {activeModule === "settings" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Paramètres</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Langue et fuseau horaire du bot, contacts d&apos;urgence (prévenus par mention et message privé quand une permission manque ou qu&apos;un salon configuré est supprimé), préfixe et types de commandes.
                          </p>
                        </div>
                        <Link
                          href={`/discord/settings?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <span>Ouvrir les Paramètres</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {activeModule === "secureroles" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Rôles sécurisés</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Les permissions sensibles d&apos;un rôle du personnel sont déplacées vers un rôle caché que le membre n&apos;obtient que pour quelques minutes, après un code de son application d&apos;authentification (<code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/elevate</code>). Le rôle garde son nom, sa couleur et sa place dans la hiérarchie. Désactivé par défaut.
                          </p>
                        </div>
                        <Link
                          href={`/discord/secure-roles?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <span>Ouvrir Rôles sécurisés</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {activeModule === "stats" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Statistiques</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Messages et vocal par jour, arrivées / départs, top membres et salons, fiche par membre. Sur Discord : <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/stats server</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/stats member</code>, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/stats top</code>. Désactivé par défaut : les données se collectent à partir de l&apos;activation.
                          </p>
                        </div>
                        <Link
                          href={`/discord/stats?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <span>Ouvrir Statistiques</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {activeModule === "counting" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Comptage</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Les membres comptent <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">1, 2, 3…</code> à tour de rôle dans un salon dédié. Une erreur remet le compteur à zéro ; le record et le classement sont conservés. Désactivé par défaut : lancez-le avec <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/counting setup</code> ou depuis la page du module.
                          </p>
                        </div>
                        <Link
                          href={`/discord/counting?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <span>Ouvrir Comptage</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {activeModule === "afk" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">AFK</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/afk déjeuner</code> te marque absent. Le bot répond « X est AFK : déjeuner » à ceux qui te mentionnent, et retire ton statut dès que tu reparles (avec le décompte des mentions manquées).
                          </p>
                        </div>
                        <Link
                          href={`/discord/afk?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Moon className="h-4 w-4" />
                          <span>Ouvrir AFK</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Réglages</p>
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                          <li>Retirer le statut au premier message (on/off)</li>
                          <li>Prévenir sur mention (on/off)</li>
                          <li>Préfixer le pseudo avec <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">[AFK]</code> (nécessite Gérer les pseudos)</li>
                          <li>Auto-suppression des réponses du bot (0–60 s)</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeModule === "birthdays" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Birthdays</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/birthday set 14 07</code> enregistre ta date. Chaque jour à l&apos;heure configurée, le bot annonce les anniversaires du jour dans un salon (message personnalisable, âge affiché si l&apos;année est donnée) et attribue un rôle « Anniversaire » retiré le lendemain.
                          </p>
                        </div>
                        <Link
                          href={`/discord/birthdays?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Cake className="h-4 w-4" />
                          <span>Ouvrir Birthdays</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Commandes</p>
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/birthday set &lt;jour&gt; &lt;mois&gt; [année]</code></li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/birthday list</code> — anniversaires à venir</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/birthday remove</code></li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/birthday config</code> — [Admin] salon, heure, rôle, message</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeModule === "tags" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Tags</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/tag add faq &lt;texte&gt;</code> crée une réponse réutilisable, <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/tag get faq</code> l&apos;affiche (avec autocomplétion). Idéal pour les FAQ, formats de candidature, liens récurrents.
                          </p>
                        </div>
                        <Link
                          href={`/discord/tags?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Hash className="h-4 w-4" />
                          <span>Ouvrir Tags</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Commandes</p>
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/tag get &lt;nom&gt;</code> — affiche un tag</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/tag add | edit | remove</code> — [Gérer les messages]</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/tag list</code> · <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/tag info &lt;nom&gt;</code></li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeModule === "serverstats" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Server Stats</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Transforme un salon (vocal verrouillé de préférence) en compteur : son nom affiche le nombre de membres, de boosts, de membres en ligne, etc. Renommé automatiquement toutes les 10-60 min (limite Discord).
                          </p>
                        </div>
                        <Link
                          href={`/discord/server-stats?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Ouvrir Server Stats</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Commandes</p>
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/serverstats add &lt;salon&gt; &lt;type&gt; [format] [role]</code></li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/serverstats list | remove | refresh</code></li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/serverstats config</code> — actif on/off, intervalle</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeModule === "highlights" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Highlights</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            <code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/highlight add ethone</code> surveille un mot-clé. Dès qu&apos;un AUTRE membre l&apos;écrit dans le serveur, tu reçois un DM avec l&apos;auteur, le salon et un lien direct. Réglage 100% personnel : chacun voit et gère ses propres mots-clés.
                          </p>
                        </div>
                        <Link
                          href={`/discord/highlights?guildId=${selectedGuild.id}`}
                          className={primaryBtn}
                        >
                          <Eye className="h-4 w-4" />
                          <span>Ouvrir Highlights</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className={cn(cardCls, "space-y-3")}>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Commandes</p>
                        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/highlight add | remove &lt;mot-clé&gt;</code> — max 15 par membre</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/highlight list</code> — tes mots-clés et ton état</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/highlight toggle &lt;actif&gt;</code> — pause sans tout supprimer</li>
                          <li><code className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)]">/highlight mute-channel | unmute-channel &lt;salon&gt;</code> — ignore un salon trop actif</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* MODULE 21: Bot Control Center */}
                  {activeModule === "bot" && (
                    <div className="space-y-4">
                      <div className={gatewayCls}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Bot Control Center &amp; Intelligence</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                            Surveillance intégrale du bot : monitoring V8 CPU/RAM, modules, débit temps réel, diagnostic, erreurs dédoublonnées et tokens IA.
                          </p>
                        </div>
                        <Link
                          href="/discord/bot"
                          className={primaryBtn}
                        >
                          <Bot className="h-4 w-4" />
                          <span>Ouvrir Bot Center</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">État Global</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Opérationnel</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">9 sous-systèmes sains</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Télémétrie</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">V8 &amp; Latence</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Percentiles P50/P95/P99</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Modules Actifs</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">22 Modules</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Santé &amp; dépendances</p>
                        </div>
                        <div className={cardCls}>
                          <p className="text-xs text-[var(--text-muted)]">Auto-Diagnostic</p>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">17 Tests</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Contrôle interne complet</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/discord/bot?tab=modules"
                          className={secondaryBtn}
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span>Modules (22)</span>
                        </Link>
                        <Link
                          href="/discord/bot?tab=commands"
                          className={secondaryBtn}
                        >
                          <Terminal className="h-3.5 w-3.5" />
                          <span>Commandes</span>
                        </Link>
                        <Link
                          href="/discord/bot?tab=performance"
                          className={secondaryBtn}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Performances</span>
                        </Link>
                        <Link
                          href="/discord/bot?tab=diagnostics"
                          className={secondaryBtn}
                        >
                          <Cpu className="h-3.5 w-3.5" />
                          <span>Diagnostics (17 Tests)</span>
                        </Link>
                      </div>
                    </div>
                  )}
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
