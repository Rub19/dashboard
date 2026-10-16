"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldOff,
  UserX,
  Clock,
  ExternalLink,
  ShieldAlert,
  Crown,
  User,
  MicOff,
  VolumeX,
  Radio,
  Zap,
  Bell,
  EyeOff,
  RefreshCw,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import { cleanLogText, sinceLabel } from "@/lib/discord/security-scan";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { formatApiError, errorReason } from "@/lib/format-error";
import { hapticLightImpact, hapticMediumImpact } from "@/lib/haptics";
import ClientImage from "@/components/ClientImage";
import { tx } from "@/lib/tx";

export interface OwnerShieldConfig {
  enabled: boolean;
  autoUnban: boolean;
  autoTimeoutRemove: boolean;
  autoMuteRolesRemove: boolean;
  autoVoiceUnmute: boolean;
  autoVoiceUndeafen: boolean;
  autoKickInvite: boolean;
  autoRestoreRoles: boolean;
  antiNicknameChange: boolean;
  antiVoiceMove: boolean;
  botSelfDefense: boolean;
  stealthMode: boolean;
  dmAlerts: boolean;
  ignoredGuildIds: string[];
}

export interface ShieldInterception {
  id: string;
  timestamp: string;
  guildId: string;
  guildName: string;
  type:
    | "BAN_REMOVED"
    | "TIMEOUT_CLEARED"
    | "MUTE_REMOVED"
    | "MUTE_ROLE_REMOVED"
    | "KICK_INVITE_SENT"
    | "ROLES_RESTORED"
    | "NICKNAME_RESTORED"
    | "BOT_PROTECTION_TRIGGERED"
    | "BOT_KICK_DETECTED"
    | "REJOIN_ROLES_RESTORED"
    | "VOICE_MOVE_RESTORED"
    | "EMERGENCY_ROLE_CREATED"
    | "SIMULATED_ATTACK";
  details: string;
  success: boolean;
  moderatorTag?: string | null;
  moderatorId?: string | null;
  reason?: string | null;
}

export interface OwnerGuildStatus {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  isIgnored: boolean;
  botHierarchyLevel: "SUPREME" | "SUFFICIENT" | "INSUFFICIENT";
  botHasPermissions: {
    banMembers: boolean;
    moderateMembers: boolean;
    muteMembers: boolean;
    manageRoles: boolean;
    createInstantInvite: boolean;
    administrator: boolean;
  };
  botHighestRolePosition: number;
  ownerStatus: {
    isPresent: boolean;
    isBanned: boolean;
    isTimedOut: boolean;
    timeoutUntil: string | null;
    isVoiceMuted: boolean;
    isVoiceDeafened: boolean;
    hasMuteRole: boolean;
    muteRoleNames: string[];
    highestRolePosition: number;
    nickname: string | null;
  };
}

