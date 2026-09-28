"use client";

import { confirmDialog } from "@/lib/confirmDialog";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
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
  Copy,
  Check,
  Download,
  Upload,
  Sliders,
  RefreshCw,
  Plus,
  Hash,
  Send,
  Crown,
  Settings2,
  Radio,
  Save,
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
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import DiscordIcon from "@/components/DiscordIcon";
import { cn, formatApiError } from "@/lib/utils";
import { useDiscordOnboarding } from "@/lib/hooks/useDiscordOnboarding";
import DiscordOnboardingModal from "@/components/discord/onboarding/DiscordOnboardingModal";
import { Checkbox } from "@/components/ui/Checkbox";
import GuildLiveStats from "@/components/discord/GuildLiveStats";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { ethoneIcon } from "@/components/EthoneIcon";
import { useModuleStatus } from "@/lib/hooks/useModuleStatus";
import ServerPicker from "@/components/discord/ServerPicker";
import ModuleNavigator, { type NavigatorCategory, type NavigatorModule } from "@/components/discord/ModuleNavigator";

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
  overview: "text-indigo-400", security: "text-emerald-400", commands: "text-sky-400", suggestions: "text-yellow-300",
  leveling: "text-amber-400", giveaways: "text-pink-400", tickets: "text-orange-400", welcome: "text-fuchsia-400",
  moderation: "text-red-400", logs: "text-slate-300", music: "text-green-400", invites: "text-teal-400",
  voice: "text-cyan-400", backups: "text-blue-400", ai: "text-violet-400", forms: "text-lime-400",
  polls: "text-purple-400", roles: "text-rose-400", analytics: "text-indigo-300", events: "text-orange-300",
  server: "text-zinc-300", starboard: "text-yellow-400", sticky: "text-amber-300", reminders: "text-sky-300",
  afk: "text-blue-300", counting: "text-teal-300", stats: "text-sky-300", statroles: "text-amber-300", secureroles: "text-emerald-300", settings: "text-zinc-300", birthdays: "text-pink-300", tags: "text-cyan-300", serverstats: "text-emerald-300",
  highlights: "text-lime-300", bot: "text-indigo-400",
};

/** Page complète de chaque module (le bouton ↗ de la carte). */
const MODULE_PAGES: Record<string, string> = {
  overview: "/discord/overview", security: "/discord/security/anti-raid", commands: "/discord/commands", suggestions: "/discord/suggestions",
  leveling: "/discord/leveling", giveaways: "/discord/giveaways", tickets: "/discord/tickets", welcome: "/discord/welcome",
  moderation: "/discord/moderation", logs: "/discord/logs", music: "/discord/music", invites: "/discord/invites", voice: "/discord/voice",
  backups: "/discord/backups", ai: "/discord/ai", forms: "/discord/forms", polls: "/discord/polls", roles: "/discord/roles",
  analytics: "/discord/analytics", events: "/discord/events", server: "/discord/server", starboard: "/discord/starboard",
  sticky: "/discord/sticky", reminders: "/discord/reminders", afk: "/discord/afk", counting: "/discord/counting", stats: "/discord/stats", statroles: "/discord/statroles", secureroles: "/discord/secure-roles", settings: "/discord/settings", birthdays: "/discord/birthdays", tags: "/discord/tags",
  serverstats: "/discord/server-stats", highlights: "/discord/highlights", bot: "/discord/bot", economy: "/discord/economy", calendar: "/discord/calendar",
};

/** Regroupement façon Dyno / MEE6 : l'utilisateur cherche par intention (protéger, animer, gérer), pas par nom technique. */
const MODULE_CATEGORIES: NavigatorCategory[] = [
  { id: "protect", label: "Sécurité & modération", hint: "Protégez le serveur", modules: ["security", "secureroles", "moderation", "logs", "backups"] },
  { id: "community", label: "Communauté", hint: "Accueillez et animez vos membres", modules: ["welcome", "roles", "statroles", "leveling", "invites", "suggestions", "polls", "forms", "starboard", "highlights", "birthdays"] },
  { id: "fun", label: "Animation & médias", hint: "Musique, jeux et événements", modules: ["music", "giveaways", "economy", "counting", "events", "calendar", "voice"] },
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
};

