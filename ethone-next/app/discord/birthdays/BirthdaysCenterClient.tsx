"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Cake, RefreshCw, Save, AlertTriangle, Bot } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import { formatApiError } from "@/lib/format-error";

import ModulePageTitle from "@/components/discord/ModulePageTitle";
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
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ModulePageTitle icon={<Cake />} title="Birthdays" subtitle="Annonce quotidienne des anniversaires + rôle du jour" />
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
          <button
            onClick={handleSave}
            disabled={saving || !selectedGuild}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
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
                  Invitez le bot sur « {selectedGuild.name} » pour synchroniser automatiquement les annonces d&apos;anniversaires sur Discord.
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
            <span>Mode hors-ligne : la connexion au serveur du bot est temporairement indisponible. Vos modifications sont conservées localement.</span>
          </div>
        )}

        {selectedGuild && (
          <>
            {overview && (overview.today.length > 0 || overview.upcoming.length > 0 || overview.total > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                  <p className="text-xs text-[var(--text-muted)]">Enregistrés</p>
                  <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{overview.total}</p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                  <p className="text-xs text-[var(--text-muted)]">Aujourd&apos;hui</p>
                  <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                    {overview.today.length === 0 ? "—" : overview.today.map((t) => `<@${t.userId}>`).length}
                    {overview.today.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                        {overview.today.map((t) => (t.age !== null ? `${t.age} ans` : "")).filter(Boolean).join(", ")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                  <p className="text-xs text-[var(--text-muted)]">Prochain</p>
                  <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
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
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Salon d&apos;annonce</label>
                  <ChannelPicker
                    value={config.announceChannelId ?? ""}
                    onChange={(id) => patch("announceChannelId", id || null)}
                    channels={channels}
                    emptyLabel="— Choisir —"
                  />
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Heure d&apos;annonce : {config.announceHour}h</label>
                  <input type="range" min={0} max={23} value={config.announceHour} onChange={(e) => patch("announceHour", Number(e.target.value))} className="mt-2 w-full accent-emerald-500" />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Rôle « Anniversaire » (attribué le jour J, retiré le lendemain)</label>
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
                <p className="mt-1 text-xs text-[var(--text-muted)]">Le bot a besoin de la permission Gérer les rôles, et son rôle doit être au-dessus.</p>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Message ({config.message.length}/500)</label>
                <textarea
                  value={config.message}
                  onChange={(e) => patch("message", e.target.value.slice(0, 500))}
                  rows={2}
                  className="w-full resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--input-border-hover)]"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]"><code className="rounded bg-[var(--surface-raised)]/40 px-1">{"{user}"}</code> = mention · <code className="rounded bg-[var(--surface-raised)]/40 px-1">{"{age}"}</code> = âge · <code className="rounded bg-[var(--surface-raised)]/40 px-1">{"{date}"}</code> = jj/mm</p>
              </div>

              <Switch checked={config.mentionUser} onChange={(v) => patch("mentionUser", v)} label="Mentionner le membre (ping)" hint="Sinon, son nom en gras sans notification." />
            </div>

            {overview && overview.upcoming.length > 0 && (
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 overflow-hidden">
                <div className="border-b border-[var(--panel-border)] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Prochains anniversaires (30 j)</p>
                </div>
                <div className="divide-y divide-[var(--panel-border)]">
                  {overview.upcoming.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between gap-3 p-4 text-sm">
                      <span className="font-semibold text-[var(--text-primary)]"><code className="text-[var(--text-muted)]">{u.userId}</code></span>
                      <span className="text-[12px] text-[var(--text-muted)]">{u.day} {MONTHS[u.month - 1]} <span className="text-[var(--text-muted)]">· dans {u.inDays} j</span></span>
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
