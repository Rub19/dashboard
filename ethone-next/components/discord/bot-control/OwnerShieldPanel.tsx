"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FlaskConical, RefreshCw, Zap } from "@/components/icons/ph";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, Switch } from "@/components/discord/console/kit";
import { cleanLogText, sinceLabel } from "@/lib/discord/security-scan";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { formatApiError, errorReason } from "@/lib/format-error";

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

  // Filtres & Recherche
  const [statusFilter, setStatusFilter] = useState<"all" | "sanctioned" | "protected" | "ignored">("all");

  const fetchStatus = useCallback(async (notify = false) => {
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
        if (notify) success("Statut du Bouclier actualisé !");
      }
    } catch (err: any) {
      if (notify) showError("Erreur de synchronisation", errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOwner, success, showError]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling automatique en arrière-plan toutes les 20 secondes
  useEffect(() => {
    if (!isOwner) return;
    const timer = setInterval(() => {
      fetchStatus(false);
    }, 20000);
    return () => clearInterval(timer);
  }, [isOwner, fetchStatus]);

  // Met à jour un ou plusieurs paramètres de la config
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
        success("Configuration mise à jour !");
      } else {
        throw new Error(formatApiError(json?.error, "Erreur de configuration"));
      }
    } catch (err: any) {
      showError("Échec de mise à jour", errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Désactiver totalement le bouclier
  const handleDisableAll = async () => {
    setUpdatingConfig(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/owner-shield/disable-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        success("Bouclier totalement désactivé", "Le bot n'interviendra plus lors des sanctions.");
      } else {
        throw new Error(formatApiError(json?.error, "Le bot a refusé l'action."));
      }
    } catch (err: any) {
      showError("Erreur désactivation", errorReason(err, "Le bot n'a pas répondu."));
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
        },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setConfig(json.config);
        success("Bouclier totalement réactivé", "Toutes les protections automatiques sont en service.");
      } else {
        throw new Error(formatApiError(json?.error, "Le bot a refusé l'action."));
      }
    } catch (err: any) {
      showError("Erreur réactivation", errorReason(err, "Le bot n'a pas répondu."));
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
      showError("Erreur modification serveur", errorReason(err, "Le bot n'a pas répondu."));
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
        throw new Error(formatApiError(json?.error, "Échec"));
      }
    } catch (err: any) {
      showError("Erreur lors du sauvetage", errorReason(err, "Le bot n'a pas répondu."));
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
        },
        credentials: "include",
        body: JSON.stringify({ guildId: "all" }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success("⚡ Sauvetage global terminé !", json.message);
        await fetchStatus(false);
      } else {
        throw new Error(formatApiError(json?.error, "Échec"));
      }
    } catch (err: any) {
      showError("Erreur sauvetage global", errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setGlobalRescuing(false);
    }
  };

  // Simuler une attaque de test
  const [simulating, setSimulating] = useState(false);
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
        success("🧪 Simulation d'attaque réussie !", json.details || "Alerte de test envoyée en MP avec les boutons d'action.");
        await fetchStatus(false);
      } else {
        throw new Error(formatApiError(json?.error, "Échec"));
      }
    } catch (err: any) {
      showError("Erreur simulation", errorReason(err, "Le bot n'a pas répondu."));
    } finally {
      setSimulating(false);
    }
  };

  // Filtrage des serveurs
  const filteredGuilds = useMemo(() => {
    return guilds.filter((g) => {
      if (statusFilter === "sanctioned") {
        return (
          g.ownerStatus.isBanned ||
          g.ownerStatus.isTimedOut ||
          g.ownerStatus.isVoiceMuted ||
          g.ownerStatus.hasMuteRole
        );
      }
      if (statusFilter === "protected") {
        return !g.isIgnored;
      }
      if (statusFilter === "ignored") {
        return g.isIgnored;
      }
      return true;
    });
  }, [guilds, statusFilter]);

  if (!isOwner) {
    return (
      <ConsolePage title="Bouclier de l'owner">
        <Panel>
          <EmptyLine>Réservé au propriétaire du bot.</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }

  const sanctionsOf = (g: OwnerGuildStatus) =>
    [
      g.ownerStatus.isBanned && "banni",
      g.ownerStatus.isTimedOut && "exclu temporairement",
      g.ownerStatus.isVoiceMuted && "rendu muet",
      g.ownerStatus.isVoiceDeafened && "mis en sourdine",
      g.ownerStatus.hasMuteRole && `rôle restrictif (${g.ownerStatus.muteRoleNames.join(", ")})`,
    ].filter(Boolean) as string[];
  const sanctioned = guilds.filter((g) => sanctionsOf(g).length > 0).length;
  const covered = guilds.filter((g) => !g.isIgnored).length;
  const HIERARCHY = {
    SUPREME: { label: "Etho tout en haut", color: "var(--success)" },
    SUFFICIENT: { label: "Etho assez haut", color: "var(--warning)" },
    INSUFFICIENT: { label: "Etho trop bas pour agir", color: "var(--danger)" },
  } as const;

  return (
    <ConsolePage
      title="Bouclier de l'owner"
      actions={
        <GhostButton onClick={() => fetchStatus(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Actualiser
        </GhostButton>
      }
    >
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">{config.enabled ? "Bouclier actif" : "Bouclier coupé"}</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Etho annule les sanctions prises contre ton compte sur les serveurs où il est présent. {covered}/{guilds.length} serveur
              {guilds.length > 1 ? "s" : ""} couvert{covered > 1 ? "s" : ""}
              {sanctioned ? `, ${sanctioned} avec une sanction en cours.` : ", aucune sanction en cours."}
            </p>
          </div>
          <Switch
            checked={config.enabled}
            disabled={updatingConfig || loading}
            onChange={(v) => (v ? handleEnableAll() : handleDisableAll())}
            label={config.enabled ? "Couper le bouclier" : "Activer le bouclier"}
          />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--panel-border)] px-5 py-3">
          <GhostButton onClick={handleGlobalRescue} disabled={globalRescuing}>
            <Zap className="h-3.5 w-3.5" />
            {globalRescuing ? "Sauvetage…" : "Tout rétablir maintenant"}
          </GhostButton>
          <GhostButton onClick={handleSimulateAttack} disabled={simulating}>
            <FlaskConical className="h-3.5 w-3.5" />
            {simulating ? "Envoi…" : "Tester l'alerte en MP"}
          </GhostButton>
        </div>
      </Panel>

      <Panel
        title="Réactions automatiques"
        subtitle={config.enabled ? "Ce qu'Etho fait tout seul quand un modérateur te sanctionne." : "Bouclier coupé : ces réactions sont conservées et reprendront dès que tu le réactives."}
        className={cn("transition-opacity", !config.enabled && "opacity-60")}
      >
        {SHIELD_OPTIONS.map((o) => (
          <Row key={o.key} label={o.label} hint={o.hint}>
            <div className="flex justify-end">
              <Switch checked={Boolean(config[o.key])} disabled={updatingConfig} onChange={(v) => updateShieldConfig({ [o.key]: v })} label={o.label} />
            </div>
          </Row>
        ))}
      </Panel>

      <Panel
        title="Serveurs"
        subtitle="Position d'Etho et ta situation sur chaque serveur."
        actions={
          <Segmented
            label="Filtrer"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              ["all", `Tous · ${guilds.length}`],
              ["sanctioned", `Sanctions · ${sanctioned}`],
              ["ignored", `Exclus · ${guilds.length - covered}`],
            ]}
          />
        }
      >
        {loading ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : filteredGuilds.length === 0 ? (
          <EmptyLine>Aucun serveur.</EmptyLine>
        ) : (
          <ul>
            {filteredGuilds.map((g) => {
              const issues = sanctionsOf(g);
              const h = HIERARCHY[g.botHierarchyLevel];
              const busy = actingGuildId === g.guildId;
              return (
                <li key={g.guildId} className="border-t border-[var(--panel-border)] px-5 py-3.5 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {g.guildIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.guildIcon} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[11px] font-bold text-[var(--text-muted)]">
                        {g.guildName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{g.guildName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: h.color }} />
                          {h.label}
                        </span>
                        <span>·</span>
                        <span className={issues.length ? "text-[var(--danger)]" : undefined}>
                          {!g.ownerStatus.isPresent && !g.ownerStatus.isBanned ? "tu n'es pas sur le serveur" : issues.length ? issues.join(", ") : "aucune sanction"}
                        </span>
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      Protégé
                      <Switch checked={!g.isIgnored} onChange={() => handleToggleGuild(g.guildId)} label={g.isIgnored ? `Protéger ${g.guildName}` : `Exclure ${g.guildName}`} />
                    </label>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-11">
                    {g.ownerStatus.isBanned && (
                      <GhostButton onClick={() => handleRescue(g.guildId, { unban: true })} disabled={busy}>
                        Débannir
                      </GhostButton>
                    )}
                    {g.ownerStatus.isTimedOut && (
                      <GhostButton onClick={() => handleRescue(g.guildId, { removeTimeout: true })} disabled={busy}>
                        Lever l&apos;exclusion
                      </GhostButton>
                    )}
                    {(g.ownerStatus.isVoiceMuted || g.ownerStatus.hasMuteRole) && (
                      <GhostButton onClick={() => handleRescue(g.guildId, { unmute: true })} disabled={busy}>
                        Rendre la parole
                      </GhostButton>
                    )}
                    <GhostButton onClick={() => handleRescue(g.guildId, { restoreRoles: true })} disabled={busy}>
                      Rétablir mes rôles
                    </GhostButton>
                    <GhostButton onClick={() => handleRescue(g.guildId, { createInvite: true })} disabled={busy}>
                      Copier une invitation
                    </GhostButton>
                    <GhostButton onClick={() => handleRescue(g.guildId, { giveAdminRole: true })} disabled={busy}>
                      Rôle admin d&apos;urgence
                    </GhostButton>
                    <GhostButton onClick={() => handleRescue(g.guildId)} disabled={busy}>
                      <Zap className="h-3.5 w-3.5" />
                      Tout rétablir
                    </GhostButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Historique" subtitle="Les dernières interventions du bouclier.">
        {history.length === 0 ? (
          <EmptyLine>Aucune intervention pour l&apos;instant.</EmptyLine>
        ) : (
          <ul>
            {history.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-xs first:border-t-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ev.success ? "var(--success)" : "var(--danger)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[var(--text-primary)]">
                    <span className="font-semibold">{ev.guildName}</span> · {cleanLogText(ev.details)}
                    {ev.type === "SIMULATED_ATTACK" && <span className="text-[var(--text-muted)]"> (test)</span>}
                  </p>
                  {(ev.moderatorTag || ev.reason) && (
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {ev.moderatorTag ? `par ${ev.moderatorTag}` : ""}
                      {ev.moderatorTag && ev.reason ? " · " : ""}
                      {ev.reason ?? ""}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{sinceLabel(ev.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}

const SHIELD_OPTIONS: Array<{ key: keyof OwnerShieldConfig; label: string; hint: string }> = [
  { key: "autoUnban", label: "Débannissement", hint: "Te débannit dès qu'un modérateur te bannit." },
  { key: "autoTimeoutRemove", label: "Exclusion temporaire", hint: "Lève tout timeout dès qu'il est posé." },
  { key: "autoMuteRolesRemove", label: "Rôles restrictifs", hint: "Retire les rôles mute, prison ou silence qu'on te donne." },
  { key: "autoRestoreRoles", label: "Rôles retirés", hint: "Te rend les rôles qu'on t'enlève." },
  { key: "antiNicknameChange", label: "Pseudo", hint: "Remet ton pseudo si un modérateur le change." },
  { key: "autoVoiceUnmute", label: "Micro coupé", hint: "Te rend la parole en vocal." },
  { key: "autoVoiceUndeafen", label: "Sourdine", hint: "Te rend l'écoute en vocal." },
  { key: "antiVoiceMove", label: "Déplacement vocal", hint: "Te ramène dans ton salon vocal si on te déplace." },
  { key: "autoKickInvite", label: "Invitation après expulsion", hint: "T'envoie en MP une invitation de retour." },
  { key: "dmAlerts", label: "Alertes en MP", hint: "Pseudo, ID et raison de la personne qui t'a sanctionné." },
  { key: "botSelfDefense", label: "Défense d'Etho", hint: "Neutralise un modérateur qui retire les rôles ou les pouvoirs d'Etho (timeout 28 j et retrait de rôles)." },
  { key: "stealthMode", label: "Mode discret", hint: "Aucun log dans les salons de modération publics." },
];
