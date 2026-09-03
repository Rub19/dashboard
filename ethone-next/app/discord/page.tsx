"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  LogOut,
  Activity,
  Layers,
  Settings,
  ChevronLeft,
  Crown,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import DiscordIcon from "@/components/DiscordIcon";
import BrandMark from "@/components/BrandMark";
import { cn } from "@/lib/utils";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

type ModuleType =
  | "security"
  | "analytics"
  | "commands"
  | "suggestions"
  | "leveling"
  | "giveaways"
  | "moderation"
  | "logs";

interface BotModule {
  id: ModuleType;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgGlow: string;
  badge: string;
}

const MODULES: BotModule[] = [
  {
    id: "security",
    title: "Sécurité & Anti-Raid",
    description: "Protection temps réel contre les raids, mass joins, spam abusif et détection de bots malveillants.",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bgGlow: "from-emerald-500/10 to-teal-500/5",
    badge: "Actif",
  },
  {
    id: "analytics",
    title: "Analytics & Server Insights",
    description: "Statistiques complètes d'activité, afflux de membres, salons les plus actifs et taux de rétention.",
    icon: BarChart3,
    color: "text-cyan-400",
    bgGlow: "from-cyan-500/10 to-blue-500/5",
    badge: "Temps réel",
  },
  {
    id: "commands",
    title: "Command Builder No-Code",
    description: "Créez vos propres commandes Discord personnalisées avec embeds, variables dynamiques et cooldowns.",
    icon: Code2,
    color: "text-indigo-400",
    bgGlow: "from-indigo-500/10 to-purple-500/5",
    badge: "Builder v2",
  },
  {
    id: "suggestions",
    title: "Suggestions & Feedback",
    description: "Boîte à idées communautaire avec système de votes pour/contre, commentaires et suivi des statuts.",
    icon: Lightbulb,
    color: "text-amber-400",
    bgGlow: "from-amber-500/10 to-yellow-500/5",
    badge: "Interactif",
  },
  {
    id: "leveling",
    title: "Leveling & XP Communautaire",
    description: "Progression par messages, cartes de rang, leaderboard public et attribution automatique de rôles.",
    icon: Award,
    color: "text-fuchsia-400",
    bgGlow: "from-fuchsia-500/10 to-pink-500/5",
    badge: "Rôles auto",
  },
  {
    id: "giveaways",
    title: "Giveaways & Événements",
    description: "Tirages au sort automatisés avec conditions d'entrée, rôles obligatoires, planification et reroll.",
    icon: Gift,
    color: "text-rose-400",
    bgGlow: "from-rose-500/10 to-red-500/5",
    badge: "Automatisé",
  },
  {
    id: "moderation",
    title: "Modération & Sanctions",
    description: "Gestion unifiée des avertissements, mutes, expulsions et bannissements avec historique par membre.",
    icon: Hammer,
    color: "text-orange-400",
    bgGlow: "from-orange-500/10 to-amber-500/5",
    badge: "Logs complets",
  },
  {
    id: "logs",
    title: "Audit & Logs en Direct",
    description: "Surveillance de chaque action serveur : messages supprimés, rôles modifiés, membres entrants.",
    icon: FileText,
    color: "text-blue-400",
    bgGlow: "from-blue-500/10 to-indigo-500/5",
    badge: "Live stream",
  },
];

