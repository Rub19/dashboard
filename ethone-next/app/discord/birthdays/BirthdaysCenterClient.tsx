"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cake, ArrowLeft, RefreshCw, Save, AlertTriangle, Bot } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface BirthdayConfig {
  guildId: string;
  enabled: boolean;
  announceChannelId: string | null;
  announceHour: number;
  message: string;
  birthdayRoleId: string | null;
  mentionUser: boolean;
}

interface BirthdayOverview {
  enabled: boolean;
  announceChannelId: string | null;
  announceHour: number;
  total: number;
  today: Array<{ userId: string; age: number | null }>;
  upcoming: Array<{ userId: string; day: number; month: number; inDays: number }>;
}

interface Target {
  id: string;
  name: string;
  color?: string;
}

const DEFAULT_CONFIG: BirthdayConfig = {
  guildId: "",
  enabled: false,
  announceChannelId: null,
  announceHour: 9,
  message: "🎂 Joyeux anniversaire {user} ! 🎉",
  birthdayRoleId: null,
  mentionUser: true,
};

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

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

export default function BirthdaysCenterClient() {
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

  const [config, setConfig] = useState<BirthdayConfig>(DEFAULT_CONFIG);
  const [overview, setOverview] = useState<BirthdayOverview | null>(null);
  const [channels, setChannels] = useState<Target[]>([]);
  const [roles, setRoles] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!selectedGuild) return;

    const localKey = `ethone:birthdays:${selectedGuild.id}`;
    let savedLocal: BirthdayConfig | null = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) savedLocal = JSON.parse(raw);
    } catch {}

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      setOffline(false);
      setConfig(savedLocal ? { ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id } : { ...DEFAULT_CONFIG, guildId: selectedGuild.id });
      setOverview(null);
      setChannels([]);
      setRoles([]);
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
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/birthdays`;
      const [cfgRes, ovRes, tRes] = await Promise.all([
        fetch(`${base}/config`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/targets`, { credentials: "include" }),
      ]);
      if (!cfgRes.ok) throw new Error("config");
      const fetchedConfig = await cfgRes.json();
      const mergedConfig = { ...DEFAULT_CONFIG, ...fetchedConfig, guildId: selectedGuild.id };
      setConfig(mergedConfig);
      try {
        localStorage.setItem(localKey, JSON.stringify(mergedConfig));
      } catch {}
      if (ovRes.ok) setOverview(await ovRes.json());
      if (tRes.ok) {
        const t = await tRes.json();
        setChannels(t.channels ?? []);
        setRoles(t.roles ?? []);
      }
    } catch {
      setOffline(true);
      if (savedLocal) setConfig({ ...DEFAULT_CONFIG, ...savedLocal, guildId: selectedGuild.id });
    } finally {
      setLoading(false);
    }
  }, [selectedGuild, botGuildIds]);

  useEffect(() => {
    load();
  }, [load]);

  // Reflète en direct les changements faits via la commande Discord /birthday
  // (ou un autre onglet dashboard) sans attendre un rechargement manuel.
  useDiscordSync({
    guildId: selectedGuild?.id,
    onConfigUpdated: (module, updatedConfig) => {
      if (module === "birthdays" && updatedConfig) {
        setConfig((prev) => ({ ...prev, ...updatedConfig }));
      }
    },
  });

  const patch = <K extends keyof BirthdayConfig>(key: K, value: BirthdayConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    if (!selectedGuild) return;
    const localKey = `ethone:birthdays:${selectedGuild.id}`;

    // Si le bot n'est pas installé sur ce serveur
    if (botGuildIds !== null && !botGuildIds.includes(selectedGuild.id)) {
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Réglages enregistrés localement", "Les réglages seront synchronisés dès que le bot aura rejoint ce serveur.");
      return;
    }

    if (config.enabled && !config.announceChannelId) {
      return showError("Choisis un salon", "L'annonce a besoin d'un salon pour être activée.");
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
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuild.id}/birthdays/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: config.enabled,
          announceChannelId: config.announceChannelId,
          announceHour: config.announceHour,
          message: config.message,
          birthdayRoleId: config.birthdayRoleId,
          mentionUser: config.mentionUser,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "save failed");
      try {
        localStorage.setItem(localKey, JSON.stringify(config));
      } catch {}
      success("Anniversaires synchronisés", "Les réglages ont été appliqués au bot.");
      load();
    } catch (err: any) {
      if (err?.message && err.message !== "save failed" && err.message !== "Failed to fetch") {
        showError("Échec de la sauvegarde", formatApiError(err, "Impossible de joindre le serveur du bot."));
      } else {
        try {
          localStorage.setItem(localKey, JSON.stringify(config));
        } catch {}
        success("Enregistré hors-ligne", "Impossible de joindre le bot. Vos réglages sont conservés localement.");
      }
    } finally {
      setSaving(false);
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
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Birthdays</h1>
              <p className="text-xs text-white/70">Annonce quotidienne des anniversaires + rôle du jour</p>
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
          <button
            onClick={handleSave}
            disabled={saving || !selectedGuild}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Enregistrement..." : "Sauvegarder"}
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
                  Invitez le bot sur « {selectedGuild.name} » pour synchroniser automatiquement les annonces d&apos;anniversaires sur Discord.
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
            <span>Mode hors-ligne : la connexion au serveur du bot est temporairement indisponible. Vos modifications sont conservées localement.</span>
          </div>
        )}

        {selectedGuild && (
          <>
            {overview && (overview.today.length > 0 || overview.upcoming.length > 0 || overview.total > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Enregistrés</p>
                  <p className="mt-1 text-lg font-bold text-white">{overview.total}</p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Aujourd&apos;hui</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {overview.today.length === 0 ? "—" : overview.today.map((t) => `<@${t.userId}>`).length}
                    {overview.today.length > 0 && (
                      <span className="ml-2 text-[11px] font-normal text-zinc-500">
                        {overview.today.map((t) => (t.age !== null ? `${t.age} ans` : "")).filter(Boolean).join(", ")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Prochain</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {overview.upcoming[0]
                      ? `${overview.upcoming[0].day} ${MONTHS[overview.upcoming[0].month - 1]} (dans ${overview.upcoming[0].inDays} j)`
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Switch checked={config.enabled} onChange={(v) => patch("enabled", v)} label="Module actif" hint="Annonce quotidienne + rôle du jour." />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <label className="mb-1.5 block text-[11px] font-medium text-zinc-400">Salon d&apos;annonce</label>
                  <ChannelPicker
                    value={config.announceChannelId ?? ""}
                    onChange={(id) => patch("announceChannelId", id || null)}
                    channels={channels}
                    emptyLabel="— Choisir —"
                  />
                </div>
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Heure d&apos;annonce : {config.announceHour}h</label>
                  <input type="range" min={0} max={23} value={config.announceHour} onChange={(e) => patch("announceHour", Number(e.target.value))} className="mt-2 w-full accent-[#5865F2]" />
                </div>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">Rôle « Anniversaire » (attribué le jour J, retiré le lendemain)</label>
                <RolePicker
                  value={config.birthdayRoleId}
                  onChange={(id) => patch("birthdayRoleId", id || null)}
                  roles={roles}
                  guildId={selectedGuild?.id}
                  placeholder="Sélectionner un rôle ou saisir un ID..."
                  emptyLabel="— Aucun —"
                  allowClear
                  size="sm"
                />
                <p className="mt-1 text-[10px] text-zinc-500">Le bot a besoin de la permission Gérer les rôles, et son rôle doit être au-dessus.</p>
              </div>

              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5">
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">Message ({config.message.length}/500)</label>
                <textarea
                  value={config.message}
                  onChange={(e) => patch("message", e.target.value.slice(0, 500))}
                  rows={2}
                  className="w-full resize-y rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
                />
                <p className="mt-1 text-[10px] text-zinc-500"><code className="rounded bg-black/30 px-1">{"{user}"}</code> = mention · <code className="rounded bg-black/30 px-1">{"{age}"}</code> = âge · <code className="rounded bg-black/30 px-1">{"{date}"}</code> = jj/mm</p>
              </div>

              <Switch checked={config.mentionUser} onChange={(v) => patch("mentionUser", v)} label="Mentionner le membre (ping)" hint="Sinon, son nom en gras sans notification." />
            </div>

            {overview && overview.upcoming.length > 0 && (
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] overflow-hidden">
                <div className="border-b border-[var(--panel-border)] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Prochains anniversaires (30 j)</p>
                </div>
                <div className="divide-y divide-white/5">
                  {overview.upcoming.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between gap-3 p-4 text-sm">
                      <span className="font-semibold text-white"><code className="text-zinc-400">{u.userId}</code></span>
                      <span className="text-[12px] text-zinc-300">{u.day} {MONTHS[u.month - 1]} <span className="text-zinc-500">· dans {u.inDays} j</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