interface OwnerShieldPanelProps {
  isOwner: boolean;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

const DEFAULT_CONFIG: OwnerShieldConfig = {
  enabled: true,
  autoUnban: true,
  autoTimeoutRemove: true,
  autoMuteRolesRemove: true,
  autoVoiceUnmute: true,
  autoVoiceUndeafen: true,
  autoKickInvite: true,
  autoRestoreRoles: true,
  antiNicknameChange: true,
  antiVoiceMove: true,
  botSelfDefense: true,
  stealthMode: false,
  dmAlerts: true,
  ignoredGuildIds: [],
};

const PROTECTION_CATEGORIES = [
  {
    id: "sanctions",
    title: "Sanctions & Bannissements",
    subtitle: "Annulation immédiate des expulsions et restrictions",
    options: [
      {
        key: "autoUnban" as keyof OwnerShieldConfig,
        label: "Débannissement",
        hint: "Te débannit dès qu'un modérateur te bannit.",
        icon: UserX,
      },
      {
        key: "autoTimeoutRemove" as keyof OwnerShieldConfig,
        label: "Exclusion temporaire",
        hint: "Lève tout timeout dès qu'il est posé.",
        icon: Clock,
      },
      {
        key: "autoKickInvite" as keyof OwnerShieldConfig,
        label: "Invitation après expulsion",
        hint: "T'envoie en MP une invitation de retour valide.",
        icon: ExternalLink,
      },
    ],
  },
  {
    id: "roles",
    title: "Rôles & Identité",
    subtitle: "Restauration automatique des privilèges et du profil",
    options: [
      {
        key: "autoMuteRolesRemove" as keyof OwnerShieldConfig,
        label: "Rôles restrictifs",
        hint: "Retire les rôles mute, prison ou silence qui te sont donnés.",
        icon: ShieldAlert,
      },
      {
        key: "autoRestoreRoles" as keyof OwnerShieldConfig,
        label: "Rôles retirés",
        hint: "Te réattribue les rôles dès qu'on te les enlève.",
        icon: Crown,
      },
      {
        key: "antiNicknameChange" as keyof OwnerShieldConfig,
        label: "Pseudo d'origine",
        hint: "Rétablit ton pseudo si un modérateur le change.",
        icon: User,
      },
    ],
  },
  {
    id: "voice",
    title: "Salons Vocaux",
    subtitle: "Protection de la parole, de l'écoute et du placement",
    options: [
      {
        key: "autoVoiceUnmute" as keyof OwnerShieldConfig,
        label: "Micro coupé",
        hint: "Te rend la parole en salon vocal instantanément.",
        icon: MicOff,
      },
      {
        key: "autoVoiceUndeafen" as keyof OwnerShieldConfig,
        label: "Sourdine casque",
        hint: "Te rend l'écoute en salon vocal si on te met en sourdine.",
        icon: VolumeX,
      },
      {
        key: "antiVoiceMove" as keyof OwnerShieldConfig,
        label: "Déplacement vocal",
        hint: "Te ramène dans ton salon vocal si un modérateur te déplace.",
        icon: Radio,
      },
    ],
  },
  {
    id: "bot",
    title: "Sécurité d'Etho & Alertes",
    subtitle: "Protection du bot et notifications d'alerte",
    options: [
      {
        key: "botSelfDefense" as keyof OwnerShieldConfig,
        label: "Auto-défense du bot",
        hint: "Sanctionne un modérateur qui révoque les permissions d'Etho.",
        icon: Zap,
      },
      {
        key: "dmAlerts" as keyof OwnerShieldConfig,
        label: "Alertes en MP",
        hint: "Pseudo, ID et raison de l'auteur de la sanction en MP.",
        icon: Bell,
      },
      {
        key: "stealthMode" as keyof OwnerShieldConfig,
        label: "Mode discret",
        hint: "Aucun message dans les salons de modération publics.",
        icon: EyeOff,
      },
    ],
  },
];

const HIERARCHY = {
  SUPREME: { label: "Etho tout en haut", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  SUFFICIENT: { label: "Etho assez haut", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  INSUFFICIENT: { label: "Etho trop bas pour agir", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
} as const;

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: "md" | "lg";
}) {
  const isLarge = size === "lg";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        hapticLightImpact();
        onChange(!checked);
      }}
      className={cn(
        "relative shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        isLarge ? "h-7 w-13" : "h-5 w-9.5",
        checked
          ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
          : "bg-zinc-700/60 hover:bg-zinc-700"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute rounded-full bg-white shadow-md block",
          isLarge ? "top-1 h-5 w-5" : "top-0.5 h-4 w-4",
          checked
            ? isLarge
              ? "left-7"
              : "left-5"
            : isLarge
            ? "left-1"
            : "left-0.5"
        )}
      />
    </button>
  );
}

