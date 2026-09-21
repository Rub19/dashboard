"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Star,
  ArrowLeft,
  RefreshCw,
  Save,
  Hash,
  Sparkles,
  Trophy,
  MessageSquare,
  Info,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface StarboardConfig {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  emoji: string;
  threshold: number;
  selfStarAllowed: boolean;
  ignoreBots: boolean;
  allowNsfw: boolean;
  removeBelowThreshold: boolean;
  ignoredChannelIds: string[];
  color: string;
}

interface StarboardOverview {
  enabled: boolean;
  channelId: string | null;
  emoji: string;
  threshold: number;
  totalEntries: number;
  postedEntries: number;
  totalStars: number;
  topMessage: { sourceMessageId: string; starCount: number } | null;
}

interface StarboardEntry {
  sourceChannelId: string;
  sourceMessageId: string;
  starboardMessageId: string | null;
  authorId: string;
  starCount: number;
  updatedAt: string;
}

interface GuildChannel {
  id: string;
  name: string;
  canSend: boolean;
  canEmbed: boolean;
}

const DEFAULT_CONFIG: StarboardConfig = {
  guildId: "",
  enabled: false,
  channelId: null,
  emoji: "⭐",
  threshold: 3,
  selfStarAllowed: false,
  ignoreBots: true,
  allowNsfw: false,
  removeBelowThreshold: true,
  ignoredChannelIds: [],
  color: "#F5B301",
};

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5 text-left transition-colors hover:border-[var(--input-border-hover)] cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative inline-flex mt-0.5 h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200",
          checked ? "bg-amber-500" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}

