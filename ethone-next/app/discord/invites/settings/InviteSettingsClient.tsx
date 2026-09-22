"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Settings,
  Shield,
  Bell,
  Download,
  Save,
  Bot,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function InviteSettingsClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);
  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const guildId = selectedGuild?.id || "";
  const isBotPresent = Boolean(guildId && botGuildIds && botGuildIds.includes(guildId));
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [trackBots, setTrackBots] = useState(false);
  const [trackVanity, setTrackVanity] = useState(true);
  const [retentionTracking, setRetentionTracking] = useState(true);
  const [riskSensitivity, setRiskSensitivity] = useState("standard");
  const [minAccountAgeHours, setMinAccountAgeHours] = useState(24);
  const [notificationChannel, setNotificationChannel] = useState("");
  const [onValidJoin, setOnValidJoin] = useState(true);
  const [onSuspiciousJoin, setOnSuspiciousJoin] = useState(true);
  const [messageTemplate, setMessageTemplate] = useState(
    "🎉 Bienvenue {user} invité par {inviter} ({inviteCount} invitations valides) !"
  );

  const fetchSettings = useCallback(async () => {
    if (!guildId || !isBotPresent || !API_BASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/invites/settings`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setEnabled(s.enabled);
        setTrackBots(s.trackBots);
        setTrackVanity(s.trackVanity);
        setRetentionTracking(s.retentionTracking);
        setRiskSensitivity(s.riskSensitivity || "standard");
        setMinAccountAgeHours(s.suspiciousThresholds?.minAccountAgeHours || 24);
        setNotificationChannel(s.notificationChannel || "");
        setOnValidJoin(s.notificationEvents?.onValidJoin ?? true);
        setOnSuspiciousJoin(s.notificationEvents?.onSuspiciousJoin ?? true);
        setMessageTemplate(s.notificationMessageTemplate || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [guildId, isBotPresent]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!guildId || !API_BASE) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/invites/settings`, {
        credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          trackBots,
          trackVanity,
          retentionTracking,
          riskSensitivity,
          suspiciousThresholds: {
            minAccountAgeHours,
            burstMaxJoins: 5,
            burstWindowSeconds: 120,
          },
          notificationChannel,
          notificationEvents: {
            onValidJoin,
            onSuspiciousJoin,
            onReward: true,
            onLeave: false,
          },
          notificationMessageTemplate: messageTemplate,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "save failed");

      success("Paramètres enregistrés", "La configuration d'Invite Tracker a été mise à jour.");
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'enregistrer les paramètres."));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: "csv" | "json") => {
    if (!API_BASE) {
      showError("Bot injoignable", "Aucun export disponible.");
      return;
    }
    window.open(`${API_BASE}/api/guilds/${guildId}/invites/export?format=${format}`, "_blank");
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-white flex flex-col p-4 sm:p-8 pb-36 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div>
          <Link
            href={`/discord/invites${guildId ? `?guildId=${guildId}` : ""}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Retour à l'Invite Tracker</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">Paramètres de l'Invite Tracker</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {manageableGuilds.length > 0 && (
            <GuildSelector
              guilds={manageableGuilds}
              value={selectedGuild?.id || ""}
              onChange={(g) => {
                userSelectedRef.current = true;
                setSelectedGuild(g);
              }}
            />
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Sauvegarde..." : "Enregistrer les modifications"}</span>
          </button>
        </div>
      </div>

      {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-200 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
              <p className="mt-0.5 text-zinc-300">
                Invitez le bot sur « {selectedGuild.name} » pour gérer les invitations et récompenses de parrainage.
              </p>
            </div>
          </div>
          <a
            href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0"
          >
            Inviter le bot
          </a>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Tracking Général */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Settings className="w-4 h-4 text-pink-400" />
            <span>Options de Tracking</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Contrôlez les entités et événements pris en compte par le moteur d'invitations.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-white">Module Invite Tracker Actif</div>
                <div className="text-[11px] text-zinc-400">Active la détection différentielle des invitations</div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  enabled ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-white">Tracker les Bots Discord</div>
                <div className="text-[11px] text-zinc-400">Créer un referral pour les bots invités</div>
              </div>
              <button
                onClick={() => setTrackBots(!trackBots)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  trackBots ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    trackBots ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-white">Tracker l'URL Personnalisée (Vanity URL)</div>
                <div className="text-[11px] text-zinc-400">Enregistrer les arrivées directes par l'URL du serveur</div>
              </div>
              <button
                onClick={() => setTrackVanity(!trackVanity)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  trackVanity ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    trackVanity ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Détection & Anti-Raid */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Détection des Faux Joins & Sécurité</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Configuration du calcul du ReferralRiskScore (0-100) et des seuils d'invalidation.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Âge minimum du compte pour être éligible (heures)
              </label>
              <input
                type="number"
                value={minAccountAgeHours}
                onChange={(e) => setMinAccountAgeHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Les comptes créés plus récemment recevront un malus de risque et ne rapporteront pas de récompense immédiatement.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Sensibilité de détection du risque
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["low", "standard", "high"].map((sens) => (
                  <button
                    key={sens}
                    onClick={() => setRiskSensitivity(sens)}
                    className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      riskSensitivity === sens
                        ? "bg-pink-600/20 border-pink-500 text-white font-bold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sens === "low" ? "Basse" : sens === "standard" ? "Standard" : "Haute"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Notifications */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-400" />
            <span>Notifications Discord</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Annoncez automatiquement les parrainages dans un salon dédié.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Salon Discord des annonces
              </label>
              <ChannelPicker
                guildId={selectedGuild?.id}
                value={notificationChannel}
                onChange={(chId) => setNotificationChannel(chId || "")}
                placeholder="Sélectionner un salon pour les annonces..."
                size="sm"
                allowClear
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Modèle de message personnalisé
              </label>
              <textarea
                rows={3}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {["{user}", "{inviter}", "{server}", "{inviteCount}"].map((chip) => (
                  <span key={chip} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Export des Données */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export & Confidentialité</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Exportez l'ensemble des données d'invitations et referrals pour votre archivage ou vos analyses externes.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en CSV</span>
            </button>

            <button
              onClick={() => handleExport("json")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