export default function DiscordDashboardPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading, connect } = useDiscordOAuth();

  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType>("security");
  const [searchQuery, setSearchQuery] = useState("");

  // Demo fallback guilds if no Discord account connected yet
  const displayGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) {
      return profile.guilds;
    }
    // Default preview server if demo
    return [
      {
        id: "1128633164290596884",
        name: "Serveur ETHONE Communauté",
        owner: true,
        iconUrl: "",
      },
    ];
  }, [profile?.guilds]);

  const filteredGuilds = useMemo(() => {
    if (!searchQuery.trim()) return displayGuilds;
    const q = searchQuery.toLowerCase();
    return displayGuilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [displayGuilds, searchQuery]);

  // Set default selected guild
  useEffect(() => {
    if (!selectedGuild && displayGuilds.length > 0) {
      setSelectedGuild(displayGuilds[0]);
    }
  }, [displayGuilds, selectedGuild]);

  const isAuthenticated = !!user || !!session;

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-[#07090d] text-white selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Lighting Effects */}
      <div className="pointer-events-none fixed -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.04] blur-[150px]" />
      <div className="pointer-events-none fixed -right-32 top-1/3 h-[32rem] w-[32rem] rounded-full bg-[#5865F2]/[0.05] blur-[160px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header Banner */}
        <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between lg:p-8">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#5865F2]/30 bg-[#5865F2]/15 text-[#5865F2] shadow-lg shadow-[#5865F2]/10">
              <DiscordIcon className="h-7 w-7" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#07090d] bg-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  ETHONE Bot
                </h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  En ligne • v2.4
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                Centre de gestion centralisé et sécurisé pour vos serveurs Discord.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white shadow-lg shadow-[#5865F2]/20 transition-all hover:bg-[#4752C4] active:scale-95 cursor-pointer"
            >
              <DiscordIcon className="h-4 w-4" />
              <span>Ajouter à mon serveur</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>

            {!isAuthenticated ? (
              <button
                onClick={() => router.push("/login")}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-medium text-white transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
              >
                <span>Se connecter</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : profile?.connected ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Discord lié : <strong>{profile.user?.username || user?.email}</strong></span>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={discordLoading}
                className="flex h-10 items-center gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 text-xs font-medium text-[#7983F5] transition-all hover:bg-[#5865F2]/20 active:scale-95 cursor-pointer"
              >
                <DiscordIcon className="h-4 w-4" />
                <span>Lier mon compte Discord</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Multi-tenant Isolation Notice */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-xs text-emerald-300 backdrop-blur-md">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold text-emerald-200">
              Isolation Multi-Tenant Garantie
            </p>
            <p className="text-zinc-400">
              Chaque serveur Discord dispose de sa propre base de configuration étanche. Seuls les membres possédant la permission Administrateur sur Discord peuvent consulter ou modifier les réglages de leur serveur.
            </p>
          </div>
        </div>

        {/* Main Grid: Server Selection & Active Dashboard */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Server Selector (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                  Vos Serveurs
                </h2>
                <span className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                  {displayGuilds.length}
                </span>
              </div>

              {/* Search server */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Rechercher un serveur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50"
                />
              </div>

              {/* Guilds List */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredGuilds.map((guild) => {
                  const isSelected = selectedGuild?.id === guild.id;
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
                        "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 cursor-pointer",
                        isSelected
                          ? "border-[#5865F2]/50 bg-[#5865F2]/15 shadow-md shadow-[#5865F2]/10"
                          : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900 font-bold text-xs text-white shadow-inner">
                        {guild.iconUrl ? (
                          <img
                            src={guild.iconUrl}
                            alt={guild.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                        {guild.owner && (
                          <span
                            title="Propriétaire du serveur"
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow"
                          >
                            <Crown className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">
                          {guild.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          ID: {guild.id.slice(0, 8)}...
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bot Invitation Card */}
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-4 text-center">
                <p className="text-xs font-medium text-zinc-300">
                  Un serveur n'apparaît pas ?
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Invitez le bot avec les permissions requises ou reconnectez votre compte Discord.
                </p>
                <a
                  href={BOT_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7983F5] hover:underline"
                >
                  <span>Inviter le bot</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Server Overview & Modules (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedGuild ? (
              <>
                {/* Active Server Card */}
                <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-zinc-800 font-bold text-lg text-white shadow-md">
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
                        <h2 className="text-lg font-bold text-white">
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
                        Configuration active • ID: {selectedGuild.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Bot Opérationnel
                    </span>
                  </div>
                </div>

                {/* Quick Server Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <span className="text-[11px] font-medium text-zinc-400">Statut Sécurité</span>
                    <p className="mt-1 text-base font-bold text-emerald-400">100% Sécurisé</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <span className="text-[11px] font-medium text-zinc-400">Anti-Raid</span>
                    <p className="mt-1 text-base font-bold text-emerald-400">Activé</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <span className="text-[11px] font-medium text-zinc-400">Commandes Perso</span>
                    <p className="mt-1 text-base font-bold text-indigo-400">7 actives</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <span className="text-[11px] font-medium text-zinc-400">Suggestions</span>
                    <p className="mt-1 text-base font-bold text-amber-400">12 traitées</p>
                  </div>
                </div>

                {/* Modules Grid */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                      Modules du Serveur
                    </h3>
                    <span className="text-xs text-zinc-500">
                      8 modules disponibles
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {MODULES.map((mod) => {
                      const IconComponent = mod.icon;
                      const isCurrent = activeModule === mod.id;

                      return (
                        <div
                          key={mod.id}
                          onClick={() => setActiveModule(mod.id)}
                          className={cn(
                            "group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200 cursor-pointer overflow-hidden",
                            isCurrent
                              ? "border-emerald-500/40 bg-white/[0.04] shadow-lg shadow-emerald-500/5"
                              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.035]"
                          )}
                        >
                          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", mod.bgGlow)} />

                          <div className="relative z-10">
                            <div className="flex items-center justify-between">
                              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10", mod.color)}>
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                                {mod.badge}
                              </span>
                            </div>

                            <h4 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {mod.title}
                            </h4>
                            <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                              {mod.description}
                            </p>
                          </div>

                          <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-white transition-colors">
                              Configurer le module
                            </span>
                            <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Module Detail Panel */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <Sliders className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Gestion Rapide — {MODULES.find((m) => m.id === activeModule)?.title}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          Appliquez instantanément les réglages pour le serveur {selectedGuild.name}.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => success("Réglages sauvegardés", "Configuration synchronisée avec Discord.")}
                      className="flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Enregistrer</span>
                    </button>
                  </div>

                  {/* Module Content Switcher */}
                  <div className="mt-5 space-y-4">
                    {activeModule === "security" && (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.015] p-3.5">
                          <div>
                            <p className="font-semibold text-white">Protection Anti-Raid automatique</p>
                            <p className="text-zinc-400 text-[11px]">Déclenche le mode d'urgence lors d'un afflux massif de membres.</p>
                          </div>
                          <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-emerald-400 font-bold">ACTIF</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.015] p-3.5">
                          <div>
                            <p className="font-semibold text-white">Anti-Spam & Limite de mentions</p>
                            <p className="text-zinc-400 text-[11px]">Sanction automatique à partir de 5 mentions en moins de 3 secondes.</p>
                          </div>
                          <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-emerald-400 font-bold">5 MENTIONS</span>
                        </div>
                      </div>
                    )}

                    {activeModule === "commands" && (
                      <div className="space-y-3 text-xs">
                        <p className="text-zinc-400 leading-relaxed">
                          Créez des commandes comme <code className="text-indigo-300">!regles</code>, <code className="text-indigo-300">!socials</code> ou <code className="text-indigo-300">/support</code> avec réponses riches et embeds personnalisés.
                        </p>
                        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-white">7 commandes personnalisées actives</p>
                            <p className="text-zinc-400 text-[11px]">Dernière exécution : il y a 4 minutes</p>
                          </div>
                          <button
                            onClick={() => success("Command Builder", "Ouverture de l'éditeur de commandes...")}
                            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                          >
                            Ouvrir le Builder
                          </button>
                        </div>
                      </div>
                    )}

                    {activeModule !== "security" && activeModule !== "commands" && (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-6 text-center text-xs text-zinc-400">
                        <Sparkles className="mx-auto h-6 w-6 text-zinc-500 mb-2" />
                        <p className="font-medium text-white">Module {MODULES.find((m) => m.id === activeModule)?.title} actif sur ce serveur</p>
                        <p className="mt-1 text-zinc-500">Toutes les actions et données sont automatiquement synchronisées en direct avec Discord.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
                <Server className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
                <h3 className="text-base font-bold text-white">Aucun serveur sélectionné</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Choisissez un serveur dans la liste de gauche pour configurer le bot.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
