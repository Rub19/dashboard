"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  Zap,
  RefreshCw,
  Unlock,
  Volume2,
  Clock,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Power,
  PowerOff,
  Sliders,
  ExternalLink,
  Ban,
  UserCheck,
  VolumeX,
  MailCheck,
  EyeOff,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

export interface OwnerShieldConfig {
  enabled: boolean;
  autoUnban: boolean;
  autoTimeoutRemove: boolean;
  autoMuteRolesRemove: boolean;
  autoVoiceUnmute: boolean;
  autoVoiceUndeafen: boolean;
  autoKickInvite: boolean;
  ignoredGuildIds: string[];
}

export interface ShieldInterception {
  id: string;
  timestamp: string;
  guildId: string;
  guildName: string;
  type: "BAN_REMOVED" | "TIMEOUT_CLEARED" | "MUTE_REMOVED" | "MUTE_ROLE_REMOVED" | "KICK_INVITE_SENT";
  details: string;
  success: boolean;
}

export interface OwnerGuildStatus {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  isIgnored: boolean;
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
  };
}

interface OwnerShieldPanelProps {
  isOwner: boolean;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const OWNER_DISCORD_ID = "825124006209388616";

const DEFAULT_CONFIG: OwnerShieldConfig = {
  enabled: true,
  autoUnban: true,
  autoTimeoutRemove: true,
  autoMuteRolesRemove: true,
  autoVoiceUnmute: true,
  autoVoiceUndeafen: true,
  autoKickInvite: true,
  ignoredGuildIds: [],
};

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

