"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Check,
  ChevronLeft,
  Info,
  Hash,
  Sliders,
  Loader2,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export interface GuildAssistedSetupProps {
  guild: DiscordGuild;
  onFinish?: (config: {
    serverType: "community" | "friends" | "voice";
    severity: "surveillance" | "balanced" | "strict";
    channelId: string | null;
    channelName: string | null;
    activeCount: number;
  }) => void;
  onCancel?: () => void;
  onManualSetup?: () => void;
}

interface ProtectionItem {
  name: string;
  category: string;
  action: string;
}

const DEFAULT_CHANNELS = [
  { id: "alertes", name: "alertes" },
  { id: "etho-logs", name: "etho-logs" },
  { id: "moderation", name: "moderation" },
  { id: "general", name: "general" },
];

export default function GuildAssistedSetup({
  guild,
  onFinish,
  onCancel,
  onManualSetup,
}: GuildAssistedSetupProps) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [serverType, setServerType] = useState<"community" | "friends" | "voice">("community");
  const [severity, setSeverity] = useState<"surveillance" | "balanced" | "strict">("balanced");
  const [channelId, setChannelId] = useState<string | null>("alertes");
  const [channelName, setChannelName] = useState<string>("#alertes");
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>(DEFAULT_CHANNELS);
  const [_loadingChannels, setLoadingChannels] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const serverTypes = useMemo(
    () => [
      {
        id: "community" as const,
        emoji: "🌳",
        title: i18n("dOptCommunity", "Communauté ouverte"),
        description: i18n("dOptCommunityDesc", "Serveur public, beaucoup d'arrivées, des inconnus."),
        activeProtectionsCount: 24,
      },
      {
        id: "friends" as const,
        emoji: "🏠",
        title: i18n("dOptFriends", "Entre amis"),
        description: i18n("dOptFriendsDesc", "Petit serveur privé, tout le monde se connaît."),
        activeProtectionsCount: 8,
      },
      {
        id: "voice" as const,
        emoji: "🔊",
        title: i18n("dOptVoice", "Grosse communauté avec vocaux"),
        description: i18n("dOptVoiceDesc", "Beaucoup de monde, un staff, des salons vocaux actifs."),
        activeProtectionsCount: 28,
      },
    ],
    [i18n]
  );

  const severityLevels = useMemo(
    () => [
      {
        id: "surveillance" as const,
        emoji: "👁️",
        title: i18n("dOptSurveillance", "Surveillance seulement"),
        description: i18n("dOptSurveillanceDesc", "Etho note tout et te prévient, sans sanctionner."),
      },
      {
        id: "balanced" as const,
        emoji: "🛡️",
        title: i18n("dOptBalanced", "Équilibré"),
        description: i18n("dOptBalancedDesc", "Désarme le fautif sans l'exclure, rend muets les spammeurs."),
      },
      {
        id: "strict" as const,
        emoji: "⚔️",
        title: i18n("dOptStrict", "Strict"),
        description: i18n("dOptStrictDesc", "Bannit quiconque tente de casser le serveur."),
      },
    ],
    [i18n]
  );

  useEffect(() => {
    if (!guild.id || !API_BASE) return;
    let cancelled = false;
    setLoadingChannels(true);

    fetch(`${API_BASE}/api/guilds/${guild.id}/welcome/channels`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.channels && Array.isArray(data.channels) && data.channels.length > 0) {
          setChannels(data.channels);
          setChannelId(data.channels[0].id);
          setChannelName(`#${data.channels[0].name}`);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingChannels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guild.id]);

  const activeServerMeta = useMemo(() => {
    return serverTypes.find((s) => s.id === serverType) || serverTypes[0];
  }, [serverTypes, serverType]);

  const computedProtections = useMemo<ProtectionItem[]>(() => {
    const adminAction =
      severity === "surveillance"
        ? "Alerte seule"
        : severity === "balanced"
        ? "Retire les rôles"
        : "Bannit";

    const messageAction =
      severity === "surveillance"
        ? "Alerte seule"
        : severity === "balanced"
        ? "Rend muet (10m)"
        : "Rend muet (1h)";

    const raidAction =
      severity === "strict" ? "Expulse + Lock" : "Alerte staff";

    const list: ProtectionItem[] = [
      { name: "Anti-Raid Mass Join", category: "Raid", action: raidAction },
      { name: "Anti-Spam Messages", category: "Spam", action: messageAction },
      { name: "Anti-Mention Mass", category: "Spam", action: messageAction },
      { name: "Anti-Liens Malveillants", category: "Sécurité", action: "Supprime" },
      { name: "Anti-Suppression Salons", category: "Staff", action: adminAction },
      { name: "Anti-Création Salons", category: "Staff", action: adminAction },
      { name: "Anti-Suppression Rôles", category: "Staff", action: adminAction },
      { name: "Anti-Création Rôles", category: "Staff", action: adminAction },
      { name: "Anti-Ban Massif", category: "Staff", action: adminAction },
      { name: "Anti-Kick Massif", category: "Staff", action: adminAction },
      { name: "Anti-Bot Non Invité", category: "Sécurité", action: "Expulse" },
      { name: "Anti-Webhook Illégal", category: "Sécurité", action: "Supprime" },
    ];

    if (serverType === "community" || serverType === "voice") {
      list.push(
        { name: "Anti-Ghost Ping", category: "Chat", action: "Avertit" },
        { name: "Anti-Invites Publiques", category: "Pub", action: "Supprime" },
        { name: "Anti-Token Raid", category: "Raid", action: "Quarantaine" },
        { name: "Slowmode Dynamique", category: "Modération", action: "Ajuste" }
      );
    }

    if (serverType === "voice") {
      list.push(
        { name: "Anti-Move Massif", category: "Vocal", action: "Bloque" },
        { name: "Anti-Mute Massif", category: "Vocal", action: "Bloque" },
        { name: "Anti-Deafen Massif", category: "Vocal", action: "Bloque" },
        { name: "Anti-Spam Rejoin Vocal", category: "Vocal", action: "Timeout 5m" }
      );
    }

    return list;
  }, [serverType, severity]);

  const handleApply = async () => {
    setIsApplying(true);
    const activeCount = activeServerMeta.activeProtectionsCount;

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `ethone:discord:wizard:${guild.id}`,
          JSON.stringify({
            serverType,
            severity,
            channelId,
            channelName,
            activeProtectionsCount: activeCount,
            configuredAt: Date.now(),
            isConfigured: true,
          })
        );
      }

      if (API_BASE && guild.id) {
        await Promise.allSettled([
          fetch(`${API_BASE}/api/guilds/${encodeURIComponent(guild.id)}/anti-raid/config`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageRaid: {
                enabled: true,
                actions: severity === "surveillance" ? ["ALERT_STAFF"] : ["DELETE", "TIMEOUT", "ALERT_STAFF"],
              },
              joinRaid: {
                enabled: serverType !== "friends",
                actions: severity === "strict" ? ["KICK", "ALERT_STAFF"] : ["ALERT_STAFF"],
              },
            }),
          }),
          ...(channelId
            ? [
                fetch(`${API_BASE}/api/guilds/${encodeURIComponent(guild.id)}/moderation/settings`, {
                  method: "PUT",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logChannelId: channelId }),
                }),
              ]
            : []),
        ]);
      }

      success(i18n("dConfigApplied", "Configuration appliquée avec succès !"), `${activeCount} ${i18n("dProtectionsWillBeActive", "protections seront actives.")}`);
      onFinish?.({
        serverType,
        severity,
        channelId,
        channelName,
        activeCount,
      });
    } catch {
      showError("Erreur", "Impossible d'appliquer la configuration.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {i18n("dAssistedSetup", "Configuration assistée")}
        </h1>

        <button
          type="button"
          onClick={onManualSetup || onCancel}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--panel-border)] hover:border-[var(--text-muted)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover,var(--surface-raised))] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{i18n("dManualSetup", "Réglage manuel")}</span>
        </button>
      </div>

      <div className="border-b border-[var(--panel-border)] flex items-center gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 1
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {i18n("dStepServer", "Ton serveur")}
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 2
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {i18n("dStepSeverity", "Sévérité")}
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 3
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {i18n("dStepAlerts", "Alertes")}
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(4)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 4
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {i18n("dStepVerify", "Vérifier")}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                {i18n("dStep1Title", "Quel genre de serveur as-tu ?")}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                {i18n("dStep1Desc", "Etho choisit les protections adaptées.")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {serverTypes.map((type) => {
                const isSelected = serverType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setServerType(type.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer relative",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 ring-1 ring-emerald-500/40"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)] hover:border-[var(--text-muted)] text-[var(--text-primary)]"
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{type.emoji}</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                          {type.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    <div className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400/90 pt-1">
                      {type.activeProtectionsCount} protections
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-[var(--text-muted)]">
              {activeServerMeta.activeProtectionsCount} {i18n("dProtectionsWillBeActive", "protections seront actives.")}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--panel-border)]">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--text-muted)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover,var(--surface-raised))] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{i18n("dBack", "Retour")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>{i18n("dContinue", "Continuer →")}</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                {i18n("dStep2Title", "À quel point Etho doit-il être sévère ?")}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                {i18n("dStep2Desc", "La sanction est adaptée au type d'abus.")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {severityLevels.map((lvl) => {
                const isSelected = severity === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSeverity(lvl.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 ring-1 ring-emerald-500/40"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)] hover:border-[var(--text-muted)] text-[var(--text-primary)]"
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{lvl.emoji}</span>
                        <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                          {lvl.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {lvl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--panel-border)]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--text-muted)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover,var(--surface-raised))] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{i18n("dBack", "Retour")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>{i18n("dContinue", "Continuer →")}</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                {i18n("dStep3Title", "Où Etho doit-il te prévenir ?")}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                {i18n("dStep3Desc", "Un salon privé, visible par le staff, de préférence.")}
              </p>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                {i18n("dChooseChannel", "Choisir un salon")}
              </label>

              <div className="relative">
                <select
                  value={channelId || ""}
                  onChange={(e) => {
                    const found = channels.find((c) => c.id === e.target.value);
                    setChannelId(e.target.value);
                    setChannelName(found ? `#${found.name}` : e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)]">
                  <Hash className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-hover,var(--surface-raised))] border border-[var(--panel-border)] text-xs text-[var(--text-muted)] max-w-xl">
              <Info className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {i18n("dNoChannelNote", "Sans salon, les protections agissent mais personne n'est prévenu sur Discord. La commande configuration peut créer ce salon pour toi.")}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--panel-border)]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--text-muted)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover,var(--surface-raised))] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{i18n("dBack", "Retour")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>{i18n("dContinue", "Continuer →")}</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                {i18n("dStep4Title", "Voilà ce qui va changer")}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                {computedProtections.length} {i18n("dProtectionsToModify", "protections à modifier.")}
              </p>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {computedProtections.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--surface-hover,var(--surface-raised))] border border-[var(--panel-border)] hover:border-[var(--text-muted)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline truncate">
                      {p.category}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--panel-border)] px-2 py-0.5 rounded shrink-0">
                    {p.action}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--panel-border)]">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--text-muted)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover,var(--surface-raised))] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{i18n("dBack", "Retour")}</span>
              </button>

              <button
                type="button"
                disabled={isApplying}
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-md cursor-pointer disabled:opacity-60"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{i18n("dApply", "Appliquer")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
