"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, ArrowLeft, RefreshCw, Plus, X, ChevronDown, AlertTriangle, Hash } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const MAX_KEYWORDS = 15;
const KEYWORD_MIN = 2;
const KEYWORD_MAX = 50;

interface HighlightKeyword {
  guildId: string;
  userId: string;
  keyword: string;
  createdAt: string;
}

interface HighlightConfig {
  guildId: string;
  userId: string;
  enabled: boolean;
  ignoredChannelIds: string[];
}

interface Channel {
  id: string;
  name: string;
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/50 p-3.5 text-left transition-colors hover:bg-[var(--surface-2)] cursor-pointer"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--text-primary)]">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-[var(--text-muted)]">{hint}</span>}
      </span>
      <span className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-[var(--accent-primary)]" : "bg-[var(--panel-border)]")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-[var(--accent-contrast)] transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

export default function HighlightsCenterClient() {
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const { profile, loading: discordLoading } = useDiscordOAuth();

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (!profile?.guilds) return [];
    return profile.guilds;
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

  const [config, setConfig] = useState<HighlightConfig | null>(null);
  const [keywords, setKeywords] = useState<HighlightKeyword[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [adding, setAdding] = useState(false);
  const [muteChannelId, setMuteChannelId] = useState("");

  const load = useCallback(async () => {
    if (!selectedGuild) return;
    if (!BOT_API_URL) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/highlights`;
      const [mineRes, chanRes] = await Promise.all([
        fetch(`${base}/mine`, { credentials: "include" }),
        fetch(`${base}/channels`, { credentials: "include" }),
      ]);
      if (!mineRes.ok) throw new Error("mine");
      const mine = await mineRes.json();
      setConfig(mine.config);
      setKeywords(mine.keywords ?? []);
      if (chanRes.ok) {
        const c = await chanRes.json();
        setChannels(c.channels ?? []);
      }
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedGuild]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleEnabled = async (value: boolean) => {
    if (!selectedGuild) return;
    setConfig((c) => (c ? { ...c, enabled: value } : c));
    if (!BOT_API_URL) return success("Enregistré (mode démo)", "Le serveur du bot n'est pas joignable ici.");
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/highlights/mine/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: value }),
      });
      if (!res.ok) throw new Error();
      success(value ? "Highlights réactivés" : "Highlights en pause", "Tes mots-clés sont conservés.");
    } catch {
      showError("Échec de la sauvegarde", "Impossible de joindre le serveur du bot.");
      load();
    }
  };

  const handleAddKeyword = async () => {
    if (!selectedGuild) return;
    const trimmed = newKeyword.trim();
    if (trimmed.length < KEYWORD_MIN || trimmed.length > KEYWORD_MAX) {
      showError("Mot-clé invalide", `Entre ${KEYWORD_MIN} et ${KEYWORD_MAX} caractères.`);
      return;
    }
    if (keywords.some((k) => k.keyword.toLowerCase() === trimmed.toLowerCase())) {
      showError("Déjà surveillé", `Tu surveilles déjà "${trimmed}".`);
      return;
    }
    if (keywords.length >= MAX_KEYWORDS) {
      showError("Limite atteinte", `Maximum ${MAX_KEYWORDS} mots-clés par serveur.`);
      return;
    }
    if (!BOT_API_URL) return success("Ajouté (mode démo)", "Le serveur du bot n'est pas joignable ici.");
    setAdding(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/highlights/mine/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ keyword: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "add");
      }
      setNewKeyword("");
      success("Mot-clé ajouté", `Tu seras notifié quand "${trimmed}" est mentionné.`);
      load();
    } catch (err) {
      showError("Échec de l'ajout", err instanceof Error ? err.message : "Impossible de joindre le serveur du bot.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    if (!selectedGuild) return;
    setKeywords((k) => k.filter((item) => item.keyword !== keyword));
    if (!BOT_API_URL) return;
    try {
      const res = await fetch(
        `${BOT_API_URL}/api/guilds/${selectedGuild.id}/highlights/mine/keywords/${encodeURIComponent(keyword)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error();
    } catch {
      showError("Échec de la suppression", "Impossible de joindre le serveur du bot.");
      load();
    }
  };

  const handleMuteChannel = async () => {
    if (!selectedGuild || !config || !muteChannelId) return;
    if (config.ignoredChannelIds.includes(muteChannelId)) return;
    const next = [...config.ignoredChannelIds, muteChannelId];
    setConfig({ ...config, ignoredChannelIds: next });
    setMuteChannelId("");
    if (!BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/highlights/mine/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ignoredChannelIds: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      showError("Échec de la sauvegarde", "Impossible de joindre le serveur du bot.");
      load();
    }
  };

  const handleUnmuteChannel = async (channelId: string) => {
    if (!selectedGuild || !config) return;
    const next = config.ignoredChannelIds.filter((id) => id !== channelId);
    setConfig({ ...config, ignoredChannelIds: next });
    if (!BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/highlights/mine/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ignoredChannelIds: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      showError("Échec de la sauvegarde", "Impossible de joindre le serveur du bot.");
      load();
    }
  };

  const mutableChannels = channels.filter((c) => !(config?.ignoredChannelIds ?? []).includes(c.id));
  const mutedChannels = channels.filter((c) => (config?.ignoredChannelIds ?? []).includes(c.id));

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]" title="Retour au hub Discord">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Highlights</h1>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Sois notifié en DM quand un de tes mots-clés est mentionné.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {manageableGuilds.length > 0 ? (
            <div className="relative">
              <select
                value={selectedGuild?.id || ""}
                onChange={(e) => {
                  const g = manageableGuilds.find((item) => item.id === e.target.value);
                  if (g) setSelectedGuild(g);
                }}
                className="cursor-pointer appearance-none rounded-xl border border-[var(--panel-border)] bg-transparent px-3 py-1.5 pr-8 text-xs font-medium text-[var(--text-primary)] outline-none hover:bg-[var(--surface-2)]"
              >
                {manageableGuilds.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[var(--panel-bg)] text-[var(--text-primary)]">{g.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Aucun serveur Discord connecté</span>
          )}
          <button
            onClick={load}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--panel-border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            title="Rafraîchir"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto os-scroll space-y-4 pb-6">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="v8-panel flex flex-col items-center justify-center p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">Connecte-toi avec Discord pour gérer tes highlights.</p>
          </div>
        )}

        {offline && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-4 py-3 text-xs text-[var(--warning)]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Le serveur du bot n&apos;est pas joignable depuis cet environnement. Réglages indicatifs ; utilise{" "}
              <code className="rounded bg-[var(--surface-2)] px-1">/highlight</code> sur Discord.
            </span>
          </div>
        )}

        {selectedGuild && (
          <>
            {/* KPI strip */}
            <div className="v8-panel grid shrink-0 grid-cols-2 divide-[var(--panel-border)] sm:grid-cols-2 sm:divide-x">
              <div className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <Eye className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Mots-clés</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                    {keywords.length}/{MAX_KEYWORDS}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <Hash className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Salons ignorés</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--text-primary)]">{mutedChannels.length}</p>
                </div>
              </div>
            </div>

            <Switch
              checked={config?.enabled ?? true}
              onChange={handleToggleEnabled}
              label="Highlights actifs"
              hint="Coupe temporairement les DM sans supprimer tes mots-clés."
            />

            {/* Add keyword */}
            <div className="v8-panel flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddKeyword();
                }}
                placeholder="Ajouter un mot-clé à surveiller…"
                maxLength={KEYWORD_MAX}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                disabled={adding || !newKeyword.trim() || keywords.length >= MAX_KEYWORDS}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter</span>
              </button>
            </div>

            {/* Keyword chips */}
            <div className="v8-panel p-4">
              <p className="mb-3 text-xs font-semibold text-[var(--text-primary)]">Tes mots-clés surveillés</p>
              {keywords.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Aucun mot-clé. Ajoute-en un ci-dessus pour recevoir un DM quand quelqu&apos;un d&apos;autre l&apos;écrit.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <span
                      key={k.keyword}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-2)] py-1 pl-3 pr-1.5 text-xs text-[var(--text-primary)]"
                    >
                      {k.keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(k.keyword)}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                        title="Retirer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Muted channels */}
            <div className="v8-panel p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-primary)]">Salons ignorés</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Un mot-clé mentionné dans ces salons ne te déclenche aucun DM (ex : un salon trop actif).
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <select
                    value={muteChannelId}
                    onChange={(e) => setMuteChannelId(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-1.5 pr-8 text-xs text-[var(--text-primary)] outline-none hover:bg-[var(--surface-2)]"
                  >
                    <option value="" className="bg-[var(--panel-bg)] text-[var(--text-primary)]">— Choisir un salon —</option>
                    {mutableChannels.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[var(--panel-bg)] text-[var(--text-primary)]">
                        #{c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
                <button
                  type="button"
                  onClick={handleMuteChannel}
                  disabled={!muteChannelId}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Ignorer ce salon
                </button>
              </div>
              {mutedChannels.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {mutedChannels.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-2)] py-1 pl-3 pr-1.5 text-xs text-[var(--text-muted)]"
                    >
                      #{c.name}
                      <button
                        type="button"
                        onClick={() => handleUnmuteChannel(c.id)}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                        title="Réactiver ce salon"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
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