  const fetchStatus = useCallback(async (notify = false) => {
    if (!BOT_API_URL || !isOwner) return;
    try {
      setRefreshing(true);
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/status`, {
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.config) {
          setConfig(json.data.config);
        } else {
          setConfig((prev) => ({ ...prev, enabled: Boolean(json.data.autoDefenseEnabled) }));
        }
        setGuilds(json.data.guilds || []);
        setHistory(json.data.history || []);
        if (notify) success("Statut du Bouclier actualisé !");
      }
    } catch (err: any) {
      if (notify) showError("Erreur de synchronisation", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOwner, success, showError]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Met à jour un ou plusieurs paramètres de la config
  const updateShieldConfig = async (partial: Partial<OwnerShieldConfig>) => {
    setUpdatingConfig(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
        },
        credentials: "include",
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        success("Configuration mise à jour !");
      } else {
        throw new Error(json.error || "Erreur de configuration");
      }
    } catch (err: any) {
      showError("Échec de mise à jour", err.message);
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Désactiver totalement le bouclier (Enlever ça et tout)
  const handleDisableAll = async () => {
    setUpdatingConfig(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/disable-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
        },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        success("Bouclier totalement désactivé", "Le bot n'interviendra plus lors des sanctions.");
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      showError("Erreur désactivation", err.message);
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Réactiver totalement le bouclier
  const handleEnableAll = async () => {
    setUpdatingConfig(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/enable-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
        },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        success("Bouclier totalement réactivé", "Toutes les protections automatiques sont en service.");
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      showError("Erreur réactivation", err.message);
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Basculer l'exclusion d'un serveur précis
  const handleToggleGuild = async (guildId: string) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/guilds/${guildId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
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
        throw new Error(json.error);
      }
    } catch (err: any) {
      showError("Erreur modification serveur", err.message);
    }
  };

  // Sauvetage ciblé sur un serveur
  const handleRescue = async (guildId: string, actions?: Record<string, boolean>) => {
    setActingGuildId(guildId);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/rescue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
        },
        credentials: "include",
        body: JSON.stringify({ guildId, actions }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success("⚡ Sauvetage exécuté !", json.message || "Opération terminée avec succès.");
        if (json.inviteUrl) {
          navigator.clipboard.writeText(json.inviteUrl).catch(() => null);
          success("Lien d'invitation copié dans le presse-papier !");
        }
        await fetchStatus(false);
      } else {
        throw new Error(json.error || "Échec");
      }
    } catch (err: any) {
      showError("Erreur lors du sauvetage", err.message);
    } finally {
      setActingGuildId(null);
    }
  };

  // Sauvetage global 1-clic
  const handleGlobalRescue = async () => {
    setGlobalRescuing(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/rescue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-owner": OWNER_DISCORD_ID,
        },
        credentials: "include",
        body: JSON.stringify({ guildId: "all" }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success("⚡ Sauvetage global terminé !", json.message);
        await fetchStatus(false);
      } else {
        throw new Error(json.error || "Échec");
      }
    } catch (err: any) {
      showError("Erreur sauvetage global", err.message);
    } finally {
      setGlobalRescuing(false);
    }
  };

  if (!isOwner) {
    return (
      <Card variant="default" padding="none" className="p-8 text-center space-y-3">
        <EyeOff className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-[var(--text-primary)]">Accès Réservé au Propriétaire</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
          Ce centre de commande d'urgence est strictement réservé au fondateur du bot (<code className="text-rose-400">rub19.mailpro@gmail.com</code>).
        </p>
      </Card>
    );
  }

  const isMasterActive = config.enabled;

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL & CONTRÔLES MAÎTRES */}
      <Card
        variant="default"
        padding="none"
        className={cn(
          "p-6 space-y-5 border transition-all duration-300",
          isMasterActive
            ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-rose-500/5"
            : "border-zinc-800 bg-zinc-950/40 opacity-90"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                  isMasterActive
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                )}
              >
                {isMasterActive ? "⚡ God Mode Actif • Owner Shield" : "⚪ Bouclier Éteint / En sommeil"}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                ID: {OWNER_DISCORD_ID}
              </span>
            </div>
            <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <Shield className={cn("w-5 h-5", isMasterActive ? "text-amber-400" : "text-zinc-500")} />
              Centre Privé de l'Owner — Bouclier & Sauvetage
            </h2>
            <p className="text-xs text-[var(--text-muted)] max-w-2xl">
              Gérez votre protection suprême contre toute sanction externe (bannissement, timeout, mute ou kick).
              Vous pouvez désactiver ou enlever tout le bouclier à tout moment, ou configurer précisément chaque module.
            </p>
          </div>

          {/* BOUTONS MAÎTRES */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="h-9 px-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Rafraîchir le statut"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-amber-400")} />
              <span>Actualiser</span>
            </button>

            {isMasterActive ? (
              <button
                onClick={handleDisableAll}
                disabled={updatingConfig}
                className="h-9 px-3.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 border border-zinc-700 hover:border-rose-500/40 text-xs font-bold text-rose-300 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Désactiver et enlever tout le bouclier immédiatement"
              >
                <PowerOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Enlever / Couper le bouclier</span>
              </button>
            ) : (
              <button
                onClick={handleEnableAll}
                disabled={updatingConfig}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Réactiver toutes les protections du bouclier"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Réactiver le bouclier</span>
              </button>
            )}

            <button
              onClick={handleGlobalRescue}
              disabled={globalRescuing}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className={cn("w-4 h-4", globalRescuing && "animate-spin")} />
              <span>{globalRescuing ? "Sauvetage global..." : "🚨 Sauvetage Total 1-Clic"}</span>
            </button>
          </div>
        </div>

        {/* KPIs Résumés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card variant="widget" padding="sm" className="space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">État du Bouclier</span>
            <p className={cn("text-base font-black flex items-center gap-1.5", isMasterActive ? "text-emerald-400" : "text-zinc-500")}>
              <span className={cn("w-2 h-2 rounded-full", isMasterActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600")} />
              {isMasterActive ? "Actif & Armé" : "Désactivé"}
            </p>
          </Card>
          <Card variant="widget" padding="sm" className="space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Serveurs sous Protection</span>
            <p className="text-xl font-black text-amber-400">
              {guilds.filter((g) => !g.isIgnored).length} / {guilds.length}
            </p>
          </Card>
          <Card variant="widget" padding="sm" className="space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Sanctions Actives Bloquées</span>
            <p className="text-xl font-black text-rose-400">
              {guilds.filter((g) => g.ownerStatus.isBanned || g.ownerStatus.isTimedOut || g.ownerStatus.isVoiceMuted || g.ownerStatus.hasMuteRole).length}
            </p>
          </Card>
          <Card variant="widget" padding="sm" className="space-y-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Commande Discord</span>
            <p className="text-xs font-mono font-bold text-rose-300">/rescue | !rescue</p>
          </Card>
        </div>
      </Card>

      {/* MODULES DE PROTECTION GRANULAIRES (TOGGLES) */}
      <Card variant="default" padding="none" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--panel-border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Options Modulaires du Bouclier
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Activez ou désactivez individuellement chaque type d'intervention automatique selon vos besoins.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Auto-Débannissement */}
          <div className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Ban className="w-4 h-4 text-rose-400" />
                <span>Auto-Débannissement</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Débannit instantanément votre compte si un modérateur vous bannit.
              </p>
            </div>
            <button
              onClick={() => updateShieldConfig({ autoUnban: !config.autoUnban })}
              disabled={updatingConfig || !config.enabled}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40",
                config.autoUnban && config.enabled ? "bg-amber-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  config.autoUnban && config.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Auto-Retrait Timeout */}
          <div className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Auto-Retrait Timeout</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Lève immédiatement tout timeout ou exclusion temporaire dès son application.
              </p>
            </div>
            <button
              onClick={() => updateShieldConfig({ autoTimeoutRemove: !config.autoTimeoutRemove })}
              disabled={updatingConfig || !config.enabled}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40",
                config.autoTimeoutRemove && config.enabled ? "bg-amber-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  config.autoTimeoutRemove && config.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Nettoyage Rôles Mute/Prison */}
          <div className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <VolumeX className="w-4 h-4 text-purple-400" />
                <span>Retrait Rôles Mute / Jail</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Retire automatiquement tout rôle restrictif (mute, prison, jail, silence) assigné.
              </p>
            </div>
            <button
              onClick={() => updateShieldConfig({ autoMuteRolesRemove: !config.autoMuteRolesRemove })}
              disabled={updatingConfig || !config.enabled}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40",
                config.autoMuteRolesRemove && config.enabled ? "bg-amber-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  config.autoMuteRolesRemove && config.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Démutage Vocal Serveur */}
          <div className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Démutage Vocal Auto</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Rétablit votre micro instantanément si un modérateur vous coupe la parole en vocal.
              </p>
            </div>
            <button
              onClick={() => updateShieldConfig({ autoVoiceUnmute: !config.autoVoiceUnmute })}
              disabled={updatingConfig || !config.enabled}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40",
                config.autoVoiceUnmute && config.enabled ? "bg-amber-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  config.autoVoiceUnmute && config.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Dé-sourding Vocal */}
          <div className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Dé-sourding Vocal Auto</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Rétablit votre écoute si un modérateur vous met en sourdine serveur.
              </p>
            </div>
            <button
              onClick={() => updateShieldConfig({ autoVoiceUndeafen: !config.autoVoiceUndeafen })}
              disabled={updatingConfig || !config.enabled}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40",
                config.autoVoiceUndeafen && config.enabled ? "bg-amber-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  config.autoVoiceUndeafen && config.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Invitation MP sur Expulsion / Kick */}
          <div className="p-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MailCheck className="w-4 h-4 text-sky-400" />
                <span>Invitation MP sur Kick</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Génère et vous envoie immédiatement par message privé une invitation de retour si expulsé.
              </p>
            </div>
            <button
              onClick={() => updateShieldConfig({ autoKickInvite: !config.autoKickInvite })}
              disabled={updatingConfig || !config.enabled}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40",
                config.autoKickInvite && config.enabled ? "bg-amber-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  config.autoKickInvite && config.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* GESTION & ÉTAT PAR SERVEUR (AVEC POSSIBILITÉ D'EXCLUSION) */}
      <Card variant="default" padding="none" className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--panel-border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              Serveurs & Contrôles Ciblés ({guilds.length})
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Contrôlez l'auto-défense par serveur et déclenchez des sauvetages manuels si nécessaire.
            </p>
          </div>
        </div>

        {guilds.length === 0 && !loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            Aucun serveur Discord actif trouvé ou bot non connecté.
          </div>
        ) : (
          <div className="space-y-3">
            {guilds.map((g) => {
              const st = g.ownerStatus;
              const perms = g.botHasPermissions;
              const hasActiveSanction = st.isBanned || st.isTimedOut || st.isVoiceMuted || st.hasMuteRole;
              const isActing = actingGuildId === g.guildId;
              const isIgnored = g.isIgnored;

              return (
                <div
                  key={g.guildId}
                  className={cn(
                    "rounded-2xl border p-4 transition-all space-y-3",
                    isIgnored
                      ? "border-zinc-800 bg-zinc-950/40 opacity-75"
                      : hasActiveSanction
                      ? "border-rose-500/40 bg-rose-500/5"
                      : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-zinc-700"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {g.guildIcon ? (
                        <img src={g.guildIcon} alt={g.guildName} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-[var(--panel-border)] flex items-center justify-center font-bold text-xs text-white">
                          {g.guildName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{g.guildName}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">({g.guildId})</span>
                          {perms.administrator && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              👑 BOT ADMIN
                            </span>
                          )}
                        </div>

                        {/* Status badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {isIgnored ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              ⚪ PROTECTION COUPÉE SUR CE SERVEUR
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-semibold border",
                                st.isPresent
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              )}
                            >
                              {st.isPresent ? "● Présent sur le serv" : "○ Absent du serv"}
                            </span>
                          )}

                          {st.isBanned && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              🚨 BANNI
                            </span>
                          )}

                          {st.isTimedOut && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              ⏱️ TIMEOUT ({st.timeoutUntil ? new Date(st.timeoutUntil).toLocaleTimeString() : "Actif"})
                            </span>
                          )}

                          {st.isVoiceMuted && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              🔇 MUET VOCAL
                            </span>
                          )}

                          {st.hasMuteRole && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              ⚠️ RÔLE MUTE ({st.muteRoleNames.join(", ")})
                            </span>
                          )}

                          {!hasActiveSanction && st.isPresent && !isIgnored && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✅ Aucune sanction
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Interrupteur par serveur */}
                      <button
                        onClick={() => handleToggleGuild(g.guildId)}
                        className={cn(
                          "h-8 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border",
                          isIgnored
                            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40"
                            : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                        )}
                        title={isIgnored ? "Réactiver la protection sur ce serveur" : "Désactiver la protection sur ce serveur (ex: pour tests)"}
                      >
                        {isIgnored ? <Power className="w-3 h-3 text-emerald-400" /> : <PowerOff className="w-3 h-3 text-zinc-400" />}
                        <span>{isIgnored ? "Réactiver protection" : "Couper protection"}</span>
                      </button>

                      {st.isBanned && (
                        <button
                          onClick={() => handleRescue(g.guildId, { unban: true })}
                          disabled={isActing}
                          className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Débannir</span>
                        </button>
                      )}

                      {st.isTimedOut && (
                        <button
                          onClick={() => handleRescue(g.guildId, { removeTimeout: true })}
                          disabled={isActing}
                          className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Lever Timeout</span>
                        </button>
                      )}

                      {(st.isVoiceMuted || st.hasMuteRole) && (
                        <button
                          onClick={() => handleRescue(g.guildId, { unmute: true })}
                          disabled={isActing}
                          className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Démuter</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRescue(g.guildId, { createInvite: true })}
                        disabled={isActing}
                        className="h-8 px-2.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface)] hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        title="Créer une invitation immédiate vers ce serveur"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Invitation</span>
                      </button>

                      <button
                        onClick={() => handleRescue(g.guildId, { giveAdminRole: true })}
                        disabled={isActing}
                        className="h-8 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        title="Rétablir le rôle le plus élevé possible avec permissions admin"
                      >
                        <Crown className="w-3 h-3" />
                        <span>Rétablir Admin</span>
                      </button>

                      <button
                        onClick={() => handleRescue(g.guildId)}
                        disabled={isActing}
                        className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        title="Exécuter un sauvetage complet (débannir, dé-timeout, démuter, invitation)"
                      >
                        <Zap className={cn("w-3.5 h-3.5 text-amber-400", isActing && "animate-spin")} />
                        <span>Sauver</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* HISTORIQUE DES INTERCEPTIONS AUTOMATIQUES */}
      <Card variant="default" padding="none" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Journal d'Interception en Direct (Auto-Défense)
        </h3>

        {history.length === 0 ? (
          <div className="py-8 text-center rounded-xl bg-[var(--text-primary)]/[0.02] border border-[var(--panel-border)] text-xs text-[var(--text-muted)] space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-[var(--text-primary)]">Aucune tentative de sanction récente</p>
            <p>Le bouclier est actif et surveille en continu tous les serveurs.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((ev) => (
              <div
                key={ev.id}
                className={cn(
                  "p-3 rounded-xl border text-xs flex items-center justify-between gap-3",
                  ev.success
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-bold">[{ev.guildName}]</span>
                  <span>{ev.details}</span>
                </div>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-black/40">
                  {ev.success ? "Interception Réussie" : "Échec"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
