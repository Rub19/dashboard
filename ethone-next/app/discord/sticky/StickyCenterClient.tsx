"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Pin,
  ArrowLeft,
  RefreshCw,
  Save,
  ChevronDown,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Hash,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

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
      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 text-left transition-colors hover:border-white/20 cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{hint}</span>}
      </span>
      <span className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-[#5865F2]" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

export default function StickyCenterClient() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds.filter((g) => {
      if (g.owner) return true;
      if (!g.permissions) return false;
      const num = Number(g.permissions);
      return (num & 8) === 8 || (num & 32) === 32;
    });
  }, [profile?.guilds]);

  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        setSelectedGuild(match);
        return;
      }
    }
    if (!selectedGuild) setSelectedGuild(manageableGuilds[0]);
  }, [manageableGuilds, queryGuildId, selectedGuild]);

  const [overview, setOverview] = useState<StickyOverview | null>(null);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [draft, setDraft] = useState<StickyConfig | null>(null);
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
  }, [selectedGuild]);

  useEffect(() => {
    setDraft(null);
    setOverview(null);
    load();
  }, [load]);

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
      success("Enregistré (mode démo)", "Le serveur du bot n'est pas joignable depuis cet environnement.");
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
      if (!res.ok) throw new Error();
      success("Sticky synchronisé", "Le message a été (re)positionné dans le salon.");
      setDraft(null);
      load();
    } catch {
      showError("Échec de la sauvegarde", "Impossible de joindre le serveur du bot. Réessayez.");
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
      if (!res.ok) throw new Error();
      success("Sticky retiré", `Le message ne sera plus fixé dans #${channelName(channelId)}.`);
      if (draft?.channelId === channelId) setDraft(null);
      load();
    } catch {
      showError("Échec", "Impossible de retirer le sticky.");
    }
  };

  const handleRepost = async (channelId: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/sticky/config/${channelId}/repost`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      success("Republié", `Le sticky a été renvoyé en bas de #${channelName(channelId)}.`);
      load();
    } catch {
      showError("Échec", "Impossible de republier le sticky.");
    }
  };

  const usedChannelIds = new Set(overview?.channels.map((c) => c.channelId) ?? []);
  const availableChannels = channels.filter((c) => !usedChannelIds.has(c.id) || c.id === draft?.channelId);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
              <Pin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Sticky Messages</h1>
              <p className="text-xs text-white/40">Un message toujours visible en bas d&apos;un salon</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {manageableGuilds.length > 0 ? (
            <div className="relative">
              <select
                value={selectedGuild?.id || ""}
                onChange={(e) => {
                  const g = manageableGuilds.find((item) => item.id === e.target.value);
                  if (g) setSelectedGuild(g);
                }}
                className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-white/90 focus:outline-none focus:border-[#5865F2]/50 hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                {manageableGuilds.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[var(--bg-surface-elevated)] text-white">
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs text-white/40">Aucun serveur administrable</span>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors" title="Rafraîchir">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-36 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur pour configurer les Sticky Messages.
          </div>
        )}

        {offline && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Le serveur du bot n&apos;est pas joignable depuis cet environnement. Utilisez la commande{" "}
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
                  <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                    <p className="text-[11px] text-zinc-400">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
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
                        <button onClick={() => handleRepost(row.channelId)} title="Republier maintenant" className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                          <Send className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(row.channelId)} title="Supprimer" className="rounded-lg border border-white/10 bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
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
                  <select
                    value={draft.channelId}
                    onChange={(e) => patch("channelId", e.target.value)}
                    disabled={usedChannelIds.has(draft.channelId)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 disabled:opacity-60 [&>option]:bg-[var(--bg-surface-elevated)]"
                  >
                    <option value="">— Choisir un salon —</option>
                    {availableChannels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}{!c.canSend || !c.canManage ? " (permissions manquantes)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Contenu ({draft.content.length}/2000)</label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => patch("content", e.target.value.slice(0, 2000))}
                    rows={5}
                    placeholder="Le message qui restera en bas du salon. Markdown Discord supporté."
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50"
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
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-400">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={draft.color} onChange={(e) => patch("color", e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
                        <input
                          value={draft.color}
                          onChange={(e) => patch("color", e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
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
                  <button onClick={() => setDraft(null)} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer">
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
