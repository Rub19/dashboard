"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Key,
  BarChart3,
  Code2,
  Lightbulb,
  Award,
  Gift,
  Hammer,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Server,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Sliders,
  RefreshCw,
  Activity,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Volume2,
  Hash,
  Send,
  Crown,
  Settings2,
  Radio,
  ToggleLeft,
  ToggleRight,
  Save,
  Minus,
  Zap,
  Music2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Disc,
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
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import DiscordIcon from "@/components/DiscordIcon";
import { cn } from "@/lib/utils";
import { useDiscordOnboarding } from "@/lib/hooks/useDiscordOnboarding";
import DiscordOnboardingModal from "@/components/discord/onboarding/DiscordOnboardingModal";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

type ModuleType =
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
  | "bot";

interface BotModule {
  id: ModuleType;
  title: string;
  description: string;
  icon: any;
  color: string;
  badge: string;
}

const MODULES: BotModule[] = [
  {
    id: "security",
    title: "Sécurité & Anti-Raid",
    description: "Protection contre les raids, mass joins, anti-spam et verrouillage d'urgence.",
    icon: ShieldCheck,
    color: "text-emerald-400",
    badge: "Sécurité",
  },
  {
    id: "commands",
    title: "Command Builder",
    description: "Créez vos commandes Discord personnalisées avec réponses textes et embeds.",
    icon: Code2,
    color: "text-indigo-400",
    badge: "Custom",
  },
  {
    id: "suggestions",
    title: "Boîte à Suggestions",
    description: "Système de boîte à idées avec votes communautaires et statuts.",
    icon: Lightbulb,
    color: "text-amber-400",
    badge: "Communauté",
  },
  {
    id: "leveling",
    title: "Leveling & Rôles XP",
    description: "Gain d'expérience par messages et distribution automatique de rôles.",
    icon: Award,
    color: "text-fuchsia-400",
    badge: "Progression",
  },
  {
    id: "giveaways",
    title: "Tirages au sort",
    description: "Création et gestion de concours avec sélection aléatoire de gagnants.",
    icon: Gift,
    color: "text-rose-400",
    badge: "Événements",
  },
  {
    id: "tickets",
    title: "Tickets Center 2.0",
    description: "Helpdesk professionnel, formulaires, équipes de staff, transcripts et statistiques.",
    icon: Ticket,
    color: "text-emerald-400",
    badge: "Helpdesk",
  },
  {
    id: "welcome",
    title: "Bienvenue & Onboarding 2.0",
    description: "Messages d'accueil, embeds, cartes de bienvenue, auto-rôles, vérification et onboarding complet.",
    icon: Sparkles,
    color: "text-teal-400",
    badge: "Onboarding",
  },
  {
    id: "moderation",
    title: "Modération & Sanctions",
    description: "Réglages des avertissements, mutes, expulsions et bannissements.",
    icon: Hammer,
    color: "text-orange-400",
    badge: "Staff",
  },
  {
    id: "logs",
    title: "Journal d'Audit",
    description: "Configuration des salons de logs pour messages et événements serveurs.",
    icon: FileText,
    color: "text-blue-400",
    badge: "Surveillance",
  },
  {
    id: "music",
    title: "Lecteur Musique 2.0",
    description: "Contrôle en direct de la musique vocale, queue, playlists et mode DJ.",
    icon: Music2,
    color: "text-violet-400",
    badge: "Live Audio",
  },
  {
    id: "invites",
    title: "Invites & Parrainages 2.0",
    description: "Tracking précis des invitations Discord, détection des faux joins, scores de risque et récompenses.",
    icon: UserPlus,
    color: "text-amber-400",
    badge: "Croissance",
  },
  {
    id: "voice",
    title: "Salons Vocaux 2.0",
    description: "Join-to-Create, salons temporaires automatiques, hubs et contrôle Discord.",
    icon: Radio,
    color: "text-emerald-400",
    badge: "Vocal",
  },
  {
    id: "backups",
    title: "Sauvegardes & Disaster Recovery 2.0",
    description: "Snapshots immuables, restauration sécurisée, comparateur diff et planification automatique.",
    icon: Archive,
    color: "text-indigo-400",
    badge: "Recovery",
  },
  {
    id: "ai",
    title: "AI Assistant 2.0",
    description: "Assistant IA Discord intelligent, base RAG sémantique, builder de personnalité et outils support.",
    icon: Bot,
    color: "text-violet-400",
    badge: "GenAI",
  },
  {
    id: "forms",
    title: "Forms & Applications 2.0",
    description: "Form Builder no-code, candidatures staff, logique conditionnelle, scoring et review.",
    icon: FileText,
    color: "text-cyan-400",
    badge: "Recrutement",
  },
  {
    id: "polls",
    title: "Sondages & Votes 2.0",
    description: "Sondages démocratiques, votes pondérés par rôles, décisions staff, quorums et bulletins secrets.",
    icon: Vote,
    color: "text-indigo-400",
    badge: "Démocratie",
  },
  {
    id: "roles",
    title: "Reaction Roles & Auto-Roles 2.0",
    description: "Panneaux de sélection de rôles par boutons et menus déroulants, join-roles et rôles temporaires.",
    icon: Tag,
    color: "text-pink-400",
    badge: "Rôles",
  },
  {
    id: "analytics",
    title: "Vue d'Ensemble & Insights",
    description: "Informations générales sur l'état du serveur et statistiques d'utilisation.",
    icon: BarChart3,
    color: "text-cyan-400",
    badge: "Données",
  },
  {
    id: "events",
    title: "Événements & Calendrier 2.0",
    description: "Planification d'événements, calendrier interactif, gestion des RSVP, jauges et rappels automatiques Discord.",
    icon: Calendar,
    color: "text-indigo-400",
    badge: "Événements",
  },
  {
    id: "server",
    title: "Server Management Center 2.0",
    description: "Centre de gestion globale : diagnostics santé, score de sécurité, membres, salons, rôles, permissions et emojis.",
    icon: Server,
    color: "text-blue-400",
    badge: "Serveur",
  },
  {
    id: "bot",
    title: "Bot Control Center 2.0",
    description: "Console centrale du bot : télémétrie temps réel, santé des 22 modules, commandes, bus d'événements, diagnostics et intelligence.",
    icon: Bot,
    color: "text-emerald-400",
    badge: "Bot Core",
  },
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
  modLogChannel: string;
  suggestionChannel: string;
  xpRate: number;
  xpCooldown: number;
  customCommands: Array<{ name: string; response: string; enabled: boolean }>;
}

