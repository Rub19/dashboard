"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Moon, ArrowLeft, RefreshCw, Save, AlertTriangle, X, Bot } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface AfkConfig {
  guildId: string;
  enabled: boolean;
  clearOnMessage: boolean;
  notifyOnMention: boolean;
  prefixNickname: boolean;
  autoDeleteSeconds: number;
}

interface AfkOverview {
  enabled: boolean;
  activeCount: number;
  totalMentionsWhileAway: number;
  members: Array<{ userId: string; reason: string; since: string; mentionCount: number }>;
}

const DEFAULT_CONFIG: AfkConfig = {
  guildId: "",
  enabled: true,
  clearOnMessage: true,
  notifyOnMention: true,
  prefixNickname: false,
  autoDeleteSeconds: 10,
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
          checked ? "bg-emerald-500" : "bg-[var(--panel-border)]"
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

function since(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} j`;
}

export default function AfkCenterClient() {
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

  const [config, setConfig] = useState<AfkConfig>(DEFAULT_CONFIG);
  const [overview, setOverview] = useState<AfkOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;

    const localKey = `ethone:afk:${selectedGuild.id}`;
    let savedLocal: AfkConfig | null = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) savedLocal = JSON.parse(raw);
    } catch {}

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setConfig(savedLocal ? { ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id } : { ...DEFAULT_CONFIG, guildId: selectedGuild.id });
      setOverview(null);
      return;
    }

    if (!BOT_API_URL) {
      setOffline(true);
      if (savedLocal) setConfig({ ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id });
      return;
    }

    setLoading(true);
    setOffline(false);
    try {
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/afk`;
      const [cfgRes, ovRes] = await Promise.all([
        fetch(`${base}/config`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
      ]);
      if (!cfgRes.ok) throw new Error("config");
      const fetchedConfig = await cfgRes.json();
      const mergedConfig = { ...DEFAULT_CONFIG, ...fetchedConfig, guildId: selectedGuild.id };
      setConfig(mergedConfig);
      try {
        localStorage.setItem(localKey, JSON.stringify(mergedConfig));
      } catch {}
      if (ovRes.ok) setOverview(await ovRes.json());
    } catch {
      setOffline(true);
      if (savedLocal) {
        setConfig({ ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, botGuildIds]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = <K extends keyof AfkConfig>(key: K, value: AfkConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    if (!selectedGuild) return;
    const localKey = `ethone:afk:${selectedGuild.id}`;

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Réglages enregistrés localement", "Les réglages seront synchronisés dès que le bot aura rejoint ce serveur.");
      return;
    }

    if (!BOT_API_URL) {
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Enregistré hors-ligne", "Les réglages sont conservés sur votre appareil et seront appliqués dès que le bot sera joignable.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/afk/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: config.enabled,
          clearOnMessage: config.clearOnMessage,
          notifyOnMention: config.notifyOnMention,
          prefixNickname: config.prefixNickname,
          autoDeleteSeconds: config.autoDeleteSeconds,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(formatApiError(data?.error, `Erreur HTTP ${res.status}`));
      }
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("AFK synchronisé", "Les réglages ont été appliqués au bot.");
      load();
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== "Failed to fetch" && !err.message.includes("NetworkError")) {
        showError("Échec de la sauvegarde", formatApiError(err, "Impossible de joindre le serveur du bot."));
        return;
      }
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Enregistré hors-ligne", "Impossible de joindre le bot. Vos réglages sont conservés localement.");
    } finally {
      setSaving(false);
    }
  };

  const clearMember = async (userId: string) => {
    if (!selectedGuild || !BOT_API_URL) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/afk/entries/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(formatApiError(data?.error, `Erreur HTTP ${res.status}`));
      }
      success("Statut AFK retiré", "");
      load();
    } catch (err) {
      showError("Échec", formatApiError(err, "Impossible de retirer le statut."));
    }
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--bg-surface-elevated)]/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <Link href="/discord" className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-colors" title="Retour au hub Discord">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] flex items-center justify-center text-[var(--text-muted)]">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">AFK</h1>
              <p className="text-xs text-[var(--text-muted)]">Statut absent + notification sur mention</p>
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
            <span className="text-xs text-[var(--text-muted)]">Aucun serveur administrable</span>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Rafraîchir">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedGuild}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-44 md:pb-44 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center text-sm text-[var(--text-muted)]">
            Connectez un serveur Discord où vous êtes administrateur.
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
                  Invitez le bot sur « {selectedGuild.name} » pour synchroniser automatiquement les statuts AFK en direct sur Discord.
                </p>
              </div>
            </div>
            <a
              href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs transition-colors shrink-0 cursor-pointer"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {offline && selectedGuild && (botGuildIds === null || botGuildIds.includes(selectedGuild.id)) && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Mode hors-ligne : la connexion au serveur du bot est temporairement indisponible. Vos modifications sont conservées localement et seront synchronisées dès le rétablissement de la connexion.
            </span>
          </div>
        )}

        {selectedGuild && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Membres AFK", value: overview?.activeCount ?? 0 },
                { label: "Mentions pendant absence", value: overview?.totalMentionsWhileAway ?? 0 },
                { label: "Module", value: config.enabled ? "Actif" : "Inactif" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                  <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
                  <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Switch checked={config.enabled} onChange={(v) => patch("enabled", v)} label="Module AFK actif" hint="La commande /afk et les notifications." />
              <Switch checked={config.clearOnMessage} onChange={(v) => patch("clearOnMessage", v)} label="Retirer le statut au premier message" hint="Dès que le membre reparle, il n'est plus AFK." />
              <Switch checked={config.notifyOnMention} onChange={(v) => patch("notifyOnMention", v)} label="Prévenir quand un membre AFK est mentionné" hint="« X est AFK : raison (depuis …) »." />
              <Switch checked={config.prefixNickname} onChange={(v) => patch("prefixNickname", v)} label="Préfixer le pseudo avec [AFK]" hint="Nécessite la permission Gérer les pseudos. Restauré au retour." />
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">Auto-suppression des réponses du bot : {config.autoDeleteSeconds === 0 ? "jamais" : `${config.autoDeleteSeconds}s`}</label>
                <input type="range" min={0} max={60} value={config.autoDeleteSeconds} onChange={(e) => patch("autoDeleteSeconds", Number(e.target.value))} className="mt-2 w-full accent-emerald-500" />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 overflow-hidden">
              <div className="border-b border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Membres actuellement AFK ({overview?.members.length ?? 0})</p>
              </div>
              {!overview || overview.members.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Personne n&apos;est AFK.</p>
              ) : (
                <div className="divide-y divide-[var(--panel-border)]">
                  {overview.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          <code className="text-[var(--text-muted)]">{m.userId}</code>
                          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">depuis {since(m.since)} · {m.mentionCount} mentions</span>
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)]">{m.reason}</p>
                      </div>
                      <button onClick={() => clearMember(m.userId)} title="Retirer le statut AFK" className="shrink-0 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                        <X className="h-3.5 w-3.5" />
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
