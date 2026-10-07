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

const SERVER_TYPES = [
  {
    id: "community" as const,
    emoji: "🌳",
    title: "Communauté ouverte",
    description: "Serveur public, beaucoup d'arrivées, des inconnus.",
    activeProtectionsCount: 24,
  },
  {
    id: "friends" as const,
    emoji: "🏠",
    title: "Entre amis",
    description: "Petit serveur privé, tout le monde se connaît.",
    activeProtectionsCount: 8,
  },
  {
    id: "voice" as const,
    emoji: "🔊",
    title: "Grosse communauté avec vocaux",
    description: "Beaucoup de monde, un staff, des salons vocaux actifs.",
    activeProtectionsCount: 28,
  },
];

const SEVERITY_LEVELS = [
  {
    id: "surveillance" as const,
    emoji: "👁️",
    title: "Surveillance seulement",
    description: "Etho note tout et te prévient, sans sanctionner.",
  },
  {
    id: "balanced" as const,
    emoji: "🛡️",
    title: "Équilibré",
    description: "Désarme le fautif sans l'exclure, rend muets les spammeurs.",
  },
  {
    id: "strict" as const,
    emoji: "⚔️",
    title: "Strict",
    description: "Bannit quiconque tente de casser le serveur.",
  },
];

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
  const { success, error: showError } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [serverType, setServerType] = useState<"community" | "friends" | "voice">("community");
  const [severity, setSeverity] = useState<"surveillance" | "balanced" | "strict">("balanced");
  const [channelId, setChannelId] = useState<string | null>("alertes");
  const [channelName, setChannelName] = useState<string>("#alertes");
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>(DEFAULT_CHANNELS);
  const [_loadingChannels, setLoadingChannels] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

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
    return SERVER_TYPES.find((s) => s.id === serverType) || SERVER_TYPES[0];
  }, [serverType]);

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
      severity === "surveillance"
        ? "Alerte seule"
        : severity === "balanced"
        ? "Bloque l'accès"
        : "Expulse";

    const botAction =
      severity === "surveillance"
        ? "Alerte seule"
        : severity === "balanced"
        ? "Retire les rôles"
        : "Bannit le bot";

    const voiceAction =
      severity === "surveillance"
        ? "Alerte seule"
        : severity === "balanced"
        ? "Déconnecte & retire perm"
        : "Bannit du vocal";

    if (serverType === "friends") {
      return [
        { name: "Anti-ban", category: "Sanctions en série", action: adminAction },
        { name: "Anti-kick", category: "Sanctions en série", action: adminAction },
        { name: "Anti-suppression de salon", category: "Salons", action: adminAction },
        { name: "Anti-suppression de rôle", category: "Rôles et permissions", action: adminAction },
        { name: "Anti-webhook", category: "Bots et intégrations", action: botAction },
        { name: "Anti-changement de serveur", category: "Serveur", action: adminAction },
        { name: "Sauvegarde d'urgence", category: "Serveur", action: "Active" },
        { name: "Journal d'alertes staff", category: "Logs", action: "Envoie au salon" },
      ];
    }

    const baseList: ProtectionItem[] = [
      { name: "Anti-ban", category: "Sanctions en série", action: adminAction },
      { name: "Anti-kick", category: "Sanctions en série", action: adminAction },
      { name: "Anti-timeout", category: "Sanctions en série", action: adminAction },
      { name: "Anti-création de salon", category: "Salons", action: adminAction },
      { name: "Anti-suppression de salon", category: "Salons", action: adminAction },
      { name: "Anti-modification de salon", category: "Salons", action: adminAction },
      { name: "Anti-création de rôle", category: "Rôles et permissions", action: adminAction },
      { name: "Anti-suppression de rôle", category: "Rôles et permissions", action: adminAction },
      { name: "Anti-modification de rôle", category: "Rôles et permissions", action: adminAction },
      { name: "Anti-webhook", category: "Bots et intégrations", action: botAction },
      { name: "Anti-bot non vérifié", category: "Bots et intégrations", action: botAction },
      { name: "Anti-spam & flood", category: "Messages", action: messageAction },
      { name: "Anti-mentions de masse", category: "Messages", action: messageAction },
      { name: "Anti-liens suspects", category: "Messages", action: messageAction },
      { name: "Anti-invitations discord", category: "Messages", action: messageAction },
      { name: "Anti-raid arrivées groupées", category: "Arrivées", action: raidAction },
      { name: "Détection comptes récents < 7j", category: "Arrivées", action: raidAction },
      { name: "Protection permissions admin", category: "Rôles et permissions", action: adminAction },
      { name: "Anti-modification nom de serveur", category: "Serveur", action: adminAction },
      { name: "Anti-suppression massive de messages", category: "Salons", action: messageAction },
      { name: "Anti-changement icône", category: "Serveur", action: adminAction },
      { name: "Détection tokens compromis", category: "Sécurité", action: adminAction },
      { name: "Sauvegardes automatiques", category: "Sauvegardes", action: "Active" },
      { name: "Alertes et journal de modération", category: "Logs", action: "Envoie au salon" },
    ];

    if (serverType === "voice") {
      baseList.push(
        { name: "Anti-mass-deafen vocal", category: "Vocal", action: voiceAction },
        { name: "Anti-mass-move vocal", category: "Vocal", action: voiceAction },
        { name: "Anti-déconnexions groupées", category: "Vocal", action: voiceAction },
        { name: "Protection salons de discussion vocale", category: "Vocal", action: voiceAction }
      );
    }

    return baseList;
  }, [serverType, severity]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const activeCount = computedProtections.length;
      const configData = {
        serverType,
        severity,
        alertChannelId: channelId,
        alertChannelName: channelName,
        activeProtectionsCount: activeCount,
        isConfigured: true,
        appliedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(`ethone:discord:wizard:${guild.id}`, JSON.stringify(configData));
        localStorage.setItem(
          `ethone:guild-settings:${guild.id}`,
          JSON.stringify({
            antiRaidEnabled: true,
            antiSpamEnabled: true,
            logChannelId: channelId,
          })
        );
      } catch {}

      if (API_BASE) {
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

      success("Configuration appliquée !", `${activeCount} protections sont maintenant actives sur ${guild.name}.`);
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
          Configuration assistée
        </h1>

        <button
          type="button"
          onClick={onManualSetup || onCancel}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Réglage manuel</span>
        </button>
      </div>

      <div className="border-b border-zinc-800 flex items-center gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 1
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          Ton serveur
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 2
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          Sévérité
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 3
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          Alertes
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep(4)}
          className={cn(
            "pb-3 border-b-2 transition-all cursor-pointer",
            currentStep === 4
              ? "border-emerald-400 text-emerald-400 font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          Vérifier
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                Quel genre de serveur as-tu ?
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                Etho choisit les protections adaptées.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {SERVER_TYPES.map((type) => {
                const isSelected = serverType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setServerType(type.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer relative",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-950/30 text-emerald-400 ring-1 ring-emerald-500/40"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-300"
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{type.emoji}</span>
                        <span className="text-xs font-bold text-white tracking-tight">
                          {type.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    <div className="text-[11px] font-medium text-emerald-400/90 pt-1">
                      {type.activeProtectionsCount} protections
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-zinc-400">
              {activeServerMeta.activeProtectionsCount} protections seront actives.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-700/80 hover:border-zinc-600 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Continuer</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                À quel point Etho doit-il être sévère ?
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                La sanction est adaptée au type d&apos;abus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {SEVERITY_LEVELS.map((lvl) => {
                const isSelected = severity === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSeverity(lvl.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-950/30 text-emerald-400 ring-1 ring-emerald-500/40"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 text-zinc-300"
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{lvl.emoji}</span>
                        <span className="text-xs font-bold text-white tracking-tight">
                          {lvl.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {lvl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-700/80 hover:border-zinc-600 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Continuer</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                Où Etho doit-il te prévenir ?
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                Un salon privé, visible par le staff, de préférence.
              </p>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="text-xs font-semibold text-zinc-300 block">
                Choisir un salon
              </label>

              <div className="relative">
                <select
                  value={channelId || ""}
                  onChange={(e) => {
                    const found = channels.find((c) => c.id === e.target.value);
                    setChannelId(e.target.value);
                    setChannelName(found ? `#${found.name}` : e.target.value);
                  }}
                  className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
                  <Hash className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 max-w-xl">
              <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Sans salon, les protections agissent mais personne n&apos;est prévenu sur Discord. La commande configuration peut créer ce salon pour toi.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-700/80 hover:border-zinc-600 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Retour</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Continuer</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                Voilà ce qui va changer
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
                {computedProtections.length} protections à modifier.
              </p>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {computedProtections.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/40 border border-zinc-800/70 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-200 truncate">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-zinc-500 hidden sm:inline truncate">
                      {p.category}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded shrink-0">
                    {p.action}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-700/80 hover:border-zinc-600 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Retour</span>
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
                <span>Appliquer</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