export default function StarboardCenterClient() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();
  const botGuildIds = useBotGuildIds(profile?.guilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

  // Le paramètre d'URL n'est appliqué qu'une fois par valeur : sinon il annule le choix fait dans le sélecteur.
  const appliedQueryGuild = useRef<string | null>(null);
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
    if (!selectedGuild && botGuildIds !== null) setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const [config, setConfig] = useState<StarboardConfig>(DEFAULT_CONFIG);
  const [overview, setOverview] = useState<StarboardOverview | null>(null);
  const [entries, setEntries] = useState<StarboardEntry[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/starboard`;
      const [cfgRes, ovRes, entRes, chRes] = await Promise.all([
        fetch(`${base}/config`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/entries`, { credentials: "include" }),
        fetch(`${base}/channels`, { credentials: "include" }),
      ]);
      if (!cfgRes.ok) throw new Error("config");
      const cfg = await cfgRes.json();
      setConfig({ ...DEFAULT_CONFIG, ...cfg, guildId: selectedGuild.id });
      if (ovRes.ok) setOverview(await ovRes.json());
      if (entRes.ok) setEntries((await entRes.json()).entries ?? []);
      if (chRes.ok) setChannels((await chRes.json()).channels ?? []);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild]);

  useEffect(() => {
    load();
  }, [load]);

  // Reflète en direct les changements faits via la commande Discord /starboard
  // (ou un autre onglet dashboard) sans attendre un rechargement manuel.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedConfig) => {
      if (module === "starboard" && updatedConfig) {
        setConfig((prev) => ({ ...prev, ...updatedConfig }));
      }
    },
  });

  const patch = <K extends keyof StarboardConfig>(key: K, value: StarboardConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const toggleIgnored = (channelId: string) =>
    setConfig((c) => ({
      ...c,
      ignoredChannelIds: c.ignoredChannelIds.includes(channelId)
        ? c.ignoredChannelIds.filter((id) => id !== channelId)
        : [...c.ignoredChannelIds, channelId],
    }));

  const handleSave = async () => {
    if (!selectedGuild) return;
    if (config.enabled && !config.channelId) {
      showError("Choisissez un salon", "Le starboard a besoin d'un salon de publication pour être activé.");
      return;
    }
    if (!BOT_API_URL) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/starboard/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: config.enabled,
          channelId: config.channelId,
          emoji: config.emoji,
          threshold: config.threshold,
          selfStarAllowed: config.selfStarAllowed,
          ignoreBots: config.ignoreBots,
          allowNsfw: config.allowNsfw,
          removeBelowThreshold: config.removeBelowThreshold,
          ignoredChannelIds: config.ignoredChannelIds,
          color: config.color,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config, guildId: selectedGuild.id });
      success("Starboard synchronisé", "Les réglages ont été appliqués au bot.");
      load();
    } catch {
      showError("Échec de la sauvegarde", "Impossible de joindre le serveur du bot. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const channelName = (id: string | null) =>
    id ? channels.find((c) => c.id === id)?.name ?? id : "—";

  const stats = overview ?? {
    enabled: config.enabled,
    channelId: config.channelId,
    emoji: config.emoji,
    threshold: config.threshold,
    totalEntries: 0,
    postedEntries: 0,
    totalStars: 0,
    topMessage: null,
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/discord"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Retour au hub Discord"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[var(--panel-border)] flex items-center justify-center text-zinc-300">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white">Starboard</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Hall of Fame
                </span>
              </div>
              <p className="text-xs text-white/70">Les messages les plus appréciés, épinglés automatiquement</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <GuildSelector guilds={manageableGuilds} value={selectedGuild?.id || ""} onChange={setSelectedGuild} />
          ) : (
            <span className="text-xs text-white/70">Aucun serveur administrable</span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--panel-border)] text-white/70 hover:text-white transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedGuild}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-44 md:pb-44 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur pour configurer le Starboard.
          </div>
        )}

        {offline && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Le serveur du bot n&apos;est pas joignable depuis cet environnement. Les réglages ci-dessous sont affichés à
              titre indicatif ; utilisez la commande <code className="rounded bg-black/30 px-1">/starboard</code> sur
              Discord, ou réessayez plus tard.
            </span>
          </div>
        )}

        {selectedGuild && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "État", value: stats.enabled ? "Actif" : "Inactif", icon: Sparkles, tone: stats.enabled ? "text-emerald-400" : "text-zinc-500" },
                { label: "Messages épinglés", value: String(stats.postedEntries), icon: MessageSquare, tone: "text-amber-400" },
                { label: "⭐ cumulées", value: String(stats.totalStars), icon: Star, tone: "text-yellow-400" },
                { label: "Record", value: stats.topMessage ? `${stats.topMessage.starCount} ⭐` : "—", icon: Trophy, tone: "text-fuchsia-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.025] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                    <s.icon className={cn("h-3.5 w-3.5", s.tone)} />
                    {s.label}
                  </div>
                  <div className="mt-1 text-lg font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Config */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.025] p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Configuration</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Serveur : {selectedGuild.name}</p>
                </div>
                <Switch checked={config.enabled} onChange={(v) => patch("enabled", v)} label={config.enabled ? "Activé" : "Désactivé"} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Channel */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Hash className="h-3.5 w-3.5 text-amber-400" /> Salon de publication
                  </label>
                  <ChannelPicker
                    value={config.channelId ?? ""}
                    onChange={(id) => patch("channelId", id || null)}
                    channels={channels.map((c) => ({
                      id: c.id,
                      name: `${c.name}${(!c.canSend || !c.canEmbed) ? " (permissions manquantes)" : ""}`,
                    }))}
                    placeholder="ID du salon (ex: 123456789012345678)"
                    emptyLabel="— Choisir un salon —"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Actuel : #{channelName(config.channelId)}</p>
                </div>

                {/* Emoji */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">Emoji déclencheur</label>
                  <input
                    value={config.emoji}
                    onChange={(e) => patch("emoji", e.target.value)}
                    placeholder="⭐ ou <:nom:id>"
                    className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Emoji unicode ou custom du serveur.</p>
                </div>

                {/* Threshold */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-white">
                    <span>Seuil de réactions</span>
                    <span className="font-mono text-amber-400">{config.threshold} {config.emoji}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={config.threshold}
                    onChange={(e) => patch("threshold", Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Switch checked={config.selfStarAllowed} onChange={(v) => patch("selfStarAllowed", v)} label="Auto-étoile" hint="L'auteur peut étoiler son propre message." />
                <Switch checked={config.ignoreBots} onChange={(v) => patch("ignoreBots", v)} label="Ignorer les bots" hint="Ne pas compter les réactions des bots." />
                <Switch checked={config.allowNsfw} onChange={(v) => patch("allowNsfw", v)} label="Inclure les salons NSFW" hint="Republier aussi les messages des salons marqués NSFW." />
                <Switch checked={config.removeBelowThreshold} onChange={(v) => patch("removeBelowThreshold", v)} label="Retrait sous le seuil" hint="Retirer du starboard si le total redescend sous le seuil." />
              </div>

              {/* Ignored channels */}
              {channels.length > 0 && (
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Info className="h-3.5 w-3.5 text-zinc-400" /> Salons ignorés ({config.ignoredChannelIds.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {channels.map((c) => {
                      const on = config.ignoredChannelIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleIgnored(c.id)}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                            on
                              ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                              : "border-[var(--panel-border)] bg-white/[0.03] text-zinc-400 hover:border-[var(--input-border-hover)] hover:text-white"
                          )}
                        >
                          #{c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Top starred */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.025] p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" /> Messages les plus étoilés
              </h3>
              {entries.length === 0 ? (
                <p className="mt-3 text-xs text-zinc-400">
                  Aucun message étoilé pour l&apos;instant. Dès qu&apos;un message atteint {config.threshold} {config.emoji},
                  il apparaîtra ici et dans #{channelName(config.channelId)}.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {entries.slice(0, 10).map((e) => (
                    <li key={e.sourceMessageId} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-amber-400 shrink-0">{e.starCount} ⭐</span>
                        <span className="truncate text-zinc-400">
                          #{channelName(e.sourceChannelId)} • message <span className="font-mono">{e.sourceMessageId}</span>
                        </span>
                      </span>
                      <a
                        href={`https://discord.com/channels/${selectedGuild.id}/${e.sourceChannelId}/${e.sourceMessageId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-zinc-500 hover:text-white transition-colors"
                        title="Ouvrir dans Discord"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
