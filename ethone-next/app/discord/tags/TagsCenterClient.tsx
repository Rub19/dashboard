"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Hash, ArrowLeft, RefreshCw, Plus, Trash2, AlertTriangle, Bot } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const NAME_RE = /^[a-z0-9_-]{1,32}$/;

interface TagRow {
  guildId: string;
  name: string;
  content: string;
  createdBy: string | null;
  uses: number;
  updatedAt: string;
}

interface TagOverview {
  total: number;
  totalUses: number;
  top: Array<{ name: string; uses: number }>;
}

export default function TagsCenterClient() {
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
      const m = manageableGuilds.find((g) => g.id === queryGuildId);
      if (m) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(m);
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

  const [tags, setTags] = useState<TagRow[]>([]);
  const [overview, setOverview] = useState<TagOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setTags([]);
      setOverview(null);
      return;
    }

    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/tags`;
      const [listRes, ovRes] = await Promise.all([
        fetch(`${base}/list`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
      ]);
      if (!listRes.ok) throw new Error("list");
      setTags((await listRes.json()).tags ?? []);
      if (ovRes.ok) setOverview(await ovRes.json());
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, botGuildIds]);

  useEffect(() => {
    setTags([]);
    setOverview(null);
    setEditName("");
    setEditContent("");
    load();
  }, [load]);

  // Reflète en direct les changements faits via la commande Discord /tag add|edit
  // (ou un autre onglet dashboard) — remplace le tag concerné dans la liste, ou
  // l'ajoute s'il est nouveau.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedTag: any) => {
      if (module !== "tags" || !updatedTag?.name) return;
      setTags((prev) => {
        const idx = prev.findIndex((t) => t.name === updatedTag.name);
        if (idx === -1) return [...prev, updatedTag];
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedTag };
        return next;
      });
    },
  });

  const openEditor = (tag?: TagRow) => {
    if (tag) {
      setEditName(tag.name);
      setEditContent(tag.content);
      setIsNew(false);
    } else {
      setEditName("");
      setEditContent("");
      setIsNew(true);
    }
  };

  const handleSave = async () => {
    if (!selectedGuild) return;
    const name = editName.trim().toLowerCase();
    if (!NAME_RE.test(name)) return showError("Nom invalide", "a-z, 0-9, _ ou - (32 max), sans espace.");
    if (!editContent.trim()) return showError("Contenu vide", "Écris le texte du tag.");
    if (!BOT_API_URL) return showError("Bot injoignable", "Rien n'a été enregistré.");
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/tags/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "");
      success(isNew ? "Tag créé" : "Tag modifié", `\`/tag get ${name}\` pour l'afficher.`);
      setEditName("");
      setEditContent("");
      load();
    } catch (e: any) {
      showError("Échec", formatApiError(e, "Impossible d'enregistrer."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/tags/${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "delete failed");
      success("Tag supprimé", "");
      if (editName === name) {
        setEditName("");
        setEditContent("");
      }
      load();
    } catch (e: any) {
      showError("Échec", formatApiError(e, "Impossible de supprimer."));
    }
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[var(--panel-border)] flex items-center justify-center text-zinc-300">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Tags</h1>
              <p className="text-xs text-white/70">Réponses réutilisables : FAQ, formats, liens</p>
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

      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-44 md:pb-44 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur.
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
                  Invitez le bot sur « {selectedGuild.name} » pour synchroniser automatiquement les commandes /tag sur Discord.
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
            <span>Le serveur du bot n&apos;est pas joignable depuis cet environnement. Utilise <code className="rounded bg-black/30 px-1">/tag add</code> sur Discord.</span>
          </div>
        )}

        {selectedGuild && (
          <>
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Tags</p>
                  <p className="mt-1 text-lg font-bold text-white">{overview.total}</p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Affichages cumulés</p>
                  <p className="mt-1 text-lg font-bold text-white">{overview.totalUses}</p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Le plus utilisé</p>
                  <p className="mt-1 text-sm font-bold text-white truncate">{overview.top[0] ? `${overview.top[0].name} (${overview.top[0].uses})` : "—"}</p>
                </div>
              </div>
            )}

            {/* Editor */}
            <div className="rounded-2xl border border-[#5865F2]/30 bg-white/[0.02] p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {isNew || !editName ? "Nouveau tag" : `Modifier « ${editName} »`}
                </p>
                {!isNew && editName && (
                  <button onClick={() => openEditor()} className="text-xs text-zinc-400 hover:text-white cursor-pointer">Nouveau</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32))}
                  disabled={!isNew && !!editName && tags.some((t) => t.name === editName)}
                  placeholder="nom (faq, regles…)"
                  className="sm:col-span-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50 disabled:opacity-60"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="sm:col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4752C4] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "…" : "Enregistrer"}
                </button>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value.slice(0, 2000))}
                rows={4}
                placeholder="Le texte affiché par /tag get. Markdown Discord supporté."
                className="w-full resize-y rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50"
              />
              <p className="text-[10px] text-zinc-500">{editContent.length}/2000</p>
            </div>

            {/* List */}
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] overflow-hidden">
              <div className="border-b border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Tags du serveur ({tags.length})</p>
              </div>
              {tags.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">Aucun tag. Crée-en un ci-dessus.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {tags.map((t) => (
                    <div key={t.name} className="flex items-start gap-3 p-4">
                      <button onClick={() => openEditor(t)} className="min-w-0 flex-1 text-left cursor-pointer">
                        <p className="flex items-center gap-2 text-sm font-semibold text-white">
                          <code className="text-[#a9b2ff]">{t.name}</code>
                          <span className="text-[10px] font-normal text-zinc-500">{t.uses} affichages</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] text-zinc-300">{t.content}</p>
                      </button>
                      <button onClick={() => handleDelete(t.name)} title="Supprimer" className="shrink-0 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