const DEFAULT_SETTINGS: GuildSettings = {
  prefix: "!",
  antiRaidEnabled: true,
  antiSpamEnabled: true,
  mentionLimit: 5,
  emergencyLockdown: false,
  modLogChannel: "mod-logs",
  suggestionChannel: "suggestions",
  xpRate: 20,
  xpCooldown: 60,
  customCommands: [
    { name: "regles", response: "Bienvenue sur le serveur ! Merci de respecter les membres et de ne pas spammer.", enabled: true },
    { name: "site", response: "Découvrez notre plateforme sur https://ethone.dev", enabled: true },
  ],
};

export default function DiscordDashboardPage() {
  const router = useRouter();
  const { user, session } = useAuth();
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

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType>("security");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyManageable, setOnlyManageable] = useState(true);

  // Serveurs réels de l'utilisateur (ZÉRO FAKE INFO)
  const allGuilds: DiscordGuild[] = useMemo(() => {
    return profile?.guilds || [];
  }, [profile?.guilds]);

  // Filtrage : uniquement les serveurs où l'utilisateur est Admin / Owner
  const displayGuilds: DiscordGuild[] = useMemo(() => {
    if (!onlyManageable) return allGuilds;
    return allGuilds.filter((g) => canManageGuild(g));
  }, [allGuilds, onlyManageable]);

  const filteredGuilds = useMemo(() => {
    if (!searchQuery.trim()) return displayGuilds;
    const q = searchQuery.toLowerCase();
    return displayGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [displayGuilds, searchQuery]);

  // Sélection automatique du premier serveur réel
  useEffect(() => {
    if (!selectedGuild && displayGuilds.length > 0) {
      setSelectedGuild(displayGuilds[0]);
    } else if (selectedGuild && !displayGuilds.some((g) => g.id === selectedGuild.id) && displayGuilds.length > 0) {
      setSelectedGuild(displayGuilds[0]);
    }
  }, [displayGuilds, selectedGuild]);

  // Paramètres réels du serveur sélectionné avec persistance locale par guildId
  const [guildSettings, setGuildSettings] = useState<GuildSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Charger les paramètres du serveur sélectionné
  useEffect(() => {
    if (!selectedGuild) return;
    try {
      const saved = localStorage.getItem(`ethone:discord:settings:${selectedGuild.id}`);
      if (saved) {
        setGuildSettings(JSON.parse(saved));
      } else {
        setGuildSettings(DEFAULT_SETTINGS);
      }
    } catch {
      setGuildSettings(DEFAULT_SETTINGS);
    }
  }, [selectedGuild]);

  // Sauvegarder les paramètres pour ce serveur
  const handleSaveSettings = useCallback(() => {
    if (!selectedGuild) return;
    setIsSaving(true);
    try {
      localStorage.setItem(`ethone:discord:settings:${selectedGuild.id}`, JSON.stringify(guildSettings));
      success("Configuration enregistrée", `Réglages mis à jour pour "${selectedGuild.name}".`);
    } catch (err) {
      showError("Erreur de sauvegarde", "Impossible d'enregistrer les paramètres localement.");
    } finally {
      setIsSaving(false);
    }
  }, [selectedGuild, guildSettings, success, showError]);

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

  // --- Live Music Center 2.0 State ---
  const [liveMusicState, setLiveMusicState] = useState<any>({
    status: "IDLE",
    currentTrack: null,
    queue: [],
    volume: 80,
  });

  const fetchLiveMusic = useCallback(async () => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/state`);
      if (res.ok) {
        const data = await res.json();
        setLiveMusicState(data.state);
      }
    } catch {
      // Offline fallback
    }
  }, [selectedGuild, BOT_API_URL]);

  useEffect(() => {
    if (!BOT_API_URL) return;
    fetchLiveMusic();
    const interval = setInterval(fetchLiveMusic, 3000);
    return () => clearInterval(interval);
  }, [fetchLiveMusic, BOT_API_URL]);

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
      info("Musique", "Mode démo : Piste suivante simulée.");
      return;
    }
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/skip`, { method: "POST" });
      fetchLiveMusic();
    } catch {
      showError("Action impossible", "Erreur lors du passage de piste.");
    }
  };

  const handleMusicPrev = async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      info("Musique", "Mode démo : Piste précédente simulée.");
      return;
    }
    try {
      await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/music/previous`, { method: "POST" });
      fetchLiveMusic();
    } catch {
      showError("Action impossible", "Erreur lors du retour en arrière.");
    }
  };

  const isAuthenticated = !!user || !!session;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 pb-20 sm:p-6 sm:pb-24">
      {/* Top Header Banner */}
      <header className="mb-4 shrink-0">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#5865F2]/30 bg-[#5865F2]/15 text-[#5865F2] shadow-sm">
              <DiscordIcon className="h-6 w-6" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#07090d] bg-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">
                  ETHONE Bot
                </h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.2 text-[10px] font-bold text-emerald-400">
                  En ligne • v2.4
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Gestion et configuration de vos serveurs Discord en direct
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openOnboarding(0)}
              className="flex h-9 items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/20 active:scale-95 cursor-pointer"
              title="Revoir l'introduction d'ETHONE Bot"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Découvrir le Bot</span>
            </button>

            <Link
              href="/discord/setup"
              className="flex h-9 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-95"
              title="Lancer le setup assisté du serveur"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              <span>Setup Assisté</span>
            </Link>

            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-2 rounded-xl bg-[#5865F2] px-3.5 text-xs font-semibold text-white shadow-md shadow-[#5865F2]/20 transition-all hover:bg-[#4752C4] active:scale-95 cursor-pointer"
            >
              <DiscordIcon className="h-3.5 w-3.5" />
              <span>Inviter sur un serveur</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            {!isAuthenticated ? (
              <button
                onClick={() => router.push("/login")}
                className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 text-xs font-medium text-white transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
              >
                <span>Se connecter</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : profile?.connected ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{profile.user?.username || user?.email}</span>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={discordLoading}
                className="flex h-9 items-center gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-3.5 text-xs font-medium text-[#7983F5] transition-all hover:bg-[#5865F2]/20 active:scale-95 cursor-pointer"
              >
                <DiscordIcon className="h-3.5 w-3.5" />
                <span>Lier mon compte Discord</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Split View with GPU-isolated smooth independent scrolling */}
      <div className="flex min-h-0 w-full flex-1 gap-5 overflow-hidden">
        
        {/* Left Column: Server Selector (Independent Scroll) */}
        <aside className="hidden h-full w-72 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-xl md:flex lg:w-80">
          <div className="mb-3 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Vos Serveurs
              </h2>
              <p className="text-[10px] text-zinc-500">
                {onlyManageable ? "Gérables (Admin / Owner)" : "Tous les serveurs"}
              </p>
            </div>
            <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              {filteredGuilds.length}
            </span>
          </div>

          {/* Filter Toggle */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-1.5 text-xs border border-white/5 shrink-0">
            <span className="text-[11px] text-zinc-300 font-medium">Uniquement gérables</span>
            <button
              type="button"
              onClick={() => setOnlyManageable((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                onlyManageable ? "bg-emerald-500" : "bg-zinc-700"
              )}
              title={onlyManageable ? "Afficher uniquement les serveurs gérables" : "Afficher tous les serveurs"}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  onlyManageable ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Search server */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher un serveur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
            />
          </div>

          {/* Guilds List Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
            {filteredGuilds.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                <p className="font-semibold text-zinc-300">Aucun serveur trouvé</p>
                <p className="mt-1 text-zinc-500 text-[11px]">
                  Vous devez posséder les droits Propriétaire ou Administrateur sur Discord.
                </p>
                {allGuilds.length > 0 && onlyManageable && (
                  <button
                    onClick={() => setOnlyManageable(false)}
                    className="mt-3 text-xs text-emerald-400 underline cursor-pointer"
                  >
                    Afficher tous les serveurs ({allGuilds.length})
                  </button>
                )}
              </div>
            ) : (
              filteredGuilds.map((guild) => {
                const isSelected = selectedGuild?.id === guild.id;
                const isOwner = guild.owner;
                const isManager = canManageGuild(guild);
                const initials = guild.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={guild.id}
                    onClick={() => setSelectedGuild(guild)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-2xl border p-2 text-left transition-all duration-150 cursor-pointer",
                      isSelected
                        ? "border-[#5865F2]/50 bg-[#5865F2]/15 shadow-md shadow-[#5865F2]/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    )}
                  >
                    {/* Clean Avatar without buggy clipped corner badge */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-800 font-bold text-xs text-white shadow-inner">
                      {guild.iconUrl ? (
                        <img
                          src={guild.iconUrl}
                          alt={guild.name}
                          className="h-full w-full object-cover rounded-xl"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {guild.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-amber-300">
                            <Crown className="h-2.5 w-2.5" />
                            Propriétaire
                          </span>
                        ) : isManager ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Gérer le serveur
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Membre</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center pr-1">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isSelected ? "bg-emerald-400" : "bg-zinc-600"
                        )}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-2 shrink-0 border-t border-white/5 pt-2 text-center">
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#7983F5] hover:underline"
            >
              <span>+ Inviter le bot</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </aside>

        {/* Right Column: Server Management (Main Content with Smooth Scroll) */}
        <main className="min-h-0 w-full flex-1 overflow-y-auto space-y-5 pr-1 pb-36 overscroll-contain will-change-scroll">
          {selectedGuild ? (
            <>
              {/* Selected Server Banner (REAL SERVER INFO ONLY) */}
              <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-zinc-800 font-bold text-sm text-white shadow-md">
                    {selectedGuild.iconUrl ? (
                      <img
                        src={selectedGuild.iconUrl}
                        alt={selectedGuild.name}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <span>
                        {selectedGuild.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">
                        {selectedGuild.name}
                      </h2>
                      {selectedGuild.owner && (
                        <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          <Crown className="h-3 w-3" />
                          Propriétaire
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      ID Discord : <code className="text-zinc-300">{selectedGuild.id}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? "Sauvegarde..." : "Enregistrer les modifications"}</span>
                  </button>
                </div>
              </div>

              {/* DISCORD HOME NOW PLAYING LIVE CARD */}
              <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-500/[0.08] via-indigo-500/[0.05] to-black/40 p-4 sm:p-5 backdrop-blur-xl shadow-xl">
                {liveMusicState?.currentTrack ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-white/15 bg-zinc-900 shadow-md">
                        <img
                          src={liveMusicState.currentTrack.thumbnail}
                          alt={liveMusicState.currentTrack.title}
                          className="h-full w-full object-cover"
                        />
                        {liveMusicState.status === "PLAYING" && (
                          <span className="absolute bottom-1 right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-400">
                            <span className="h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Now Playing
                          </span>
                          {liveMusicState.voiceChannel && (
                            <span className="text-[10px] text-zinc-400 truncate">
                              🔊 {liveMusicState.voiceChannel.name}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white truncate">
                          {liveMusicState.currentTrack.title}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {liveMusicState.currentTrack.artist} • Demandé par {liveMusicState.currentTrack.requestedBy.tag}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {/* Quick Mini Controls */}
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl">
                        <button
                          onClick={handleMusicPrev}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          title="Précédent"
                        >
                          <SkipBack className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={handleMusicPlayPause}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-all cursor-pointer"
                          title={liveMusicState.status === "PLAYING" ? "Pause" : "Play"}
                        >
                          {liveMusicState.status === "PLAYING" ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
                        </button>
                        <button
                          onClick={handleMusicSkip}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                          title="Suivant"
                        >
                          <SkipForward className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <span className="text-[11px] font-mono text-zinc-400 hidden md:inline">
                        Queue: {liveMusicState.queueLength}
                      </span>

                      <Link
                        href={`/discord/music?guildId=${selectedGuild.id}`}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500 transition-all active:scale-95 cursor-pointer"
                      >
                        <Music2 className="h-3.5 w-3.5" />
                        <span>Ouvrir Music Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-violet-400">
                        <Music2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Lecteur Musique Discord 2.0</p>
                        <p className="text-[11px] text-zinc-400">Aucune musique en cours • Lancez la musique dans vos salons vocaux.</p>
                      </div>
                    </div>
                    <Link
                      href={`/discord/music?guildId=${selectedGuild.id}`}
                      className="flex h-8 items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-all cursor-pointer"
                    >
                      <Music2 className="h-3.5 w-3.5" />
                      <span>Ouvrir Music Center</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Modules Selector Strip */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MODULES.map((mod) => {
                  const IconComponent = mod.icon;
                  const isCurrent = activeModule === mod.id;

                  return (
                    <button
                      key={mod.id}
                      onClick={() => setActiveModule(mod.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all duration-150 cursor-pointer",
                        isCurrent
                          ? "border-emerald-500/40 bg-emerald-500/10 text-white shadow-md shadow-emerald-500/5"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <IconComponent className={cn("h-4 w-4 shrink-0", isCurrent ? "text-emerald-400" : mod.color)} />
                      <span className="truncate text-xs font-semibold">{mod.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Functional Module Settings Panel */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6 backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Configuration : {MODULES.find((m) => m.id === activeModule)?.title}</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {MODULES.find((m) => m.id === activeModule)?.description}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Serveur : {selectedGuild.name}
                  </span>
                </div>

                {/* MODULE 1: Sécurité & Anti-Raid */}
                {activeModule === "security" && (
                  <div className="space-y-4">
                    {/* Anti-Raid 2.0 Command Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-600/10 p-4 shadow-lg shadow-red-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🛡️</span>
                          <p className="text-xs font-bold text-white">Centre de Sécurité Anti-Raid 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                            Live Guard
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Calcul dynamique du Risk Score (0-100), Live Monitor, activation du Raid Mode d'urgence et dossiers d'investigation.
                        </p>
                      </div>
                      <Link
                        href={`/discord/security/anti-raid?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:from-red-500 hover:to-rose-500 active:scale-95"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        <span>Ouvrir Anti-Raid 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <div>
                        <p className="text-xs font-bold text-white">Protection Anti-Raid automatique</p>
                        <p className="text-[11px] text-zinc-400">Détecte et bloque les arrivées massives de bots ou comptes suspects.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuildSettings((p) => ({ ...p, antiRaidEnabled: !p.antiRaidEnabled }))}
                        className={cn(
                          "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                          guildSettings.antiRaidEnabled ? "bg-emerald-500" : "bg-zinc-700"
                        )}
                      >
                        <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200", guildSettings.antiRaidEnabled ? "translate-x-5" : "translate-x-0")} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <div>
                        <p className="text-xs font-bold text-white">Filtre Anti-Spam & Flooding</p>
                        <p className="text-[11px] text-zinc-400">Supprime automatiquement les répétitions excessives de messages.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuildSettings((p) => ({ ...p, antiSpamEnabled: !p.antiSpamEnabled }))}
                        className={cn(
                          "flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                          guildSettings.antiSpamEnabled ? "bg-emerald-500" : "bg-zinc-700"
                        )}
                      >
                        <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200", guildSettings.antiSpamEnabled ? "translate-x-5" : "translate-x-0")} />
                      </button>
                    </div>

                    {/* Mentions Limit (MODERN PILL SELECTOR - NO UGLY HTML SELECT) */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Limite de mentions par message</p>
                        <p className="text-[11px] text-zinc-400">Nombre maximum d'utilisateurs ou rôles mentionnables avant sanction.</p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] p-1 border border-white/10">
                        {[3, 5, 10].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setGuildSettings((p) => ({ ...p, mentionLimit: val }))}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                              guildSettings.mentionLimit === val
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            {val} mentions {val === 5 ? "(Recommandé)" : ""}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-4">
                      <div>
                        <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Verrouillage d'urgence (Lockdown)
                        </p>
                        <p className="text-[11px] text-zinc-400">Empêche tout nouveau membre d'écrire dans les salons en cas d'attaque.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuildSettings((p) => ({ ...p, emergencyLockdown: !p.emergencyLockdown }))}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                          guildSettings.emergencyLockdown
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                            : "border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                        )}
                      >
                        {guildSettings.emergencyLockdown ? "Actif (Déverrouiller)" : "Déclencher"}
                      </button>
                    </div>
                  </div>
                )}

                {/* MODULE 2: Command Builder 2.0 */}
                {activeModule === "commands" && (
                  <div className="space-y-4 text-xs">
                    {/* Command Studio Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-600/10 p-4 shadow-lg shadow-indigo-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚙️</span>
                          <p className="text-xs font-bold text-white">Command Studio & Builder 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            No-Code Studio
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Créez des commandes Slash (/) et Préfixe (!) sur-mesure, générez des embeds Discord riches, intégrez des variables dynamiques ({'{user}'}, {'{server}'}) et testez en direct dans le simulateur.
                        </p>
                      </div>
                      <Link
                        href={`/discord/commands?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Code2 className="h-4 w-4" />
                        <span>Ouvrir Command Studio</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Catalogue</p>
                        <p className="text-lg font-bold text-indigo-400 mt-1">Slash & Préfixe</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Activation / désactivation en 1 clic</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Embed Studio</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">Live Discord Render</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Bordures, footers & boutons</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Dynamique</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">Variables Live</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{'{user}'}, {'{server}'}, {'{time}'}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Testing</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Simulateur Terminal</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Test immédiat sans bot</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/commands?guildId=${selectedGuild.id}&tab=catalog`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Catalogue des Commandes</span>
                      </Link>
                      <Link
                        href={`/discord/commands?guildId=${selectedGuild.id}&tab=builder`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 text-purple-400" />
                        <span>Créer une Commande No-Code</span>
                      </Link>
                      <Link
                        href={`/discord/commands?guildId=${selectedGuild.id}&tab=simulator`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Simulateur Discord Live</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE 3: Suggestions & Feedback 2.0 */}
                {activeModule === "suggestions" && (
                  <div className="space-y-4 text-xs">
                    {/* Suggestions Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 p-4 shadow-lg shadow-amber-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">💡</span>
                          <p className="text-xs font-bold text-white">Boîte à Suggestions 2.0 & Feedback</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Kanban & Décisions
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Collectez les idées des membres, organisez les votes communautaires (👍 / 👎), traitez les propositions sur un tableau Kanban et publiez les décisions officielles du Staff.
                        </p>
                      </div>
                      <Link
                        href={`/discord/suggestions?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:from-amber-500 hover:to-orange-500 active:scale-95 cursor-pointer"
                      >
                        <Lightbulb className="h-4 w-4" />
                        <span>Ouvrir Suggestions Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Traitement</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Kanban Staff</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">En Attente / Approuvée / Rejetée</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Communauté</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Votes Discord</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Boutons interactifs 👍 👎</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Réponses</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">Avis Officiel</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Mise à jour directe de l'embed</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Protection</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">Anti-Doublon</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Filtres et cooldown par membre</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=kanban`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sliders className="h-3.5 w-3.5 text-amber-400" />
                        <span>Tableau Kanban des Idées</span>
                      </Link>
                      <Link
                        href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=response_studio`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Send className="h-3.5 w-3.5 text-orange-400" />
                        <span>Modération & Réponses Staff</span>
                      </Link>
                      <Link
                        href={`/discord/suggestions?guildId=${selectedGuild.id}&tab=hall_of_fame`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Crown className="h-3.5 w-3.5 text-yellow-400" />
                        <span>Top Idées (Hall of Fame)</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE 4: Leveling & XP 2.0 */}
                {activeModule === "leveling" && (
                  <div className="space-y-4 text-xs">
                    {/* Leveling Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-fuchsia-600/10 p-4 shadow-lg shadow-fuchsia-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚡</span>
                          <p className="text-xs font-bold text-white">Leveling & Rôles XP Center 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                            Progression & Ranking
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Stimulez l'activité de votre serveur : classement interactif, designer de cartes de profil Discord (/rank), attribution automatique de rôles par paliers et bonus pour Nitro Boosters.
                        </p>
                      </div>
                      <Link
                        href={`/discord/leveling?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-fuchsia-600/20 transition-all hover:from-fuchsia-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Award className="h-4 w-4" />
                        <span>Ouvrir Leveling Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Leaderboard</p>
                        <p className="text-lg font-bold text-fuchsia-400 mt-1">Top 100 Live</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Trophées, barres d'XP & ranks</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Rank Card</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">Card Studio Live</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Bannières, couleurs & thèmes</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Paliers</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Rôles Récompenses</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Déblocage auto par niveau</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Multiplicateurs</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">Vocal & Boosters</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Gains en vocal et bonus x1.5</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/leveling?guildId=${selectedGuild.id}&tab=leaderboard`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Crown className="h-3.5 w-3.5 text-fuchsia-400" />
                        <span>Classement & Leaderboard</span>
                      </Link>
                      <Link
                        href={`/discord/leveling?guildId=${selectedGuild.id}&tab=card_designer`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        <span>Rank Card Designer</span>
                      </Link>
                      <Link
                        href={`/discord/leveling?guildId=${selectedGuild.id}&tab=rewards`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Award className="h-3.5 w-3.5 text-amber-400" />
                        <span>Gérer les Rôles Récompenses</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE 5: Giveaways & Concours 2.0 */}
                {activeModule === "giveaways" && (
                  <div className="space-y-4 text-xs">
                    {/* Giveaways Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-600/10 p-4 shadow-lg shadow-rose-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎉</span>
                          <p className="text-xs font-bold text-white">Giveaways & Tirages au Sort 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Disaster Free & Fair Play
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Pilotez vos concours Discord : création assistée, restrictions de rôles et d'ancienneté, tirage cryptographique impartial (SHA-256 CSPRNG) et système de Reroll en un clic.
                        </p>
                      </div>
                      <Link
                        href={`/discord/giveaways?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:from-rose-500 hover:to-amber-500 active:scale-95 cursor-pointer"
                      >
                        <Gift className="h-4 w-4" />
                        <span>Ouvrir Giveaways Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Concours</p>
                        <p className="text-lg font-bold text-rose-400 mt-1">Live Discord</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Comptes à rebours & embeds</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Impartialité</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">SHA-256 CSPRNG</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Graines vérifiables sans triche</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Conditions</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Rôles & Bonus</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Chances + pour Boosters</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Gestion</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Reroll 1-Clic</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Redistribution immédiate</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=create`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 text-rose-400" />
                        <span>Lancer un Nouveau Concours</span>
                      </Link>
                      <Link
                        href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=active`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Gift className="h-3.5 w-3.5 text-amber-400" />
                        <span>Concours en Cours</span>
                      </Link>
                      <Link
                        href={`/discord/giveaways?guildId=${selectedGuild.id}&tab=history`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Historique des Gagnants & Reroll</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE: Tickets Center 2.0 */}
                {activeModule === "tickets" && (
                  <div className="space-y-4 text-xs">
                    {/* Tickets Center 2.0 Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-600/10 p-4 shadow-lg shadow-emerald-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎫</span>
                          <p className="text-xs font-bold text-white">Tickets Center 2.0 & Helpdesk</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Enterprise Support
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Helpdesk complet multi-catégories, formulaires avec questions dynamiques, équipes de staff, assignation/transfert, transcripts HTML/TXT/JSON et liaisons avec les Dossiers de Modération.
                        </p>
                      </div>
                      <Link
                        href={`/discord/tickets?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95 cursor-pointer"
                      >
                        <Ticket className="h-4 w-4" />
                        <span>Ouvrir Tickets Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Helpdesk</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Multi-Équipes</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Support, Mod & Facturation</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Formulaires</p>
                        <p className="text-lg font-bold text-teal-400 mt-1">Modals Discord</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Champs configurables</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Archivage</p>
                        <p className="text-lg font-bold text-indigo-400 mt-1">Transcripts</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">HTML, TXT & JSON</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Audit & Qualité</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Notes & CSAT</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Avis membres (1-5★)</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/tickets?guildId=${selectedGuild.id}&tab=panels`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Créer un Panneau Discord</span>
                      </Link>
                      <Link
                        href={`/discord/tickets?guildId=${selectedGuild.id}&tab=categories`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-teal-400" />
                        <span>Gérer les Catégories</span>
                      </Link>
                      <Link
                        href={`/discord/tickets?guildId=${selectedGuild.id}&tab=transcripts`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Historique des Transcripts</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE: Welcome & Onboarding 2.0 */}
                {activeModule === "welcome" && (
                  <div className="space-y-4 text-xs">
                    {/* Welcome Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-600/10 p-4 shadow-lg shadow-teal-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">👋</span>
                          <p className="text-xs font-bold text-white">Bienvenue & Onboarding Center 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            Expérience Membres
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Personnalisation complète sans coder : Message & Embed Builder avec Live Preview, boutons interactifs, cartes de bienvenue, DM Welcome, onboarding multi-étapes et entonnoir de conversion.
                        </p>
                      </div>
                      <Link
                        href={`/discord/welcome?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:from-teal-500 hover:to-emerald-500 active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Ouvrir Welcome Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Welcome & Embed</p>
                        <p className="text-lg font-bold text-teal-400 mt-1">Live Preview</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Rendu Discord instantané</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Parcours</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Onboarding Flow</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Règles, rôles & questions</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sécurité</p>
                        <p className="text-lg font-bold text-blue-400 mt-1">Vérification</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Boutons & déblocage rôles</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Conversion</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Funnel Analytics</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Taux de complétion en direct</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/welcome?guildId=${selectedGuild.id}&tab=builder`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sliders className="h-3.5 w-3.5 text-teal-400" />
                        <span>Message & Embed Builder</span>
                      </Link>
                      <Link
                        href={`/discord/welcome?guildId=${selectedGuild.id}&tab=onboarding`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Users className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Configurer l&apos;Onboarding</span>
                      </Link>
                      <Link
                        href={`/discord/welcome?guildId=${selectedGuild.id}&tab=templates`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
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
                    {/* Moderation Center 2.0 / Case System Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-600/10 p-4 shadow-lg shadow-orange-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚖️</span>
                          <p className="text-xs font-bold text-white">Centre de Modération 2.0 & Case System</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            Case Tracker
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Suivi centralisé des sanctions (Cases #1, #2...), annulation avec audit trail, scheduler d&apos;expiration, notes staff privées et protection anti-abus.
                        </p>
                      </div>
                      <Link
                        href={`/discord/moderation?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition-all hover:from-orange-500 hover:to-amber-500 active:scale-95"
                      >
                        <Hammer className="h-4 w-4" />
                        <span>Ouvrir Moderation 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {/* AutoMod 2.0 Command Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 p-4 shadow-lg shadow-amber-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🤖</span>
                          <p className="text-xs font-bold text-white">Centre de Modération Intelligente AutoMod 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Smart Guard
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Moteur multi-détecteurs (Spam, Flood, Liens, Invites, Mentions, Caps, Regex, Profils), Rule Builder dynamique, Sanctions progressives (Strikes) et Sandbox de test.
                        </p>
                      </div>
                      <Link
                        href={`/discord/moderation/automod?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:from-amber-500 hover:to-orange-500 active:scale-95"
                      >
                        <Zap className="h-4 w-4" />
                        <span>Ouvrir AutoMod 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Salon de notification des sanctions</p>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          value={guildSettings.modLogChannel}
                          onChange={(e) => setGuildSettings((p) => ({ ...p, modLogChannel: e.target.value }))}
                          placeholder="mod-logs"
                          className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900/80 pl-9 pr-3 text-xs text-white outline-none focus:border-orange-500"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Toutes les sanctions appliquées (<code className="text-orange-300">/warn</code>, <code className="text-orange-300">/mute</code>, <code className="text-orange-300">/kick</code>, <code className="text-orange-300">/ban</code>) y seront journalisées.
                      </p>
                    </div>
                  </div>
                )}

                {/* MODULE 7: Audit & Logs */}
                {activeModule === "logs" && (
                  <div className="space-y-4 text-xs">
                    {/* Audit Center 2.0 Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-600/10 p-4 shadow-lg shadow-blue-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">📜</span>
                          <p className="text-xs font-bold text-white">Audit Center 2.0 & Traçabilité Temps Réel</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Audit Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Moteur de traçabilité temps réel, mode enquête (&plusmn;15 min), diffs avant/après, corrélation des sanctions (Cases &amp; Raids), routage multi-salons Discord et exports CSV/JSON.
                        </p>
                      </div>
                      <Link
                        href={`/discord/logs?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Ouvrir Audit Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                      <p className="font-bold text-white">Surveillance des événements serveur</p>
                      <div className="space-y-2.5 pt-1 text-[11px]">
                        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded border-zinc-700 accent-blue-500" />
                          <span>Journaliser la suppression et modification de messages</span>
                        </label>
                        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded border-zinc-700 accent-blue-500" />
                          <span>Journaliser les modifications de rôles, permissions et salons</span>
                        </label>
                        <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded border-zinc-700 accent-blue-500" />
                          <span>Journaliser les arrivées, départs, bans et timeouts</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: Lecteur Musique 2.0 */}
                {activeModule === "music" && (
                  <div className="space-y-4 text-xs">
                    {/* Music Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-violet-600/10 p-4 shadow-lg shadow-violet-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎵</span>
                          <p className="text-xs font-bold text-white">Centre de Contrôle Musical ETHONE 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Live Stream
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Lecteur audio synchronisé en direct, file d&apos;attente drag & drop, recherche multi-sources, playlists, favoris et mode DJ.
                        </p>
                      </div>
                      <Link
                        href={`/discord/music?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-violet-600/20 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-95 cursor-pointer"
                      >
                        <Music2 className="h-4 w-4" />
                        <span>Ouvrir Music Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
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
                          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
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

                {/* MODULE: Invites & Parrainages 2.0 */}
                {activeModule === "invites" && (
                  <div className="space-y-4 text-xs">
                    {/* Invites & Referrals Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 p-4 shadow-lg shadow-amber-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🤝</span>
                          <p className="text-xs font-bold text-white">Invite Tracker &amp; Referral Center 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Croissance
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Tracking précis des invitations Discord, calcul de diff par snapshot, détection des faux joins (Risk Score 0-100), campagnes avec objectifs et distribution sécurisée de rôles récompenses.
                        </p>
                      </div>
                      <Link
                        href={`/discord/invites?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:from-amber-500 hover:to-orange-500 active:scale-95 cursor-pointer"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Ouvrir Invites Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Fonctionnalités actives du tracker</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>Snapshot en temps réel de toutes les invitations de la guilde</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span>Algorithme heuristique anti-triche (âge du compte, burst, churn)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                          <span>Suivi de la rétention des membres (24h, 3j, 7j, 30j)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                          <span>Attribution de rôles par paliers avec vérification de hiérarchie</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: Salons Vocaux 2.0 */}
                {activeModule === "voice" && (
                  <div className="space-y-4 text-xs">
                    {/* Voice Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-600/10 p-4 shadow-lg shadow-emerald-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎙️</span>
                          <p className="text-xs font-bold text-white">Voice Channels 2.0 &amp; Hubs Temporaires</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Join-to-Create
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Salons vocaux temporaires automatiques, hubs multiples (Gaming, Chill, Ranked, VIP), panneaux de contrôle Discord, transfert d&apos;ownership et règles d&apos;automatisation.
                        </p>
                      </div>
                      <Link
                        href={`/discord/voice?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95 cursor-pointer"
                      >
                        <Radio className="h-4 w-4" />
                        <span>Ouvrir Voice Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Fonctionnalités vocales actives</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>Création instantanée dès la connexion à un salon Hub</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                          <span>Suppression automatique avec délai de grâce anti-accidents</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                          <span>Panneau de contrôle intégré dans Discord (Renommer, Lock, Limite)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span>Stratégies intelligentes de transfert de propriété</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: Server Backup & Disaster Recovery 2.0 */}
                {activeModule === "backups" && (
                  <div className="space-y-4 text-xs">
                    {/* Backup Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-600/10 p-4 shadow-lg shadow-indigo-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">💾</span>
                          <p className="text-xs font-bold text-white">Server Backup &amp; Disaster Recovery 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Time Machine
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Sauvegardez l&apos;intégralité de la structure Discord et des modules ETHONE, comparez les versions et restaurez sélectivement avec rollback automatique.
                        </p>
                      </div>
                      <Link
                        href={`/discord/backups?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Ouvrir Backup Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Garanties &amp; Protections de Secours</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>Snapshots immuables certifiés SHA-256</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                          <span>Rollback automatique capturé avant toute restauration</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span>Comparateur visuel de diffs (Ajouté, Modifié, Supprimé)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                          <span>Sauvegardes protégées inviolables contre la purge</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: AI Assistant 2.0 */}
                {activeModule === "ai" && (
                  <div className="space-y-4 text-xs">
                    {/* AI Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-600/10 p-4 shadow-lg shadow-violet-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🤖</span>
                          <p className="text-xs font-bold text-white">ETHONE AI Assistant 2.0 &amp; Knowledge Hub</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            GenAI Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Assistant IA Discord intelligent, base de connaissances RAG sémantique, builder de personnalités à 5 curseurs, permissions de salons et handoff de tickets de support.
                        </p>
                      </div>
                      <Link
                        href={`/discord/ai?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-violet-600/20 transition-all hover:from-violet-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Bot className="h-4 w-4" />
                        <span>Ouvrir AI Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Fonctionnalités IA Disponibles</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                          <span>RAG sémantique (sources globales, par salon ou restreintes aux rôles)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>Bouclier de sécurité anti-jailbreak &amp; prompt injection strict</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                          <span>Commandes slash /ask et /summarize natives avec boutons d&apos;action</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span>Intégration Helpdesk &amp; escalade en ticket privé pour le staff</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: Forms & Applications 2.0 */}
                {activeModule === "forms" && (
                  <div className="space-y-4 text-xs">
                    {/* Forms Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-indigo-600/10 p-4 shadow-lg shadow-indigo-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">📝</span>
                          <p className="text-xs font-bold text-white">Forms &amp; Applications 2.0 — No-Code Builder</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Recrutement &amp; Staff
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Créez des formulaires glisser-déposer sur-mesure (candidatures staff, whitelist, partenariats, feedbacks), publiez-les sur Discord et traitez les candidatures avec review privée et scoring.
                        </p>
                      </div>
                      <Link
                        href={`/discord/forms?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-cyan-500 active:scale-95 cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Ouvrir Forms Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Fonctionnalités Clés du Form Builder</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                          <span>Builder drag &amp; drop 20 types de champs (Texte, Rôles, Fichiers, Étoiles)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                          <span>Moteur de logique conditionnelle dynamique et étapes multi-steps</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>Panneau Discord interactif (Bouton d&apos;application + Modal natif)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span>Review staff privée, attribution de rôles automatique et scoring pondéré</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: Polls & Voting 2.0 */}
                {activeModule === "polls" && (
                  <div className="space-y-4 text-xs">
                    {/* Polls Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-600/10 p-4 shadow-lg shadow-indigo-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">📊</span>
                          <p className="text-xs font-bold text-white">Polls &amp; Voting Center 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Scrutins &amp; Décisions
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Sondages démocratiques, consultations privées du staff, pondération des voix selon les rôles Discord, votes à bulletin secret et quorums d&apos;approbation.
                        </p>
                      </div>
                      <Link
                        href={`/discord/polls?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Vote className="h-4 w-4" />
                        <span>Ouvrir Polls Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <p className="font-bold text-white">Garanties &amp; Fonctionnalités de Vote</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                          <span>9 modes de scrutin (Choix unique, multiple, préférentiel, pondéré, etc.)</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>Calcul automatique de quorum et majorité qualifiée</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                          <span>Pondération des voix paramétrable selon les rôles du serveur</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span>Bulletins secrets avec anonymisation intégrale garantie</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODULE: Reaction Roles & Auto-Roles 2.0 */}
                {activeModule === "roles" && (
                  <div className="space-y-4 text-xs">
                    {/* Roles Center Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-600/10 p-4 shadow-lg shadow-pink-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎭</span>
                          <p className="text-xs font-bold text-white">Reaction Roles & Auto-Roles 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            Role Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Panneaux de sélection de rôles par boutons cliquables et menus déroulants Discord, attribution automatique à l'arrivée (Join-Roles), rôles temporaires avec expiration et audit de hiérarchie.
                        </p>
                      </div>
                      <Link
                        href={`/discord/roles?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-pink-600/20 transition-all hover:from-pink-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Tag className="h-4 w-4" />
                        <span>Ouvrir Roles Center 2.0</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Panneaux</p>
                        <p className="text-lg font-bold text-pink-400 mt-1">Boutons & Menus</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Composants natifs Discord</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sélection</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">Unique ou Multiple</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Règles d'exclusivité de groupe</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Accueil</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Join-Roles Auto</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Immédiat ou différé X minutes</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sécurité</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Hiérarchie Bot</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Prévention anti-escalade 403</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/roles?guildId=${selectedGuild.id}&tab=panels`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Sliders className="h-3.5 w-3.5 text-pink-400" />
                        <span>Panneaux de Rôles Actifs</span>
                      </Link>
                      <Link
                        href={`/discord/roles?guildId=${selectedGuild.id}&tab=builder`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 text-purple-400" />
                        <span>Créer un Panneau Discord</span>
                      </Link>
                      <Link
                        href={`/discord/roles?guildId=${selectedGuild.id}&tab=join_roles`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Users className="h-3.5 w-3.5 text-amber-400" />
                        <span>Configurer les Join-Roles</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE 8: Analytics & Insights 2.0 */}
                {activeModule === "analytics" && (
                  <div className="space-y-4 text-xs">
                    {/* Analytics Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-600/10 p-4 shadow-lg shadow-cyan-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">📊</span>
                          <p className="text-xs font-bold text-white">Analytics & Server Insights 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Data Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Surveillez la santé de votre serveur en temps réel : volume de messages, flux d'arrivées et départs, heatmaps horaires d'affluence, rétention et classement des membres les plus actifs.
                        </p>
                      </div>
                      <Link
                        href={`/discord/analytics?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition-all hover:from-cyan-500 hover:to-blue-500 active:scale-95 cursor-pointer"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>Ouvrir Analytics Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Activité</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">Messages 14j</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Graphiques & répartitions médias</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Croissance</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Flux Membres</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Arrivées nettes & taux de rétention</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Créneaux</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Heatmap 24h/7j</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Pics d'affluence pour annonces</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Salons</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">Part de Voix</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Salons textuels & heures vocales</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/analytics?guildId=${selectedGuild.id}&tab=messages`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Activité des Messages</span>
                      </Link>
                      <Link
                        href={`/discord/analytics?guildId=${selectedGuild.id}&tab=growth`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Users className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Croissance & Rétention</span>
                      </Link>
                      <Link
                        href={`/discord/analytics?guildId=${selectedGuild.id}&tab=heatmap`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Heatmap d'Affluence</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE: Events & Calendar 2.0 */}
                {activeModule === "events" && (
                  <div className="space-y-4 text-xs">
                    {/* Events Gateway */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-600/10 p-4 shadow-lg shadow-indigo-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🗓️</span>
                          <p className="text-xs font-bold text-white">Events &amp; Calendar 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Communauté &amp; Compétition
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Planifiez vos soirées gaming, tournois et réunions avec calendrier interactif (Mois, Semaine, Agenda), gestion des inscriptions (Going, Maybe, Waitlist), pointages et rappels automatiques.
                        </p>
                      </div>
                      <Link
                        href={`/discord/events?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-95 cursor-pointer"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Ouvrir Events Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Affichage</p>
                        <p className="text-lg font-bold text-indigo-400 mt-1">Calendrier Interactif</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Vues Mois, Semaine, Jour &amp; Agenda</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Inscriptions</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">RSVP &amp; Waitlist</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Jauges &amp; promotion automatique</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Discord</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">Embeds &amp; Boutons</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Pointage vocal &amp; slash /event</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Export</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">iCal (.ics)</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Synchro Google / Apple Calendar</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/events?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Tous les Événements</span>
                      </Link>
                      <Link
                        href={`/discord/calendar?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Vue Calendrier</span>
                      </Link>
                      <Link
                        href={`/discord/events/create?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Plus className="h-3.5 w-3.5 text-purple-400" />
                        <span>Créer un Événement</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE 20: Server Management Center 2.0 */}
                {activeModule === "server" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-4 shadow-lg shadow-blue-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏠</span>
                          <p className="text-xs font-bold text-white">Server Management Center 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Centre Global
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Contrôle intégral : diagnostic santé, score de sécurité, membres, salons, rôles, permission debugger et emojis.
                        </p>
                      </div>
                      <Link
                        href={`/discord/server?guildId=${selectedGuild.id}`}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                      >
                        <Server className="h-4 w-4" />
                        <span>Ouvrir Server Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sécurité</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Score 0-100</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Évaluation transparente</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Membres</p>
                        <p className="text-lg font-bold text-indigo-400 mt-1">Profil &amp; Risk</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Timeout, Kick &amp; Ban</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Salons &amp; Rôles</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">Arborescence</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Hiérarchie &amp; Plafond Bot</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Permissions</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">Debugger</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Résolution pas à pas</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/discord/server/members?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Membres</span>
                      </Link>
                      <Link
                        href={`/discord/server/channels?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Hash className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Salons</span>
                      </Link>
                      <Link
                        href={`/discord/server/roles?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Shield className="h-3.5 w-3.5 text-purple-400" />
                        <span>Rôles</span>
                      </Link>
                      <Link
                        href={`/discord/server/permissions?guildId=${selectedGuild.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Key className="h-3.5 w-3.5 text-amber-400" />
                        <span>Permissions &amp; Debugger</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* MODULE 21: Bot Control Center 2.0 */}
                {activeModule === "bot" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 p-4 shadow-lg shadow-emerald-500/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🤖</span>
                          <p className="text-xs font-bold text-white">Bot Control Center &amp; Intelligence 2.0</p>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Observabilité &amp; Contrôle
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          Surveillance intégrale du bot : monitoring V8 CPU/RAM, 22 modules, débit temps réel, diagnostic 17 points, erreurs dédoublonnées et tokens IA.
                        </p>
                      </div>
                      <Link
                        href="/discord/bot"
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95"
                      >
                        <Bot className="h-4 w-4" />
                        <span>Ouvrir Bot Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">État Global</p>
                        <p className="text-lg font-bold text-emerald-400 mt-1">Opérationnel</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">9 sous-systèmes sains</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Télémétrie</p>
                        <p className="text-lg font-bold text-cyan-400 mt-1">V8 &amp; Latence</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Percentiles P50/P95/P99</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Modules Actifs</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">22 Modules</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Santé &amp; dépendances</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Auto-Diagnostic</p>
                        <p className="text-lg font-bold text-amber-400 mt-1">17 Tests</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Contrôle interne complet</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href="/discord/bot?tab=modules"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Layers className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Modules (22)</span>
                      </Link>
                      <Link
                        href="/discord/bot?tab=commands"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Commandes</span>
                      </Link>
                      <Link
                        href="/discord/bot?tab=performance"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Performances</span>
                      </Link>
                      <Link
                        href="/discord/bot?tab=diagnostics"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs transition-all"
                      >
                        <Cpu className="h-3.5 w-3.5 text-amber-400" />
                        <span>Diagnostics (17 Tests)</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
              <Server className="h-10 w-10 text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-white">Aucun serveur sélectionné</h3>
              <p className="mt-1 max-w-sm text-xs text-zinc-400">
                {allGuilds.length === 0
                  ? "Connectez votre compte Discord pour charger vos serveurs gérables."
                  : "Choisissez un serveur dans la liste de gauche pour configurer le bot."}
              </p>
            </div>
          )}
        </main>
      </div>

      <DiscordOnboardingModal
        isOpen={isOnboardingOpen}
        currentStep={onboardingStep}
        onStepChange={setOnboardingStep}
        onClose={closeOnboarding}
        onComplete={completeOnboarding}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  );
}
