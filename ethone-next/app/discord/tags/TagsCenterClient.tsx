"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Hash, ArrowLeft, RefreshCw, Plus, Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

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
      const m = manageableGuilds.find((g) => g.id === queryGuildId);
      if (m) {
        setSelectedGuild(m);
        return;
      }
    }
    if (!selectedGuild) setSelectedGuild(manageableGuilds[0]);
  }, [manageableGuilds, queryGuildId, selectedGuild]);

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
  }, [selectedGuild]);

  useEffect(() => {
    setTags([]);
    setOverview(null);
    setEditName("");
    setEditContent("");
    load();
  }, [load]);

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
    if (!BOT_API_URL) return success("Enregistré (mode démo)", "Le serveur du bot n'est pas joignable ici.");
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
    } catch (e) {
      showError("Échec", e instanceof Error && e.message ? e.message : "Impossible d'enregistrer.");
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
      if (!res.ok) throw new Error();
      success("Tag supprimé", "");
      if (editName === name) {
        setEditName("");
        setEditContent("");
      }
      load();
    } catch {
      showError("Échec", "Impossible de supprimer.");
    }
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-white">
      <div className="shrink-0 border-b border-white/10 bg-[var(--bg-surface-elevated)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Tags</h1>
              <p className="text-xs text-white/40">Réponses réutilisables : FAQ, formats, liens</p>
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
                  <option key={g.id} value={g.id} className="bg-[var(--bg-surface-elevated)] text-white">{g.name}</option>
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

      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-36 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur.
          </div>
        )}

        {offline && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Le serveur du bot n&apos;est pas joignable depuis cet environnement. Utilise <code className="rounded bg-black/30 px-1">/tag add</code> sur Discord.</span>
          </div>
        )}

        {selectedGuild && (
          <>
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Tags</p>
                  <p className="mt-1 text-lg font-bold text-white">{overview.total}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Affichages cumulés</p>
                  <p className="mt-1 text-lg font-bold text-white">{overview.totalUses}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
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
                  className="sm:col-span-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50 disabled:opacity-60"
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
                className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#5865F2]/50"
              />
              <p className="text-[10px] text-zinc-500">{editContent.length}/2000</p>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3">
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
                      <button onClick={() => handleDelete(t.name)} title="Supprimer" className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer">
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