export default function OwnerShieldPanel({ isOwner }: OwnerShieldPanelProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<OwnerShieldConfig>(DEFAULT_CONFIG);
  const [guilds, setGuilds] = useState<OwnerGuildStatus[]>([]);
  const [history, setHistory] = useState<ShieldInterception[]>([]);
  const [actingGuildId, setActingGuildId] = useState<string | null>(null);
  const [globalRescuing, setGlobalRescuing] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "sanctioned" | "protected" | "ignored">("all");
  const [simulating, setSimulating] = useState(false);

  const fetchStatus = useCallback(
    async (notify = false) => {
      if (!BOT_API_URL || !isOwner) return;
      try {
        setRefreshing(true);
        const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/status`, {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.config) {
            setConfig(json.data.config);
          } else {
            setConfig((prev) => ({ ...prev, enabled: Boolean(json.data.autoDefenseEnabled) }));
          }
          setGuilds(json.data.guilds || []);
          setHistory(json.data.history || []);
          if (notify) success(tx("Statut du Bouclier actualisé !"));
        }
      } catch (err: any) {
        if (notify) showError(tx("Erreur de synchronisation"), errorReason(err, "Le bot n'a pas répondu."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOwner, success, showError]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!isOwner) return;
    const timer = setInterval(() => {
      fetchStatus(false);
    }, 20000);
    return () => clearInterval(timer);
  }, [isOwner, fetchStatus]);

  const updateShieldConfig = async (partial: Partial<OwnerShieldConfig>) => {
    setUpdatingConfig(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        success(tx("Configuration mise à jour !"));
      } else {
        throw new Error(formatApiError(json?.error, "Erreur de configuration"));
      }
    } catch (err: any) {
      showError(tx("Échec de mise à jour"), errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleDisableAll = async () => {
    setUpdatingConfig(true);
    hapticMediumImpact();
    const disabledState: OwnerShieldConfig = {
      ...config,
      enabled: false,
      autoUnban: false,
      autoTimeoutRemove: false,
      autoMuteRolesRemove: false,
      autoVoiceUnmute: false,
      autoVoiceUndeafen: false,
      autoKickInvite: false,
      autoRestoreRoles: false,
      antiNicknameChange: false,
      antiVoiceMove: false,
      botSelfDefense: false,
      stealthMode: false,
      dmAlerts: false,
    };
    setConfig(disabledState);
    try {
      if (BOT_API_URL) {
        await Promise.allSettled([
          fetch(`${BOT_API_URL}/api/bot/owner-shield/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(disabledState),
          }),
          fetch(`${BOT_API_URL}/api/bot/owner-shield/disable-all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
        ]);
      }
      success(tx("Bouclier désactivé"), tx("Toutes les protections automatiques sont en pause."));
    } catch (err: any) {
      showError(tx("Erreur désactivation"), errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleEnableAll = async () => {
    setUpdatingConfig(true);
    hapticMediumImpact();
    const enabledState: OwnerShieldConfig = {
      ...config,
      enabled: true,
      autoUnban: true,
      autoTimeoutRemove: true,
      autoMuteRolesRemove: true,
      autoVoiceUnmute: true,
      autoVoiceUndeafen: true,
      autoKickInvite: true,
      autoRestoreRoles: true,
      antiNicknameChange: true,
      antiVoiceMove: true,
      botSelfDefense: true,
      dmAlerts: true,
    };
    setConfig(enabledState);
    try {
      if (BOT_API_URL) {
        await Promise.allSettled([
          fetch(`${BOT_API_URL}/api/bot/owner-shield/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(enabledState),
          }),
          fetch(`${BOT_API_URL}/api/bot/owner-shield/enable-all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }),
        ]);
      }
      success(tx("Bouclier activé"), tx("Toutes les protections automatiques sont actives."));
    } catch (err: any) {
      showError(tx("Erreur réactivation"), errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleToggleSubOption = async (key: keyof OwnerShieldConfig, nextVal: boolean) => {
    const nextConfig: OwnerShieldConfig = {
      ...config,
      [key]: nextVal,
      enabled: nextVal ? true : config.enabled,
    };
    setConfig(nextConfig);
    await updateShieldConfig({
      [key]: nextVal,
      ...(nextVal ? { enabled: true } : {}),
    });
  };

  const isMasterActive = Boolean(config.enabled);

  const handleToggleGuild = async (guildId: string) => {
    if (!isMasterActive) {
      const nextConfig: OwnerShieldConfig = { ...config, enabled: true };
      setConfig(nextConfig);
      await updateShieldConfig({ enabled: true });
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/guilds/${guildId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        setGuilds((prev) =>
          prev.map((g) => (g.guildId === guildId ? { ...g, isIgnored: json.isIgnored } : g))
        );
        success(json.message);
      } else {
        throw new Error(formatApiError(json?.error, "Le bot a refusé l'action."));
      }
    } catch (err: any) {
      showError(tx("Erreur modification serveur"), errorReason(err, "Le bot n'a pas répondu."));
    }
  };

  const handleRescue = async (guildId: string, actions?: Record<string, boolean>) => {
    setActingGuildId(guildId);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/rescue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ guildId, actions }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(tx("⚡ Sauvetage exécuté !"), json.message || tx("Opération terminée avec succès."));
        if (json.inviteUrl) {
          navigator.clipboard.writeText(json.inviteUrl).catch(() => null);
          success(tx("Lien d'invitation copié dans le presse-papier !"));
        }
        await fetchStatus(false);
      } else {
        throw new Error(formatApiError(json?.error, "Échec"));
      }
    } catch (err: any) {
      showError(tx("Erreur lors du sauvetage"), errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setActingGuildId(null);
    }
  };

  const handleGlobalRescue = async () => {
    setGlobalRescuing(true);
    hapticMediumImpact();
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/rescue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ guildId: "all" }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(tx("⚡ Sauvetage global terminé !"), json.message);
        await fetchStatus(false);
      } else {
        throw new Error(formatApiError(json?.error, "Échec"));
      }
    } catch (err: any) {
      showError(tx("Erreur sauvetage global"), errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setGlobalRescuing(false);
    }
  };

  const handleSimulateAttack = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/simulate-attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success(
          tx("🧪 Simulation d'attaque réussie !"),
          json.details || tx("Alerte de test envoyée en MP avec les boutons d'action.")
        );
        await fetchStatus(false);
      } else {
        throw new Error(formatApiError(json?.error, "Échec"));
      }
    } catch (err: any) {
      showError(tx("Erreur simulation"), errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setSimulating(false);
    }
  };

  const sanctionsOf = (g: OwnerGuildStatus) =>
    [
      g.ownerStatus.isBanned && "banni",
      g.ownerStatus.isTimedOut && "exclu temporairement",
      g.ownerStatus.isVoiceMuted && "rendu muet",
      g.ownerStatus.isVoiceDeafened && "mis en sourdine",
      g.ownerStatus.hasMuteRole && `rôle restrictif (${g.ownerStatus.muteRoleNames.join(", ")})`,
    ].filter(Boolean) as string[];

  const sanctioned = guilds.filter((g) => sanctionsOf(g).length > 0).length;
  const covered = isMasterActive ? guilds.filter((g) => !g.isIgnored).length : 0;

  const filteredGuilds = useMemo(() => {
    return guilds.filter((g) => {
      const isProtected = isMasterActive && !g.isIgnored;
      if (statusFilter === "sanctioned") {
        return (
          g.ownerStatus.isBanned ||
          g.ownerStatus.isTimedOut ||
          g.ownerStatus.isVoiceMuted ||
          g.ownerStatus.hasMuteRole
        );
      }
      if (statusFilter === "protected") {
        return isProtected;
      }
      if (statusFilter === "ignored") {
        return !isProtected;
      }
      return true;
    });
  }, [guilds, statusFilter, isMasterActive]);

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-12 text-center">
        <ShieldOff className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">{tx("Accès Réservé")}</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{tx("Cette console est strictement réservée au propriétaire du bot.")}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)]">
              {tx("Protection Propriétaire")}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {tx("Bouclier de l'Owner")}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--text-muted)]">
            {tx("Annulation automatique des sanctions et restauration de tes permissions sur tous les serveurs Discord surveillés.")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)]/90 transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-[var(--accent-primary)]")} />
          <span>{tx("Actualiser")}</span>
        </button>
      </div>

      <motion.div
        layout
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-500 backdrop-blur-xl shadow-lg",
          isMasterActive
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-[var(--surface-raised)] to-[var(--surface-raised)] shadow-[0_0_50px_-15px_rgba(16,185,129,0.2)]"
            : "border-[var(--panel-border)] bg-[var(--surface-raised)]/80"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={cn(
                "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500",
                isMasterActive
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                  : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400"
              )}
            >
              {isMasterActive ? (
                <>
                  <ShieldCheck className="h-7 w-7" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                </>
              ) : (
                <ShieldOff className="h-7 w-7" />
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {isMasterActive ? tx("Bouclier actif") : tx("Bouclier coupé")}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase",
                    isMasterActive
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-400"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isMasterActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    )}
                  />
                  {isMasterActive ? tx("Protection active") : tx("Protections coupées")}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">
                {isMasterActive
                  ? tx("Etho surveille et annule en temps réel les sanctions (ban, timeout, mute, retrait de rôles). {covered}/{length} serveurs surveillés.", { covered, length: guilds.length })
                  : tx("Le bouclier est éteint. Toutes les réactions automatiques sont en pause sur l'ensemble de tes serveurs.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-[var(--surface-2)]/40 border border-[var(--panel-border)] p-3 rounded-xl">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {isMasterActive ? tx("Bouclier activé") : tx("Bouclier désactivé")}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {isMasterActive ? tx("Cliquer pour désactiver") : tx("Cliquer pour activer")}
              </p>
            </div>
            <ToggleSwitch
              size="lg"
              checked={isMasterActive}
              disabled={updatingConfig || loading}
              onChange={(next) => (next ? handleEnableAll() : handleDisableAll())}
              label={isMasterActive ? tx("Couper le bouclier") : tx("Activer le bouclier")}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-[var(--panel-border)]">
          <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-2)]/30 p-2.5">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{tx("Serveurs couverts")}</span>
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] mt-0.5">
              {covered} <span className="text-xs text-[var(--text-muted)] font-normal">/ {guilds.length}</span>
            </p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-2)]/30 p-2.5">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{tx("Sanctions actives")}</span>
            <p className={cn("text-sm sm:text-base font-bold mt-0.5", sanctioned > 0 ? "text-rose-400" : "text-emerald-400")}>
              {sanctioned}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-2)]/30 p-2.5">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{tx("Interventions")}</span>
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] mt-0.5">
              {history.length}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)]/60 bg-[var(--surface-2)]/30 p-2.5">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{tx("Statut global")}</span>
            <p className={cn("text-sm sm:text-base font-bold mt-0.5", isMasterActive ? "text-emerald-400" : "text-zinc-400")}>
              {isMasterActive ? tx("Protégé") : tx("Inactif")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleGlobalRescue}
            disabled={globalRescuing}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Zap className={cn("h-3.5 w-3.5", globalRescuing && "animate-bounce")} />
            <span>{globalRescuing ? tx("Rétablissement en cours…") : tx("Tout rétablir maintenant")}</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateAttack}
            disabled={simulating}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-3.5 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-2)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <FlaskConical className={cn("h-3.5 w-3.5", simulating && "animate-spin text-[var(--accent-primary)]")} />
            <span>{simulating ? tx("Simulation en cours…") : tx("Tester l'alerte en MP")}</span>
          </button>
        </div>
      </motion.div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">{tx("Réactions automatiques")}</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {isMasterActive
                ? tx("Actions déclenchées automatiquement dès qu'un modérateur te sanctionne.")
                : tx("Toutes les réactions sont coupées. Réactive le bouclier pour relancer la protection.")}
            </p>
          </div>
          {!isMasterActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              {tx("Désactivées")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROTECTION_CATEGORIES.map((category) => (
            <motion.div
              key={category.id}
              layout
              className={cn(
                "rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4.5 space-y-3.5 transition-all duration-300 shadow-xs",
                !isMasterActive && "opacity-60"
              )}
            >
              <div className="border-b border-[var(--panel-border)]/60 pb-2.5">
                <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>{category.title}</span>
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">{category.subtitle}</p>
              </div>

              <div className="space-y-2">
                {category.options.map((opt) => {
                  const IconComponent = opt.icon;
                  const isChecked = isMasterActive && Boolean(config[opt.key]);
                  return (
                    <div
                      key={opt.key}
                      className={cn(
                        "group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-transparent transition-all",
                        isChecked
                          ? "bg-[var(--surface-2)]/30 border-[var(--panel-border)]/40 hover:border-[var(--accent-primary)]/30"
                          : "hover:bg-[var(--surface-2)]/20"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors mt-0.5",
                            isChecked
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                              : "border-[var(--panel-border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                            {opt.hint}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <ToggleSwitch
                          size="md"
                          checked={isChecked}
                          disabled={updatingConfig}
                          onChange={(val) => handleToggleSubOption(opt.key, val)}
                          label={opt.label}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">{tx("Serveurs surveillés")}</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {tx("Position d'Etho dans la hiérarchie et état de ton compte par serveur.")}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--panel-border)] self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tx("Tous (")}{guilds.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("sanctioned")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "sanctioned"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tx("Sanctions (")}{sanctioned})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ignored")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "ignored"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {isMasterActive ? tx("Exclus ({v0})", { v0: guilds.length - covered }) : tx("Inactifs ({length})", { length: guilds.length })}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-10 text-center text-xs text-[var(--text-muted)]">
            {tx("Chargement des serveurs Discord…")}
          </div>
        ) : filteredGuilds.length === 0 ? (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-10 text-center text-xs text-[var(--text-muted)]">
            {tx("Aucun serveur ne correspond au filtre sélectionné.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGuilds.map((g) => {
              const issues = sanctionsOf(g);
              const h = HIERARCHY[g.botHierarchyLevel];
              const busy = actingGuildId === g.guildId;
              const isGuildActive = isMasterActive && !g.isIgnored;
              return (
                <div
                  key={g.guildId}
                  className={cn(
                    "rounded-2xl border border-[var(--panel-border)] p-4 space-y-3 flex flex-col justify-between transition-all shadow-xs",
                    !isMasterActive
                      ? "bg-[var(--surface-raised)]/40 opacity-75 hover:opacity-100"
                      : "bg-[var(--surface-raised)]/70 hover:border-[var(--accent-primary)]/30"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {g.guildIcon ? (
                          <ClientImage
                            src={g.guildIcon}
                            alt=""
                            width={38}
                            height={38}
                            className="h-9.5 w-9.5 shrink-0 rounded-xl object-cover border border-[var(--panel-border)]"
                          />
                        ) : (
                          <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xs font-bold text-[var(--text-muted)] border border-[var(--panel-border)]">
                            {g.guildName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-bold text-[var(--text-primary)]">
                            {g.guildName}
                          </h4>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border mt-0.5",
                              h.color
                            )}
                          >
                            <span className="h-1 w-1 rounded-full bg-current" />
                            <span>{h.label}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <ToggleSwitch
                          size="md"
                          checked={isGuildActive}
                          disabled={updatingConfig}
                          onChange={() => handleToggleGuild(g.guildId)}
                          label={
                            !isMasterActive
                              ? tx("Bouclier inactif sur {guildName}", { guildName: g.guildName })
                              : g.isIgnored
                              ? tx("Protéger {guildName}", { guildName: g.guildName })
                              : tx("Exclure {guildName}", { guildName: g.guildName })
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-[var(--surface-2)]/40 p-2 text-[11px] text-[var(--text-muted)] space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{tx("Statut :")}</span>
                        <span
                          className={cn(
                            "font-semibold",
                            !isMasterActive
                              ? "text-zinc-500"
                              : issues.length > 0
                              ? "text-rose-400"
                              : !g.ownerStatus.isPresent && !g.ownerStatus.isBanned
                              ? "text-zinc-400"
                              : "text-emerald-400"
                          )}
                        >
                          {!isMasterActive
                            ? tx("Bouclier coupé")
                            : !g.ownerStatus.isPresent && !g.ownerStatus.isBanned
                            ? tx("Absent du serveur")
                            : issues.length > 0
                            ? issues.join(", ")
                            : tx("Aucune sanction")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {g.ownerStatus.isBanned && (
                      <button
                        type="button"
                        onClick={() => handleRescue(g.guildId, { unban: true })}
                        disabled={busy}
                        className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25 transition-all cursor-pointer"
                      >
                        {tx("Débannir")}
                      </button>
                    )}
                    {g.ownerStatus.isTimedOut && (
                      <button
                        type="button"
                        onClick={() => handleRescue(g.guildId, { removeTimeout: true })}
                        disabled={busy}
                        className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                      >
                        {tx("Lever timeout")}
                      </button>
                    )}
                    {(g.ownerStatus.isVoiceMuted || g.ownerStatus.hasMuteRole) && (
                      <button
                        type="button"
                        onClick={() => handleRescue(g.guildId, { unmute: true })}
                        disabled={busy}
                        className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                      >
                        {tx("Rendre parole")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRescue(g.guildId, { restoreRoles: true })}
                      disabled={busy}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      {tx("Rétablir rôles")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRescue(g.guildId, { createInvite: true })}
                      disabled={busy}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      {tx("Invitation")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRescue(g.guildId)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-1 text-[11px] font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-all cursor-pointer ml-auto"
                    >
                      <Zap className="h-3 w-3" />
                      <span>{tx("Rétablir")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">{tx("Historique des interventions")}</h3>
            <p className="text-xs text-[var(--text-muted)]">{tx("Journal des sanctions neutralisées par Etho en temps réel.")}</p>
          </div>
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {history.length} {" "}{tx("événement")}{history.length > 1 ? "s" : ""}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            {tx("Aucune tentative de sanction n'a été détectée pour le moment.")}
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-2)]/30 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      ev.success ? "bg-emerald-400" : "bg-rose-400"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)]">
                      <span>{ev.guildName}</span>
                      <span className="font-normal text-[var(--text-muted)]"> · {cleanLogText(ev.details)}</span>
                      {ev.type === "SIMULATED_ATTACK" && (
                        <span className="ml-1 text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded">
                          {tx("Test")}
                        </span>
                      )}
                    </p>
                    {(ev.moderatorTag || ev.reason) && (
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {ev.moderatorTag ? tx("Auteur : {moderatorTag}", { moderatorTag: ev.moderatorTag }) : ""}
                        {ev.moderatorTag && ev.reason ? tx(" · Motif : ") : ""}
                        {ev.reason ?? ""}
                      </p>
                    )}
                  </div>
                </div>

                <span className="shrink-0 text-[11px] text-[var(--text-muted)] font-mono">
                  {sinceLabel(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
