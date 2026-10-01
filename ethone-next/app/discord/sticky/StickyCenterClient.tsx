"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pin,
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

import ModulePageTitle from "@/components/discord/ModulePageTitle";
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
      className="flex w-full items-start justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 text-left transition-colors hover:border-[var(--input-border-hover)] cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--text-primary)]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative inline-flex mt-0.5 h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200",
          checked ? "bg-emerald-500" : "bg-[var(--surface-raised)]/80"
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
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
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
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
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
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      success("Republié", `Le sticky a été renvoyé en bas de #${channelName(channelId)}.`);
      load();
    } catch (err: any) {
      showError("Échec", formatApiError(err, "Impossible de republier le sticky."));
    }
  };

  const usedChannelIds = new Set(overview?.channels.map((c) => c.channelId) ?? []);
  const availableChannels = channels.filter((c) => !usedChannelIds.has(c.id) || c.id === draft?.channelId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ModulePageTitle icon={<Pin />} title="Sticky Messages" subtitle="Un message toujours visible en bas d&apos;un salon" />
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
            <span className="text-xs text-[var(--text-muted)]">Aucun serveur administrable</span>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Rafraîchir">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-6">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center text-sm text-[var(--text-muted)]">
            Connectez un serveur Discord où vous êtes administrateur pour configurer les Sticky Messages.
          </div>
        )}

        {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 shrink-0 mt-0.5">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
                <p className="mt-0.5 text-[var(--text-muted)]">
                  Invitez le bot sur « {selectedGuild.name} » pour épingler et rafraîchir des messages sticky en bas des salons.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
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
              <code className="rounded bg-[var(--surface-raised)]/40 px-1">/sticky</code> sur Discord, ou réessayez plus tard.
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
                  <div key={s.label} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                    <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* List */}
            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Salons</p>
                <button
                  onClick={() => openEditor(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 h-9 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau sticky
                </button>
              </div>
              {overview && overview.channels.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Aucun sticky. Cliquez sur « Nouveau sticky ».</p>
              ) : (
                <div className="divide-y divide-[var(--panel-border)]">
                  {overview?.channels.map((row) => (
                    <div key={row.channelId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <button onClick={() => openEditor(row.channelId)} className="flex min-w-0 flex-1 flex-col items-start text-left cursor-pointer">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                          <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          {channelName(row.channelId)}
                          <span className={cn("ml-1 rounded px-1.5 py-0.5 text-xs font-bold", row.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-[var(--surface-raised)]/80 text-[var(--text-muted)]")}>
                            {row.enabled ? "Actif" : "En pause"}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">{row.preview}</span>
                        <span className="mt-1 text-xs text-[var(--text-muted)]">{row.asEmbed ? "Embed" : "Texte"} · {row.repostCount} repositionnements</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => handleRepost(row.channelId)} title="Republier maintenant" className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-2 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                          <Send className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(row.channelId)} title="Supprimer" className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
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
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{usedChannelIds.has(draft.channelId) ? "Modifier le sticky" : "Nouveau sticky"}</p>
                  <button onClick={() => setDraft(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">Fermer</button>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Salon</label>
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
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Contenu ({draft.content.length}/2000)</label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => patch("content", e.target.value.slice(0, 2000))}
                    rows={5}
                    placeholder="Le message qui restera en bas du salon. Markdown Discord supporté."
                    className="w-full resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--input-border-hover)]"
                  />
                </div>

                <Switch checked={draft.asEmbed} onChange={(v) => patch("asEmbed", v)} label="Afficher en embed" hint="Sinon, un simple message texte." />

                {draft.asEmbed && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Titre de l&apos;embed</label>
                      <input
                        value={draft.title}
                        onChange={(e) => patch("title", e.target.value.slice(0, 256))}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={draft.color} onChange={(e) => patch("color", e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-[var(--input-border)] bg-transparent" />
                        <input
                          value={draft.color}
                          onChange={(e) => patch("color", e.target.value)}
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Anti-rebond : {draft.cooldownSeconds}s entre deux repositionnements</label>
                  <input type="range" min={2} max={120} value={draft.cooldownSeconds} onChange={(e) => patch("cooldownSeconds", Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                <Switch checked={draft.enabled} onChange={(v) => patch("enabled", v)} label="Sticky actif" hint="En pause, le message est retiré mais la config est conservée." />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 h-9 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Enregistrement..." : "Enregistrer & positionner"}
                  </button>
                  <button onClick={() => setDraft(null)} className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 transition-colors cursor-pointer">
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
