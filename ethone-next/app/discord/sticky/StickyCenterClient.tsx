"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Pin,
  ArrowLeft,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Hash,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface StickyChannelRow {
  channelId: string;
  enabled: boolean;
  asEmbed: boolean;
  repostCount: number;
  preview: string;
  updatedAt: string;
}

interface StickyOverview {
  total: number;
  active: number;
  paused: number;
  totalReposts: number;
  channels: StickyChannelRow[];
}

interface StickyConfig {
  guildId: string;
  channelId: string;
  content: string;
  asEmbed: boolean;
  title: string;
  color: string;
  enabled: boolean;
  cooldownSeconds: number;
  lastMessageId: string | null;
  repostCount: number;
}

interface GuildChannel {
  id: string;
  name: string;
  canSend: boolean;
  canManage: boolean;
  canEmbed: boolean;
}

const BLANK: StickyConfig = {
  guildId: "",
  channelId: "",
  content: "",
  asEmbed: true,
  title: "📌 À lire",
  color: "#5865F2",
  enabled: true,
  cooldownSeconds: 6,
  lastMessageId: null,
  repostCount: 0,
};

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
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
          checked ? "bg-[#5865F2]" : "bg-white/15"
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

export default function StickyCenterClient() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();
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

  // Le paramètre d'URL n'est appliqué qu'une fois par valeur : sinon il annule le choix fait dans le sélecteur.
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

  const [overview, setOverview] = useState<StickyOverview | null>(null);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [draft, setDraft] = useState<StickyConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setOverview(null);
      setChannels([]);
      return;
    }

    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/sticky`;
      const [ovRes, chRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/channels`, { credentials: "include" }),
      ]);
      if (!ovRes.ok) throw new Error("overview");
      setOverview(await ovRes.json());
      if (chRes.ok) setChannels((await chRes.json()).channels ?? []);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, botGuildIds]);

  useEffect(() => {
    setDraft(null);
    setOverview(null);
    load();
  }, [load]);

  // Reflète en direct les changements faits via la commande Discord /sticky (ou un
  // autre onglet dashboard) — config par salon : on met à jour l'éditeur ouvert s'il
  // correspond, et on rafraîchit la liste d'ensemble dans tous les cas.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedConfig: any) => {
      if (module !== "stickyMessages" || !updatedConfig) return;
      setDraft((prev) => (prev && prev.channelId === updatedConfig.channelId ? { ...prev, ...updatedConfig } : prev));
      load();
    },
  });

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  const openEditor = async (channelId: string | null) => {
    if (!selectedGuild) return;
    if (!channelId) {
      setDraft({ ...BLANK, guildId: selectedGuild.id });
      return;
    }
    if (!BOT_API_URL) {
      setDraft({ ...BLANK, guildId: selectedGuild.id, channelId });
      return;
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/sticky/config/${channelId}`, { credentials: "include" });
      if (res.ok) {
        const cfg = await res.json();
        setDraft({ ...BLANK, ...cfg, guildId: selectedGuild.id });
      } else {
        setDraft({ ...BLANK, guildId: selectedGuild.id, channelId });
      }
    } catch {
      setDraft({ ...BLANK, guildId: selectedGuild.id, channelId });
    }
  };

  const patch = <K extends keyof StickyConfig>(key: K, value: StickyConfig[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const handleSave = async () => {
    if (!selectedGuild || !draft) return;
    if (!draft.channelId) {
      showError("Choisissez un salon", "Sélectionnez le salon où fixer le message.");
      return;
    }
    if (!draft.content.trim()) {
      showError("Contenu vide", "Écrivez le texte du sticky.");
      return;
    }
    if (!/^#([0-9A-Fa-f]{6})$/.test(draft.color)) {
      showError("Couleur invalide", "Format attendu : #RRGGBB.");
      return;
    }
    if (!BOT_API_URL) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/sticky/config/${draft.channelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: draft.content,
          asEmbed: draft.asEmbed,
          title: draft.title,
          color: draft.color,
          enabled: draft.enabled,
          cooldownSeconds: draft.cooldownSeconds,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "save failed");
      success("Sticky synchronisé", "Le message a été (re)positionné dans le salon.");
      setDraft(null);
      load();
    } catch (err: any) {
      showError("Échec de la sauvegarde", formatApiError(err, "Impossible de joindre le serveur du bot. Réessayez."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/sticky/config/${channelId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "delete failed");
      success("Sticky retiré", `Le message ne sera plus fixé dans #${channelName(channelId)}.`);
      if (draft?.channelId === channelId) setDraft(null);
      load();
    } catch (err: any) {
      showError("Échec", formatApiError(err, "Impossible de retirer le sticky."));
    }
  };

  const handleRepost = async (channelId: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/sticky/config/${channelId}/repost`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "repost failed");
      success("Republié", `Le sticky a été renvoyé en bas de #${channelName(channelId)}.`);
      load();
    } catch (err: any) {
      showError("Échec", formatApiError(err, "Impossible de republier le sticky."));
    }
  };

  const usedChannelIds = new Set(overview?.channels.map((c) => c.channelId) ?? []);
  const availableChannels = channels.filter((c) => !usedChannelIds.has(c.id) || c.id === draft?.channelId);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[var(--panel-border)] flex items-center justify-center text-zinc-300">
              <Pin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Sticky Messages</h1>
              <p className="text-xs text-white/70">Un message toujours visible en bas d&apos;un salon</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <GuildSelector
              guilds={manageableGuilds}
              value={selectedGuild?.id || ""}
              onChange={(g) => {
                userSelectedRef.current = true;
                setSelectedGuild(g);
              }}
            />
          ) : (
            <span className="text-xs text-white/70">Aucun serveur administrable</span>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--panel-border)] text-white/70 hover:text-white transition-colors" title="Rafraîchir">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-44 md:pb-44 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur pour configurer les Sticky Messages.
          </div>
        )}

        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-zinc-300">
                  Invitez le bot sur « {selectedGuild.name} » pour épingler et rafraîchir des messages sticky en bas des salons.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium text-xs transition-colors shrink-0 shadow-lg shadow-[#5865F2]/25 cursor-pointer"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {offline && selectedGuild && (botGuildIds === null || botGuildIds.includes(selectedGuild.id)) && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Mode hors-ligne : le serveur du bot n&apos;est pas joignable depuis cet environnement. Utilisez la commande{" "}
              <code className="rounded bg-black/30 px-1">/sticky</code> sur Discord, ou réessayez plus tard.
            </span>
          </div>
        )}

        {selectedGuild && (
          <>
            {/* Stats */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Stickies", value: overview.total },
                  { label: "Actifs", value: overview.active },
                  { label: "En pause", value: overview.paused },
                  { label: "Repositionnements", value: overview.totalReposts },
                ].map((s) => (
                  <div key={s.label} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                    <p className="text-[11px] text-zinc-400">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* List */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Salons</p>
                <button
                  onClick={() => openEditor(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau sticky
                </button>
              </div>
              {overview && overview.channels.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">Aucun sticky. Cliquez sur « Nouveau sticky ».</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {overview?.channels.map((row) => (
                    <div key={row.channelId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <button onClick={() => openEditor(row.channelId)} className="flex min-w-0 flex-1 flex-col items-start text-left cursor-pointer">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <Hash className="h-3.5 w-3.5 text-zinc-500" />
                          {channelName(row.channelId)}
                          <span className={cn("ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold", row.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-400")}>
                            {row.enabled ? "Actif" : "En pause"}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-1 text-[11px] text-zinc-400">{row.preview}</span>
                        <span className="mt-1 text-[10px] text-zinc-500">{row.asEmbed ? "Embed" : "Texte"} · {row.repostCount} repositionnements</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => handleRepost(row.channelId)} title="Republier maintenant" className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                          <Send className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(row.channelId)} title="Supprimer" className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor */}
            {draft && (
              <div className="rounded-2xl border border-[#5865F2]/30 bg-white/[0.02] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{usedChannelIds.has(draft.channelId) ? "Modifier le sticky" : "Nouveau sticky"}</p>
                  <button onClick={() => setDraft(null)} className="text-xs text-zinc-400 hover:text-white cursor-pointer">Fermer</button>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Salon</label>
                  <ChannelPicker
                    value={draft.channelId}
                    onChange={(id) => patch("channelId", id)}
                    disabled={usedChannelIds.has(draft.channelId)}
                    channels={availableChannels.map((c) => ({
                      id: c.id,
                      name: `${c.name}${(!c.canSend || !c.canManage) ? " (permissions manquantes)" : ""}`,
                    }))}
                    placeholder="ID du salon (ex: 123456789012345678)"
                    emptyLabel="— Choisir un salon —"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Contenu ({draft.content.length}/2000)</label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => patch("content", e.target.value.slice(0, 2000))}
                    rows={5}
                    placeholder="Le message qui restera en bas du salon. Markdown Discord supporté."
                    className="w-full resize-y rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50"
                  />
                </div>

                <Switch checked={draft.asEmbed} onChange={(v) => patch("asEmbed", v)} label="Afficher en embed" hint="Sinon, un simple message texte." />

                {draft.asEmbed && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-zinc-400">Titre de l&apos;embed</label>
                      <input
                        value={draft.title}
                        onChange={(e) => patch("title", e.target.value.slice(0, 256))}
                        className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-400">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={draft.color} onChange={(e) => patch("color", e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-transparent" />
                        <input
                          value={draft.color}
                          onChange={(e) => patch("color", e.target.value)}
                          className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-2 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Anti-rebond : {draft.cooldownSeconds}s entre deux repositionnements</label>
                  <input type="range" min={2} max={120} value={draft.cooldownSeconds} onChange={(e) => patch("cooldownSeconds", Number(e.target.value))} className="w-full accent-[#5865F2]" />
                </div>

                <Switch checked={draft.enabled} onChange={(v) => patch("enabled", v)} label="Sticky actif" hint="En pause, le message est retiré mais la config est conservée." />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Enregistrement..." : "Enregistrer & positionner"}
                  </button>
                  <button onClick={() => setDraft(null)} className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