const MODULES: BotModule[] = [
  {
    id: "overview",
    title: "Vue d'ensemble",
    description: "Statut du bot, modération, sécurité, musique, tickets, giveaways, backups et activité récente en un coup d'œil.",
    icon: MODULE_ICONS.overview,
    color: "text-indigo-400",
    badge: "Mission Control",
  },
  {
    id: "security",
    title: "Sécurité & Anti-Raid",
    description: "Protection contre les raids, mass joins, anti-spam et verrouillage d'urgence.",
    icon: MODULE_ICONS.security,
    color: "text-zinc-400",
    badge: "Sécurité",
  },
  {
    id: "commands",
    title: "Command Builder",
    description: "Créez vos commandes Discord personnalisées avec réponses textes et embeds.",
    icon: MODULE_ICONS.commands,
    color: "text-zinc-400",
    badge: "Custom",
  },
  {
    id: "suggestions",
    title: "Boîte à Suggestions",
    description: "Système de boîte à idées avec votes communautaires et statuts.",
    icon: MODULE_ICONS.suggestions,
    color: "text-zinc-400",
    badge: "Communauté",
  },
  {
    id: "leveling",
    title: "Leveling & Rôles XP",
    description: "Gain d'expérience par messages et distribution automatique de rôles.",
    icon: MODULE_ICONS.leveling,
    color: "text-zinc-400",
    badge: "Progression",
  },
  {
    id: "giveaways",
    title: "Tirages au sort",
    description: "Création et gestion de concours avec sélection aléatoire de gagnants.",
    icon: MODULE_ICONS.giveaways,
    color: "text-zinc-400",
    badge: "Événements",
  },
  {
    id: "tickets",
    title: "Tickets Center",
    description: "Helpdesk professionnel, formulaires, équipes de staff, transcripts et statistiques.",
    icon: MODULE_ICONS.tickets,
    color: "text-zinc-400",
    badge: "Helpdesk",
  },
  {
    id: "welcome",
    title: "Bienvenue & Onboarding",
    description: "Messages d'accueil, embeds, cartes de bienvenue, auto-rôles, vérification et onboarding complet.",
    icon: MODULE_ICONS.welcome,
    color: "text-zinc-400",
    badge: "Onboarding",
  },
  {
    id: "moderation",
    title: "Modération & Sanctions",
    description: "Réglages des avertissements, mutes, expulsions et bannissements.",
    icon: MODULE_ICONS.moderation,
    color: "text-zinc-400",
    badge: "Staff",
  },
  {
    id: "logs",
    title: "Journal d'Audit",
    description: "Configuration des salons de logs pour messages et événements serveurs.",
    icon: MODULE_ICONS.logs,
    color: "text-zinc-400",
    badge: "Surveillance",
  },
  {
    id: "music",
    title: "Lecteur Musique",
    description: "Contrôle en direct de la musique vocale, queue, playlists et mode DJ.",
    icon: MODULE_ICONS.music,
    color: "text-zinc-400",
    badge: "Live Audio",
  },
  {
    id: "invites",
    title: "Invites & Parrainages",
    description: "Tracking précis des invitations Discord, détection des faux joins, scores de risque et récompenses.",
    icon: MODULE_ICONS.invites,
    color: "text-zinc-400",
    badge: "Croissance",
  },
  {
    id: "voice",
    title: "Salons Vocaux",
    description: "Join-to-Create, salons temporaires automatiques, hubs et contrôle Discord.",
    icon: MODULE_ICONS.voice,
    color: "text-zinc-400",
    badge: "Vocal",
  },
  {
    id: "backups",
    title: "Sauvegardes & Disaster Recovery",
    description: "Snapshots immuables, restauration sécurisée, comparateur diff et planification automatique.",
    icon: MODULE_ICONS.backups,
    color: "text-zinc-400",
    badge: "Recovery",
  },
  {
    id: "ai",
    title: "AI Assistant",
    description: "Assistant IA Discord intelligent, base RAG sémantique, builder de personnalité et outils support.",
    icon: MODULE_ICONS.ai,
    color: "text-zinc-400",
    badge: "GenAI",
  },
  {
    id: "forms",
    title: "Forms & Applications",
    description: "Form Builder no-code, candidatures staff, logique conditionnelle, scoring et review.",
    icon: MODULE_ICONS.forms,
    color: "text-zinc-400",
    badge: "Recrutement",
  },
  {
    id: "polls",
    title: "Sondages & Votes",
    description: "Sondages démocratiques, votes pondérés par rôles, décisions staff, quorums et bulletins secrets.",
    icon: MODULE_ICONS.polls,
    color: "text-zinc-400",
    badge: "Démocratie",
  },
  {
    id: "roles",
    title: "Reaction Roles & Auto-Roles",
    description: "Panneaux de sélection de rôles par boutons et menus déroulants, join-roles et rôles temporaires.",
    icon: MODULE_ICONS.roles,
    color: "text-zinc-400",
    badge: "Rôles",
  },
  {
    id: "analytics",
    title: "Vue d'Ensemble & Insights",
    description: "Informations générales sur l'état du serveur et statistiques d'utilisation.",
    icon: MODULE_ICONS.analytics,
    color: "text-zinc-400",
    badge: "Données",
  },
  {
    id: "events",
    title: "Événements & Calendrier",
    description: "Planification d'événements, calendrier interactif, gestion des RSVP, jauges et rappels automatiques Discord.",
    icon: MODULE_ICONS.events,
    color: "text-zinc-400",
    badge: "Événements",
  },
  {
    id: "server",
    title: "Server Management Center",
    description: "Centre de gestion globale : diagnostics santé, score de sécurité, membres, salons, rôles, permissions et emojis.",
    icon: MODULE_ICONS.server,
    color: "text-zinc-400",
    badge: "Serveur",
  },
  {
    id: "starboard",
    title: "Starboard",
    description: "Le hall of fame des messages : republication automatique des messages les plus étoilés du serveur.",
    icon: MODULE_ICONS.starboard,
    color: "text-zinc-400",
    badge: "Communauté",
  },
  {
    id: "sticky",
    title: "Sticky Messages",
    description: "Garde un message important toujours visible en bas d'un salon : le bot le repositionne automatiquement.",
    icon: MODULE_ICONS.sticky,
    color: "text-zinc-400",
    badge: "Communauté",
  },
  {
    id: "reminders",
    title: "Reminders",
    description: "« Rappelle-moi » : programme des rappels personnels que le bot t'envoie à l'échéance, ponctuels ou récurrents.",
    icon: MODULE_ICONS.reminders,
    color: "text-zinc-400",
    badge: "Utilitaires",
  },
  {
    id: "settings",
    title: "Paramètres",
    description: "Langue, fuseau horaire, contacts d'urgence prévenus en cas de problème sérieux, préfixe et commandes du bot.",
    icon: MODULE_ICONS.settings,
    color: "text-zinc-400",
    badge: "Serveur",
  },
  {
    id: "secureroles",
    title: "Rôles sécurisés",
    description: "Les permissions sensibles de votre équipe (bannir, gérer les rôles…) ne s'activent qu'après un code à usage unique : un compte volé n'a aucun pouvoir.",
    icon: MODULE_ICONS.secureroles,
    color: "text-zinc-400",
    badge: "Sécurité",
  },
  {
    id: "statroles",
    title: "Statroles",
    description: "Rôles donnés et retirés automatiquement selon l'activité : messages, vocal, ancienneté, avec un constructeur de conditions.",
    icon: MODULE_ICONS.statroles,
    color: "text-zinc-400",
    badge: "Communauté",
  },
  {
    id: "stats",
    title: "Statistiques",
    description: "Messages et vocal par jour, évolution des membres, classements et fiche par membre, comme Statbot.",
    icon: MODULE_ICONS.stats,
    color: "text-zinc-400",
    badge: "Gestion",
  },
  {
    id: "counting",
    title: "Comptage",
    description: "Jeu collectif : les membres comptent 1, 2, 3… à tour de rôle dans un salon, avec record et classement.",
    icon: MODULE_ICONS.counting,
    color: "text-zinc-400",
    badge: "Animation",
  },
  {
    id: "afk",
    title: "AFK",
    description: "Statut absent : le bot prévient ceux qui te mentionnent et retire ton statut dès que tu reparles.",
    icon: MODULE_ICONS.afk,
    color: "text-zinc-400",
    badge: "Utilitaires",
  },
  {
    id: "birthdays",
    title: "Birthdays",
    description: "Anniversaires des membres : annonce quotidienne dans un salon + rôle du jour automatique.",
    icon: MODULE_ICONS.birthdays,
    color: "text-zinc-400",
    badge: "Communauté",
  },
  {
    id: "tags",
    title: "Tags",
    description: "Réponses réutilisables du serveur : FAQ, formats de candidature, liens récurrents, via /tag.",
    icon: MODULE_ICONS.tags,
    color: "text-zinc-400",
    badge: "Utilitaires",
  },
  {
    id: "serverstats",
    title: "Server Stats",
    description: "Salons compteurs : le nom d'un salon affiche le nombre de membres, de boosts, de membres en ligne…",
    icon: MODULE_ICONS.serverstats,
    color: "text-zinc-400",
    badge: "Utilitaires",
  },
  {
    id: "highlights",
    title: "Highlights",
    description: "Mots-clés personnels surveillés : reçois un DM quand quelqu'un d'autre les mentionne dans le serveur.",
    icon: MODULE_ICONS.highlights,
    color: "text-zinc-400",
    badge: "Personnel",
  },
  {
    id: "bot",
    title: "Bot Control Center",
    description: "Console centrale du bot : télémétrie temps réel, santé des modules, commandes, bus d'événements, diagnostics et intelligence.",
    icon: MODULE_ICONS.bot,
    color: "text-zinc-400",
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

  // Serveur choisi dans le sélecteur (id). Le tableau de bord ne s'affiche qu'une fois un serveur choisi.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [lastGuildId, setLastGuildId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
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
    const ids = allGuilds.map((g) => g.id).join(",");
    fetch(`${api}/api/guild-presence?ids=${encodeURIComponent(ids)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((res) => {
        if (cancelled) return;
        const present: string[] = Array.isArray(res?.present) ? res.present.map(String) : [];
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
      if (INLINE_MODULE_IDS.has(id)) {
        setActiveModule(id as ModuleType);
        requestAnimationFrame(() => document.getElementById("module-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } else {
        router.push(`${MODULE_PAGES[id] ?? `/discord/${id}`}?guildId=${selectedGuild?.id ?? ""}`);
      }
    },
    [router, selectedGuild?.id]
  );
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
      id = new URLSearchParams(window.location.search).get("guildId");
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
    try {
      sessionStorage.setItem(PICKED_STORAGE_KEY, guild.id);
      localStorage.setItem(LAST_GUILD_STORAGE_KEY, guild.id);
    } catch {}
    setLastGuildId(guild.id);
  }, []);

  const changeGuild = useCallback(() => {
    setPickedId(null);
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
  const [newCmdName, setNewCmdName] = useState("");
  const [newCmdResponse, setNewCmdResponse] = useState("");

  const handleAddCommand = () => {
    if (!newCmdName.trim() || !newCmdResponse.trim()) {
      showError("Champs incomplets", "Veuillez renseigner le nom et la réponse de la commande.");
      return;
    }
    const cleanName = newCmdName.trim().replace(/^!/, "").toLowerCase();
    setGuildSettings((prev) => ({
      ...prev,
      customCommands: [
        ...prev.customCommands,
        { name: cleanName, response: newCmdResponse.trim(), enabled: true },
      ],
    }));
    setNewCmdName("");
    setNewCmdResponse("");
    success("Commande ajoutée", `La commande !${cleanName} a été enregistrée.`);
  };

  const handleDeleteCommand = (index: number) => {
    setGuildSettings((prev) => ({
      ...prev,
      customCommands: prev.customCommands.filter((_, i) => i !== index),
    }));
    success("Commande supprimée", "La commande a été retirée du serveur.");
  };

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
  const secondaryBtn =
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--input-border-hover)] hover:text-[var(--text-primary)]";
  const calloutCls = "flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-4 sm:flex-row sm:items-center sm:justify-between";
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
          botPresenceKnown={botPresenceKnown}
          inviteUrl={BOT_INVITE_URL}
          userName={isDiscordConnected ? profile?.user?.displayName || profile?.user?.username : undefined}
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

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)]">
              {selectedGuild.iconUrl ? (
                <img src={selectedGuild.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                selectedGuild.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              )}
            </span>
            <h1 className="min-w-0 truncate text-xl font-bold text-[var(--text-primary)]">{selectedGuild.name}</h1>
            {selectedGuild.owner ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--panel-border)] px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                <Crown className="h-3 w-3" />
                Propriétaire
              </span>
            ) : canManageGuild(selectedGuild) ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--panel-border)] px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
                Gérer
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleCopyId}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--panel-border)] text-[var(--text-muted)] transition-colors hover:border-[var(--input-border-hover)] hover:text-[var(--text-primary)]"
              title={copiedId ? "Identifiant copié" : `Copier l'identifiant du serveur (${selectedGuild.id})`}
              aria-label="Copier l'identifiant du serveur"
            >
              {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={changeGuild} className={secondaryBtn}>
              <Server className="h-3.5 w-3.5" />
              Changer de serveur
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => openOnboarding(0)} className={secondaryBtn} title="Revoir l'introduction d'Etho">
              <Sparkles className="h-3.5 w-3.5" />
              Découvrir le Bot
            </button>
            <Link href="/discord/setup" className={secondaryBtn} title="Lancer le setup assisté du serveur">
              <Sliders className="h-3.5 w-3.5" />
              Setup Assisté
            </Link>
            <input type="file" ref={fileInputRef} onChange={handleImportConfig} accept=".json" className="hidden" />
            <button type="button" onClick={handleExportConfig} className={secondaryBtn} title="Télécharger la configuration actuelle en JSON">
              <Download className="h-3.5 w-3.5" />
              Exporter
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={secondaryBtn} title="Restaurer ou charger un fichier de configuration JSON">
              <Upload className="h-3.5 w-3.5" />
              Importer
            </button>
            {botAbsent && (
              <a href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`} target="_blank" rel="noopener noreferrer" className={inviteBtnCls}>
                <DiscordIcon className="h-3.5 w-3.5" />
                Inviter le bot
              </a>
            )}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </div>
        </header>

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
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Invitez le bot sur « {selectedGuild.name} » pour activer la modération en temps réel, la musique, les tickets et les commandes personnalisées.
                </p>
              </div>
            </div>
            <a href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`} target="_blank" rel="noopener noreferrer" className={inviteBtnCls}>
              <span>Inviter le bot</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {liveMusicState?.currentTrack && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
            <img src={liveMusicState.currentTrack.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{liveMusicState.currentTrack.title}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {liveMusicState.status === "PLAYING" ? "En lecture" : "En pause"} · {liveMusicState.currentTrack.artist}
                {liveMusicState.voiceChannel ? ` · ${liveMusicState.voiceChannel.name}` : ""}
                {typeof liveMusicState.queueLength === "number" ? ` · file : ${liveMusicState.queueLength}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={handleMusicPrev} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--text-primary)]" title="Précédent" aria-label="Piste précédente">
                <SkipBack className="h-4 w-4" />
              </button>
              <button type="button" onClick={handleMusicPlayPause} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-white/[0.07] text-[var(--text-primary)] transition-colors hover:bg-white/[0.13]" title={liveMusicState.status === "PLAYING" ? "Pause" : "Lecture"} aria-label={liveMusicState.status === "PLAYING" ? "Pause" : "Lecture"}>
                {liveMusicState.status === "PLAYING" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={handleMusicSkip} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--text-primary)]" title="Suivant" aria-label="Piste suivante">
                <SkipForward className="h-4 w-4" />
              </button>
              <Link href={`/discord/music?guildId=${selectedGuild.id}`} className={cn(secondaryBtn, "ml-1")}>
                <Music2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Music Center</span>
              </Link>
            </div>
          </div>
        )}

        <ModuleNavigator
          modules={navModules}
          categories={MODULE_CATEGORIES}
          activeId={activeModule ?? ""}
          onSelect={handleSelectModule}
          status={moduleStatus}
          onToggle={handleModuleToggle}
          recommendedIds={RECOMMENDED_MODULE_IDS}
          pendingIds={pendingModuleIds}
          heading="Modules"
          summary={`${activeModuleCount} / ${totalModuleCount} modules activés`}
        />

        {/* Panneau de configuration rapide du module ouvert */}
        <div id="module-panel" className={cn("scroll-mt-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-5 sm:p-6", !activeModule && "hidden")}>
          <div className="mb-5 flex items-center justify-between border-b border-[var(--panel-border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Configuration : {MODULES.find((m) => m.id === activeModule)?.title}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {MODULES.find((m) => m.id === activeModule)?.description}
              </p>
            </div>
            <button type="button" onClick={() => setActiveModule(null)} className={secondaryBtn}>
              Fermer
            </button>
          </div>

          {/* MODULE 0: Vue d'ensemble */}
          {activeModule === "overview" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Mission Control</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Statut du bot, modération, sécurité, musique, tickets, giveaways, backups et activité récente réunis en un coup d'œil — données réelles, pas de tuile fictive.
                  </p>
                </div>
                <Link
                  href={`/discord/overview?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 active:scale-95 cursor-pointer"
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Centre de Sécurité Anti-Raid</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Calcul dynamique du Risk Score (0-100), Live Monitor, activation du Raid Mode d'urgence et dossiers d'investigation.
                  </p>
                </div>
                <Link
                  href={`/discord/security/anti-raid?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Ouvrir Anti-Raid</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Anti-Nuke Command Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Centre Anti-Nuke</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Détection des bannissements massifs et suppressions de salons/rôles, sanction automatique configurable sur l'auteur.
                  </p>
                </div>
                <Link
                  href={`/discord/security/anti-nuke?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500 active:scale-95"
                >
                  <Bomb className="h-4 w-4" />
                  <span>Ouvrir Anti-Nuke</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Protection Anti-Raid automatique</p>
                  <p className="text-[11px] text-zinc-400">Détecte et bloque les arrivées massives de bots ou comptes suspects.</p>
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
                    "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                    guildSettings.antiRaidEnabled ? "bg-emerald-500" : "bg-zinc-700"
                  )}
                >
                  <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200", guildSettings.antiRaidEnabled ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Filtre Anti-Spam & Flooding</p>
                  <p className="text-[11px] text-zinc-400">Supprime automatiquement les répétitions excessives de messages.</p>
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
                    "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                    guildSettings.antiSpamEnabled ? "bg-emerald-500" : "bg-zinc-700"
                  )}
                >
                  <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200", guildSettings.antiSpamEnabled ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>

              {/* Mentions Limit (MODERN PILL SELECTOR - NO UGLY HTML SELECT) */}
              <div className="flex flex-col gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Limite de mentions par message</p>
                    {guildSettings.mentionLimit === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Désactivée (Spam libre)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Actif ({guildSettings.mentionLimit}/msg)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {guildSettings.mentionLimit === 0
                      ? "Désactivée : aucune limite de mentions, les membres peuvent mentionner librement sans sanction (spam autorisé)."
                      : "Nombre maximum d'utilisateurs ou rôles mentionnables avant sanction."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white/[0.04] p-1 border border-[var(--panel-border)]">
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
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                          isActive
                            ? val === 0
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                              : "bg-emerald-500 text-white shadow-sm"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[var(--inset-radius)] border border-rose-500/20 bg-rose-500/[0.05] p-4">
                <div>
                  <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Verrouillage d'urgence (Lockdown)
                  </p>
                  <p className="text-[11px] text-zinc-400">Empêche tout nouveau membre d'écrire dans les salons en cas d'attaque.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLockdown}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    guildSettings.emergencyLockdown
                      ? "bg-rose-500 text-white shadow-sm"
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
            <div className="space-y-4 text-xs">
              {/* Command Studio Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Command Studio & Builder</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Créez des commandes Slash (/) et Préfixe (!) sur-mesure, générez des embeds Discord riches, intégrez des variables dynamiques ({'{user}'}, {'{server}'}) et testez en direct dans le simulateur.
                  </p>
                </div>
                <Link
                  href={`/discord/commands?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Code2 className="h-4 w-4" />
                  <span>Ouvrir Command Studio</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Catalogue</p>
                  <p className="text-lg font-bold text-indigo-400 mt-1">Slash & Préfixe</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Activation / désactivation en 1 clic</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Embed Studio</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">Live Discord Render</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Bordures, footers & boutons</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Dynamique</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Variables Live</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{'{user}'}, {'{server}'}, {'{time}'}</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Testing</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Simulateur Terminal</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Test immédiat sans bot</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/commands?guildId=${selectedGuild.id}&tab=catalog`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Catalogue des Commandes</span>
                </Link>
                <Link
                  href={`/discord/commands?guildId=${selectedGuild.id}&tab=builder`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-400" />
                  <span>Créer une Commande No-Code</span>
                </Link>
                <Link
                  href={`/discord/commands?guildId=${selectedGuild.id}&tab=simulator`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Simulateur Discord Live</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE 3: Suggestions & Feedback */}
          {activeModule === "suggestions" && (
            <div className="space-y-4 text-xs">
              {/* Suggestions Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Boîte à Suggestions & Feedback</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Collectez les idées des membres, organisez les votes communautaires (👍 / 👎), traitez les propositions sur un tableau Kanban et publiez les décisions officielles du Staff.
                  </p>
                </div>
                <Link
                  href={`/discord/suggestions?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span>Ouvrir Suggestions Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Traitement</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Kanban Staff</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">En Attente / Approuvée / Rejetée</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Communauté</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Votes Discord</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Boutons interactifs 👍 👎</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Réponses</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Avis Officiel</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Mise à jour directe de l'embed</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Protection</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">Anti-Doublon</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Filtres et cooldown par membre</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=kanban`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sliders className="h-3.5 w-3.5 text-amber-400" />
                  <span>Tableau Kanban des Idées</span>
                </Link>
                <Link
                  href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=response_studio`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Send className="h-3.5 w-3.5 text-orange-400" />
                  <span>Modération & Réponses Staff</span>
                </Link>
                <Link
                  href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=hall_of_fame`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Crown className="h-3.5 w-3.5 text-yellow-400" />
                  <span>Top Idées (Hall of Fame)</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE 4: Leveling & XP */}
          {activeModule === "leveling" && (
            <div className="space-y-4 text-xs">
              {/* Leveling Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Leveling & Rôles XP Center</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Stimulez l'activité de votre serveur : classement interactif, designer de cartes de profil Discord (/rank), attribution automatique de rôles par paliers et bonus pour Nitro Boosters.
                  </p>
                </div>
                <Link
                  href={`/discord/leveling?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Award className="h-4 w-4" />
                  <span>Ouvrir Leveling Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Leaderboard</p>
                  <p className="text-lg font-bold text-fuchsia-400 mt-1">Top 100 Live</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Trophées, barres d'XP & ranks</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Rank Card</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">Card Studio Live</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Bannières, couleurs & thèmes</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Paliers</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Rôles Récompenses</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Déblocage auto par niveau</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Multiplicateurs</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Vocal & Boosters</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Gains en vocal et bonus x1.5</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/leveling?guildId=${selectedGuild.id}&tab=leaderboard`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Crown className="h-3.5 w-3.5 text-fuchsia-400" />
                  <span>Classement & Leaderboard</span>
                </Link>
                <Link
                  href={`/discord/leveling?guildId=${selectedGuild.id}&tab=card_designer`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Rank Card Designer</span>
                </Link>
                <Link
                  href={`/discord/leveling?guildId=${selectedGuild.id}&tab=rewards`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  <span>Gérer les Rôles Récompenses</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE 5: Giveaways & Concours */}
          {activeModule === "giveaways" && (
            <div className="space-y-4 text-xs">
              {/* Giveaways Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Giveaways & Tirages au Sort</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Pilotez vos concours Discord : création assistée, restrictions de rôles et d'ancienneté, tirage cryptographique impartial (SHA-256 CSPRNG) et système de Reroll en un clic.
                  </p>
                </div>
                <Link
                  href={`/discord/giveaways?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Gift className="h-4 w-4" />
                  <span>Ouvrir Giveaways Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Concours</p>
                  <p className="text-lg font-bold text-rose-400 mt-1">Live Discord</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Comptes à rebours & embeds</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Impartialité</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">SHA-256 CSPRNG</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Graines vérifiables sans triche</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Conditions</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Rôles & Bonus</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Chances + pour Boosters</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Gestion</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Reroll 1-Clic</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Redistribution immédiate</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=create`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-rose-400" />
                  <span>Lancer un Nouveau Concours</span>
                </Link>
                <Link
                  href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=active`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Gift className="h-3.5 w-3.5 text-amber-400" />
                  <span>Concours en Cours</span>
                </Link>
                <Link
                  href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=history`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Historique des Gagnants & Reroll</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE: Tickets Center */}
          {activeModule === "tickets" && (
            <div className="space-y-4 text-xs">
              {/* Tickets Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Tickets Center & Helpdesk</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Helpdesk complet multi-catégories, formulaires avec questions dynamiques, équipes de staff, assignation/transfert, transcripts HTML/TXT/JSON et liaisons avec les Dossiers de Modération.
                  </p>
                </div>
                <Link
                  href={`/discord/tickets?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Ticket className="h-4 w-4" />
                  <span>Ouvrir Tickets Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Helpdesk</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Multi-Équipes</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Support, Mod & Facturation</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Formulaires</p>
                  <p className="text-lg font-bold text-teal-400 mt-1">Modals Discord</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Champs configurables</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Archivage</p>
                  <p className="text-lg font-bold text-indigo-400 mt-1">Transcripts</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">HTML, TXT & JSON</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Audit & Qualité</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Notes & CSAT</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Avis membres (1-5★)</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/tickets?guildId=${selectedGuild.id}&tab=panels`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Créer un Panneau Discord</span>
                </Link>
                <Link
                  href={`/discord/tickets?guildId=${selectedGuild.id}&tab=categories`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Settings2 className="h-3.5 w-3.5 text-teal-400" />
                  <span>Gérer les Catégories</span>
                </Link>
                <Link
                  href={`/discord/tickets?guildId=${selectedGuild.id}&tab=transcripts`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Historique des Transcripts</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE: Welcome & Onboarding */}
          {activeModule === "welcome" && (
            <div className="space-y-4 text-xs">
              {/* Welcome Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Bienvenue & Onboarding Center</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Personnalisation complète sans coder : Message & Embed Builder avec Live Preview, boutons interactifs, cartes de bienvenue, DM Welcome, onboarding multi-étapes et entonnoir de conversion.
                  </p>
                </div>
                <Link
                  href={`/discord/welcome?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Ouvrir Welcome Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Welcome & Embed</p>
                  <p className="text-lg font-bold text-teal-400 mt-1">Live Preview</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Rendu Discord instantané</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Parcours</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Onboarding Flow</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Règles, rôles & questions</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sécurité</p>
                  <p className="text-lg font-bold text-blue-400 mt-1">Vérification</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Boutons & déblocage rôles</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Conversion</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Funnel Analytics</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Taux de complétion en direct</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/welcome?guildId=${selectedGuild.id}&tab=builder`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sliders className="h-3.5 w-3.5 text-teal-400" />
                  <span>Message & Embed Builder</span>
                </Link>
                <Link
                  href={`/discord/welcome?guildId=${selectedGuild.id}&tab=onboarding`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Configurer l&apos;Onboarding</span>
                </Link>
                <Link
                  href={`/discord/welcome?guildId=${selectedGuild.id}&tab=templates`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Templates Prêts à l&apos;Emploi</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE 6: Modération & Sanctions */}
          {activeModule === "moderation" && (
            <div className="space-y-4 text-xs">
              {/* Moderation Center / Case System Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Centre de Modération & Case System</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Suivi centralisé des sanctions (Cases #1, #2...), annulation avec audit trail, scheduler d&apos;expiration, notes staff privées et protection anti-abus.
                  </p>
                </div>
                <Link
                  href={`/discord/moderation?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95"
                >
                  <Hammer className="h-4 w-4" />
                  <span>Ouvrir Moderation</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* AutoMod Command Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Centre de Modération Intelligente AutoMod</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Moteur multi-détecteurs (Spam, Flood, Liens, Invites, Mentions, Caps, Regex, Profils), Rule Builder dynamique, Sanctions progressives (Strikes) et Sandbox de test.
                  </p>
                </div>
                <Link
                  href={`/discord/moderation/automod?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95"
                >
                  <Zap className="h-4 w-4" />
                  <span>Ouvrir AutoMod</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Salon de notification des sanctions</p>
                <ChannelPicker
                  value={modLogChannelId}
                  onChange={(id) => setModLogChannelId(id || null)}
                  guildId={selectedGuild.id}
                  emptyLabel="Détection automatique (salon « mod-logs », « logs » ou « audit »)"
                  allowClear
                />
                <p className="text-[11px] text-zinc-400">
                  Toutes les sanctions appliquées (<code className="text-orange-300">/warn</code>, <code className="text-orange-300">/mute</code>, <code className="text-orange-300">/kick</code>, <code className="text-orange-300">/ban</code>) y seront journalisées. Sans sélection, le bot cherche automatiquement un salon nommé « mod-logs », « logs » ou « audit ».
                </p>
              </div>
            </div>
          )}

          {/* MODULE 7: Audit & Logs */}
          {activeModule === "logs" && (
            <div className="space-y-4 text-xs">
              {/* Audit Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Audit Center & Traçabilité Temps Réel</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Moteur de traçabilité temps réel, mode enquête (&plusmn;15 min), diffs avant/après, corrélation des sanctions (Cases &amp; Raids), routage multi-salons Discord et exports CSV/JSON.
                  </p>
                </div>
                <Link
                  href={`/discord/logs?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95"
                >
                  <FileText className="h-4 w-4" />
                  <span>Ouvrir Audit Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Surveillance des événements serveur</p>
                <div className="space-y-2.5 pt-1 text-[11px]">
                  <Checkbox
                    checked={logsPreview.messages}
                    onCheckedChange={(v) => setLogsPreview((p) => ({ ...p, messages: v }))}
                    label="Journaliser la suppression et modification de messages"
                    className="text-zinc-300 [&_span]:text-[11px] [&_span]:text-zinc-300"
                  />
                  <Checkbox
                    checked={logsPreview.roles}
                    onCheckedChange={(v) => setLogsPreview((p) => ({ ...p, roles: v }))}
                    label="Journaliser les modifications de rôles, permissions et salons"
                    className="text-zinc-300 [&_span]:text-[11px] [&_span]:text-zinc-300"
                  />
                  <Checkbox
                    checked={logsPreview.members}
                    onCheckedChange={(v) => setLogsPreview((p) => ({ ...p, members: v }))}
                    label="Journaliser les arrivées, départs, bans et timeouts"
                    className="text-zinc-300 [&_span]:text-[11px] [&_span]:text-zinc-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODULE: Lecteur Musique */}
          {activeModule === "music" && (
            <div className="space-y-4 text-xs">
              {/* Music Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Centre de Contrôle Musical ETHONE</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Lecteur audio synchronisé en direct, file d&apos;attente drag & drop, recherche multi-sources, playlists, favoris et mode DJ.
                  </p>
                </div>
                <Link
                  href={`/discord/music?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Music2 className="h-4 w-4" />
                  <span>Ouvrir Music Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">État du lecteur audio</p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">
                      {liveMusicState?.currentTrack ? liveMusicState.currentTrack.title : "Aucune musique en cours"}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {liveMusicState?.currentTrack
                        ? `${liveMusicState.currentTrack.artist} • File: ${liveMusicState.queueLength} titres`
                        : "Utilisez la commande /music play ou le Music Center pour écouter."}
                    </p>
                  </div>
                  {liveMusicState?.currentTrack && (
                    <div className="flex items-center gap-1 bg-black/40 border border-[var(--panel-border)] p-1 rounded-xl">
                      <button
                        onClick={handleMusicPlayPause}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 cursor-pointer"
                      >
                        {liveMusicState.status === "PLAYING" ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
                      </button>
                      <button
                        onClick={handleMusicSkip}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
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
            <div className="space-y-4 text-xs">
              {/* Invites & Referrals Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Invite Tracker &amp; Referral Center</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Tracking précis des invitations Discord, calcul de diff par snapshot, détection des faux joins (Risk Score 0-100), campagnes avec objectifs et distribution sécurisée de rôles récompenses.
                  </p>
                </div>
                <Link
                  href={`/discord/invites?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Ouvrir Invites Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Fonctionnalités actives du tracker</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Snapshot en temps réel de toutes les invitations de la guilde</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Algorithme heuristique anti-triche (âge du compte, burst, churn)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                    <span>Suivi de la rétention des membres (24h, 3j, 7j, 30j)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                    <span>Attribution de rôles par paliers avec vérification de hiérarchie</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE: Salons Vocaux */}
          {activeModule === "voice" && (
            <div className="space-y-4 text-xs">
              {/* Voice Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Voice Channels &amp; Hubs Temporaires</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Salons vocaux temporaires automatiques, hubs multiples (Gaming, Chill, Ranked, VIP), panneaux de contrôle Discord, transfert d&apos;ownership et règles d&apos;automatisation.
                  </p>
                </div>
                <Link
                  href={`/discord/voice?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Radio className="h-4 w-4" />
                  <span>Ouvrir Voice Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Fonctionnalités vocales actives</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Création instantanée dès la connexion à un salon Hub</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                    <span>Suppression automatique avec délai de grâce anti-accidents</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                    <span>Panneau de contrôle intégré dans Discord (Renommer, Lock, Limite)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Stratégies intelligentes de transfert de propriété</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE: Server Backup & Disaster Recovery */}
          {activeModule === "backups" && (
            <div className="space-y-4 text-xs">
              {/* Backup Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Server Backup &amp; Disaster Recovery</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Sauvegardez l&apos;intégralité de la structure Discord et des modules ETHONE, comparez les versions et restaurez sélectivement avec rollback automatique.
                  </p>
                </div>
                <Link
                  href={`/discord/backups?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  <span>Ouvrir Backup Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Garanties &amp; Protections de Secours</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Snapshots immuables certifiés SHA-256</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                    <span>Rollback automatique capturé avant toute restauration</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Comparateur visuel de diffs (Ajouté, Modifié, Supprimé)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                    <span>Sauvegardes protégées inviolables contre la purge</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE: AI Assistant */}
          {activeModule === "ai" && (
            <div className="space-y-4 text-xs">
              {/* AI Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">ETHONE AI Assistant &amp; Knowledge Hub</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Assistant IA Discord intelligent, base de connaissances RAG sémantique, builder de personnalités à 5 curseurs, permissions de salons et handoff de tickets de support.
                  </p>
                </div>
                <Link
                  href={`/discord/ai?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Bot className="h-4 w-4" />
                  <span>Ouvrir AI Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Fonctionnalités IA Disponibles</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                    <span>RAG sémantique (sources globales, par salon ou restreintes aux rôles)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Bouclier de sécurité anti-jailbreak &amp; prompt injection strict</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                    <span>Commandes slash /ask et /summarize natives avec boutons d&apos;action</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Intégration Helpdesk &amp; escalade en ticket privé pour le staff</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE: Forms & Applications */}
          {activeModule === "forms" && (
            <div className="space-y-4 text-xs">
              {/* Forms Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Forms &amp; Applications — No-Code Builder</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Créez des formulaires glisser-déposer sur-mesure (candidatures staff, whitelist, partenariats, feedbacks), publiez-les sur Discord et traitez les candidatures avec review privée et scoring.
                  </p>
                </div>
                <Link
                  href={`/discord/forms?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Ouvrir Forms Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Fonctionnalités Clés du Form Builder</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                    <span>Builder drag &amp; drop 20 types de champs (Texte, Rôles, Fichiers, Étoiles)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                    <span>Moteur de logique conditionnelle dynamique et étapes multi-steps</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Panneau Discord interactif (Bouton d&apos;application + Modal natif)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Review staff privée, attribution de rôles automatique et scoring pondéré</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE: Polls & Voting */}
          {activeModule === "polls" && (
            <div className="space-y-4 text-xs">
              {/* Polls Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Polls &amp; Voting Center</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Sondages démocratiques, consultations privées du staff, pondération des voix selon les rôles Discord, votes à bulletin secret et quorums d&apos;approbation.
                  </p>
                </div>
                <Link
                  href={`/discord/polls?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Vote className="h-4 w-4" />
                  <span>Ouvrir Polls Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-3">
                <p className="font-bold text-white">Garanties &amp; Fonctionnalités de Vote</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                    <span>9 modes de scrutin (Choix unique, multiple, préférentiel, pondéré, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Calcul automatique de quorum et majorité qualifiée</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                    <span>Pondération des voix paramétrable selon les rôles du serveur</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Bulletins secrets avec anonymisation intégrale garantie</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE: Reaction Roles & Auto-Roles */}
          {activeModule === "roles" && (
            <div className="space-y-4 text-xs">
              {/* Roles Center Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Reaction Roles & Auto-Roles</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Panneaux de sélection de rôles par boutons cliquables et menus déroulants Discord, attribution automatique à l'arrivée (Join-Roles), rôles temporaires avec expiration et audit de hiérarchie.
                  </p>
                </div>
                <Link
                  href={`/discord/roles?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Tag className="h-4 w-4" />
                  <span>Ouvrir Roles Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Panneaux</p>
                  <p className="text-lg font-bold text-pink-400 mt-1">Boutons & Menus</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Composants natifs Discord</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sélection</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">Unique ou Multiple</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Règles d'exclusivité de groupe</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Accueil</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Join-Roles Auto</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Immédiat ou différé X minutes</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sécurité</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Hiérarchie Bot</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Prévention anti-escalade 403</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/roles?guildId=${selectedGuild.id}&tab=panels`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Sliders className="h-3.5 w-3.5 text-pink-400" />
                  <span>Panneaux de Rôles Actifs</span>
                </Link>
                <Link
                  href={`/discord/roles?guildId=${selectedGuild.id}&tab=builder`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-400" />
                  <span>Créer un Panneau Discord</span>
                </Link>
                <Link
                  href={`/discord/roles?guildId=${selectedGuild.id}&tab=join_roles`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span>Configurer les Join-Roles</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE 8: Analytics & Insights */}
          {activeModule === "analytics" && (
            <div className="space-y-4 text-xs">
              {/* Analytics Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Analytics & Server Insights</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Surveillez la santé de votre serveur en temps réel : volume de messages, flux d'arrivées et départs, heatmaps horaires d'affluence, rétention et classement des membres les plus actifs.
                  </p>
                </div>
                <Link
                  href={`/discord/analytics?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Ouvrir Analytics Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Activité</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Messages 14j</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Graphiques & répartitions médias</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Croissance</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Flux Membres</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Arrivées nettes & taux de rétention</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Créneaux</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Heatmap 24h/7j</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Pics d'affluence pour annonces</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Salons</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">Part de Voix</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Salons textuels & heures vocales</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/analytics?guildId=${selectedGuild.id}&tab=messages`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Activité des Messages</span>
                </Link>
                <Link
                  href={`/discord/analytics?guildId=${selectedGuild.id}&tab=growth`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Croissance & Rétention</span>
                </Link>
                <Link
                  href={`/discord/analytics?guildId=${selectedGuild.id}&tab=heatmap`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Heatmap d'Affluence</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE: Events & Calendar */}
          {activeModule === "events" && (
            <div className="space-y-4 text-xs">
              {/* Events Gateway */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Events &amp; Calendar</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Planifiez vos soirées gaming, tournois et réunions avec calendrier interactif (Mois, Semaine, Agenda), gestion des inscriptions (Going, Maybe, Waitlist), pointages et rappels automatiques.
                  </p>
                </div>
                <Link
                  href={`/discord/events?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Ouvrir Events Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Affichage</p>
                  <p className="text-lg font-bold text-indigo-400 mt-1">Calendrier Interactif</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Vues Mois, Semaine, Jour &amp; Agenda</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Inscriptions</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">RSVP &amp; Waitlist</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Jauges &amp; promotion automatique</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Discord</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Embeds &amp; Boutons</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Pointage vocal &amp; slash /event</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Export</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">iCal (.ics)</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Synchro Google / Apple Calendar</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/events?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Tous les Événements</span>
                </Link>
                <Link
                  href={`/discord/calendar?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Vue Calendrier</span>
                </Link>
                <Link
                  href={`/discord/events/create?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-400" />
                  <span>Créer un Événement</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE 20: Server Management Center */}
          {activeModule === "server" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Server Management Center</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Contrôle intégral : diagnostic santé, score de sécurité, membres, salons, rôles, permission debugger et emojis.
                  </p>
                </div>
                <Link
                  href={`/discord/server?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95"
                >
                  <Server className="h-4 w-4" />
                  <span>Ouvrir Server Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sécurité</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Score 0-100</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Évaluation transparente</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Membres</p>
                  <p className="text-lg font-bold text-indigo-400 mt-1">Profil &amp; Risk</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Timeout, Kick &amp; Ban</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Salons &amp; Rôles</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">Arborescence</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Hiérarchie &amp; Plafond Bot</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Permissions</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">Debugger</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Résolution pas à pas</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/discord/server/members?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Membres</span>
                </Link>
                <Link
                  href={`/discord/server/channels?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Hash className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Salons</span>
                </Link>
                <Link
                  href={`/discord/server/roles?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Shield className="h-3.5 w-3.5 text-purple-400" />
                  <span>Rôles</span>
                </Link>
                <Link
                  href={`/discord/server/permissions?guildId=${selectedGuild.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Permissions &amp; Debugger</span>
                </Link>
              </div>
            </div>
          )}

          {/* MODULE: Starboard */}
          {activeModule === "starboard" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Starboard — Hall of Fame</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Quand un message atteint un seuil de réactions ⭐, le bot le republie dans un salon dédié avec un embed maintenu à jour. Salon, emoji, seuil et options se règlent ici.
                  </p>
                </div>
                <Link
                  href={`/discord/starboard?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Star className="h-4 w-4" />
                  <span>Ouvrir le Starboard</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Mise en route</p>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] text-zinc-300">
                  <li>Ouvrez le Starboard et choisissez le salon de publication.</li>
                  <li>Réglez l&apos;emoji (⭐ par défaut) et le seuil de réactions.</li>
                  <li>Activez — ou lancez <code className="rounded bg-black/30 px-1">/starboard setup</code> directement sur Discord.</li>
                </ol>
              </div>
            </div>
          )}

          {activeModule === "sticky" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Sticky Messages</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Épingle un message en bas d&apos;un salon (règles, format d&apos;une candidature, lien utile…). Dès qu&apos;un membre écrit, le bot supprime l&apos;ancien et le republie tout en bas, avec un anti-rebond réglable.
                  </p>
                </div>
                <Link
                  href={`/discord/sticky?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Pin className="h-4 w-4" />
                  <span>Ouvrir Sticky Messages</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Mise en route</p>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] text-zinc-300">
                  <li>Ouvrez Sticky Messages et choisissez un salon.</li>
                  <li>Écrivez le contenu, choisissez texte ou embed, et le délai anti-rebond.</li>
                  <li>Enregistrez — ou lancez <code className="rounded bg-black/30 px-1">/sticky set</code> directement sur Discord.</li>
                </ol>
                <p className="text-[11px] text-zinc-400">Le bot a besoin des permissions <strong>Envoyer des messages</strong> et <strong>Gérer les messages</strong> dans le salon.</p>
              </div>
            </div>
          )}

          {activeModule === "reminders" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Reminders</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Programme un rappel (<code className="rounded bg-black/30 px-1">/reminder add 2h révise le TP</code>). À l&apos;échéance, le bot te mentionne dans le salon avec ton message. Récurrence quotidienne / hebdomadaire possible.
                  </p>
                </div>
                <Link
                  href={`/discord/reminders?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Clock className="h-4 w-4" />
                  <span>Ouvrir Reminders</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Commandes</p>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  <li><code className="rounded bg-black/30 px-1">/reminder add</code> — délai (<code className="rounded bg-black/30 px-1">10m</code>, <code className="rounded bg-black/30 px-1">2h</code>, <code className="rounded bg-black/30 px-1">1d</code>, <code className="rounded bg-black/30 px-1">1h30m</code>) + message + récurrence</li>
                  <li><code className="rounded bg-black/30 px-1">/reminder list</code> — tes rappels en attente</li>
                  <li><code className="rounded bg-black/30 px-1">/reminder cancel &lt;id&gt;</code> — annuler</li>
                </ul>
              </div>
            </div>
          )}

          {activeModule === "statroles" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Statroles</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Donne et retire un rôle selon l&apos;activité dans la durée (ex. « Actif » : 100 messages sur 30 jours ET 30 jours d&apos;ancienneté). Ce qu&apos;un rôle de niveau ne sait pas faire : le rôle se retire tout seul. Désactivé par défaut ; s&apos;appuie sur le module Statistiques.
                  </p>
                </div>
                <Link
                  href={`/discord/statroles?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <span>Ouvrir Statroles</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeModule === "settings" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Paramètres</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Langue et fuseau horaire du bot, contacts d&apos;urgence (prévenus par mention et message privé quand une permission manque ou qu&apos;un salon configuré est supprimé), préfixe et types de commandes.
                  </p>
                </div>
                <Link
                  href={`/discord/settings?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <span>Ouvrir les Paramètres</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeModule === "secureroles" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Rôles sécurisés</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Les permissions sensibles d&apos;un rôle du personnel sont déplacées vers un rôle caché que le membre n&apos;obtient que pour quelques minutes, après un code de son application d&apos;authentification (<code className="rounded bg-black/30 px-1">/elevate</code>). Le rôle garde son nom, sa couleur et sa place dans la hiérarchie. Désactivé par défaut.
                  </p>
                </div>
                <Link
                  href={`/discord/secure-roles?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <span>Ouvrir Rôles sécurisés</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeModule === "stats" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Statistiques</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Messages et vocal par jour, arrivées / départs, top membres et salons, fiche par membre. Sur Discord : <code className="rounded bg-black/30 px-1">/stats server</code>, <code className="rounded bg-black/30 px-1">/stats member</code>, <code className="rounded bg-black/30 px-1">/stats top</code>. Désactivé par défaut : les données se collectent à partir de l&apos;activation.
                  </p>
                </div>
                <Link
                  href={`/discord/stats?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <span>Ouvrir Statistiques</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeModule === "counting" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-bold text-white">Comptage</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Les membres comptent <code className="rounded bg-black/30 px-1">1, 2, 3…</code> à tour de rôle dans un salon dédié. Une erreur remet le compteur à zéro ; le record et le classement sont conservés. Désactivé par défaut : lancez-le avec <code className="rounded bg-black/30 px-1">/counting setup</code> ou depuis la page du module.
                  </p>
                </div>
                <Link
                  href={`/discord/counting?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <span>Ouvrir Comptage</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activeModule === "afk" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">AFK</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    <code className="rounded bg-black/30 px-1">/afk déjeuner</code> te marque absent. Le bot répond « X est AFK : déjeuner » à ceux qui te mentionnent, et retire ton statut dès que tu reparles (avec le décompte des mentions manquées).
                  </p>
                </div>
                <Link
                  href={`/discord/afk?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Moon className="h-4 w-4" />
                  <span>Ouvrir AFK</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Réglages</p>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  <li>Retirer le statut au premier message (on/off)</li>
                  <li>Prévenir sur mention (on/off)</li>
                  <li>Préfixer le pseudo avec <code className="rounded bg-black/30 px-1">[AFK]</code> (nécessite Gérer les pseudos)</li>
                  <li>Auto-suppression des réponses du bot (0–60 s)</li>
                </ul>
              </div>
            </div>
          )}

          {activeModule === "birthdays" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Birthdays</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    <code className="rounded bg-black/30 px-1">/birthday set 14 07</code> enregistre ta date. Chaque jour à l&apos;heure configurée, le bot annonce les anniversaires du jour dans un salon (message personnalisable, âge affiché si l&apos;année est donnée) et attribue un rôle « Anniversaire » retiré le lendemain.
                  </p>
                </div>
                <Link
                  href={`/discord/birthdays?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Cake className="h-4 w-4" />
                  <span>Ouvrir Birthdays</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Commandes</p>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  <li><code className="rounded bg-black/30 px-1">/birthday set &lt;jour&gt; &lt;mois&gt; [année]</code></li>
                  <li><code className="rounded bg-black/30 px-1">/birthday list</code> — anniversaires à venir</li>
                  <li><code className="rounded bg-black/30 px-1">/birthday remove</code></li>
                  <li><code className="rounded bg-black/30 px-1">/birthday config</code> — [Admin] salon, heure, rôle, message</li>
                </ul>
              </div>
            </div>
          )}

          {activeModule === "tags" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Tags</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    <code className="rounded bg-black/30 px-1">/tag add faq &lt;texte&gt;</code> crée une réponse réutilisable, <code className="rounded bg-black/30 px-1">/tag get faq</code> l&apos;affiche (avec autocomplétion). Idéal pour les FAQ, formats de candidature, liens récurrents.
                  </p>
                </div>
                <Link
                  href={`/discord/tags?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Hash className="h-4 w-4" />
                  <span>Ouvrir Tags</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Commandes</p>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  <li><code className="rounded bg-black/30 px-1">/tag get &lt;nom&gt;</code> — affiche un tag</li>
                  <li><code className="rounded bg-black/30 px-1">/tag add | edit | remove</code> — [Gérer les messages]</li>
                  <li><code className="rounded bg-black/30 px-1">/tag list</code> · <code className="rounded bg-black/30 px-1">/tag info &lt;nom&gt;</code></li>
                </ul>
              </div>
            </div>
          )}

          {activeModule === "serverstats" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Server Stats</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Transforme un salon (vocal verrouillé de préférence) en compteur : son nom affiche le nombre de membres, de boosts, de membres en ligne, etc. Renommé automatiquement toutes les 10-60 min (limite Discord).
                  </p>
                </div>
                <Link
                  href={`/discord/server-stats?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Ouvrir Server Stats</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Commandes</p>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  <li><code className="rounded bg-black/30 px-1">/serverstats add &lt;salon&gt; &lt;type&gt; [format] [role]</code></li>
                  <li><code className="rounded bg-black/30 px-1">/serverstats list | remove | refresh</code></li>
                  <li><code className="rounded bg-black/30 px-1">/serverstats config</code> — actif on/off, intervalle</li>
                </ul>
              </div>
            </div>
          )}

          {activeModule === "highlights" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Highlights</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    <code className="rounded bg-black/30 px-1">/highlight add ethone</code> surveille un mot-clé. Dès qu&apos;un AUTRE membre l&apos;écrit dans le serveur, tu reçois un DM avec l&apos;auteur, le salon et un lien direct. Réglage 100% personnel : chacun voit et gère ses propres mots-clés.
                  </p>
                </div>
                <Link
                  href={`/discord/highlights?guildId=${selectedGuild.id}`}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>Ouvrir Highlights</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-4 space-y-2">
                <p className="font-bold text-white">Commandes</p>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  <li><code className="rounded bg-black/30 px-1">/highlight add | remove &lt;mot-clé&gt;</code> — max 15 par membre</li>
                  <li><code className="rounded bg-black/30 px-1">/highlight list</code> — tes mots-clés et ton état</li>
                  <li><code className="rounded bg-black/30 px-1">/highlight toggle &lt;actif&gt;</code> — pause sans tout supprimer</li>
                  <li><code className="rounded bg-black/30 px-1">/highlight mute-channel | unmute-channel &lt;salon&gt;</code> — ignore un salon trop actif</li>
                </ul>
              </div>
            </div>
          )}

          {/* MODULE 21: Bot Control Center */}
          {activeModule === "bot" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 p-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Bot Control Center &amp; Intelligence</p>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Surveillance intégrale du bot : monitoring V8 CPU/RAM, modules, débit temps réel, diagnostic, erreurs dédoublonnées et tokens IA.
                  </p>
                </div>
                <Link
                  href="/discord/bot"
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4] active:scale-95"
                >
                  <Bot className="h-4 w-4" />
                  <span>Ouvrir Bot Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">État Global</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">Opérationnel</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">9 sous-systèmes sains</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Télémétrie</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">V8 &amp; Latence</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Percentiles P50/P95/P99</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Modules Actifs</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">22 Modules</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Santé &amp; dépendances</p>
                </div>
                <div className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Auto-Diagnostic</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">17 Tests</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Contrôle interne complet</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/discord/bot?tab=modules"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Modules (22)</span>
                </Link>
                <Link
                  href="/discord/bot?tab=commands"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Commandes</span>
                </Link>
                <Link
                  href="/discord/bot?tab=performance"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Performances</span>
                </Link>
                <Link
                  href="/discord/bot?tab=diagnostics"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                >
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  <span>Diagnostics (17 Tests)</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      {onboardingModal}
    </>
  );
}
