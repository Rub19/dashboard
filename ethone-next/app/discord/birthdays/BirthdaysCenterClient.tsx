"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cake, ArrowLeft, RefreshCw, Save, ChevronDown, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

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

export default function BirthdaysCenterClient() {
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

  const [config, setConfig] = useState<BirthdayConfig>(DEFAULT_CONFIG);
  const [overview, setOverview] = useState<BirthdayOverview | null>(null);
  const [channels, setChannels] = useState<Target[]>([]);
  const [roles, setRoles] = useState<Target[]>([]);
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
      const base = `${BOT_API_URL}/api/guilds/${selectedGuild.id}/birthdays`;
      const [cfgRes, ovRes, tRes] = await Promise.all([
        fetch(`${base}/config`, { credentials: "include" }),
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/targets`, { credentials: "include" }),
      ]);
      if (!cfgRes.ok) throw new Error("config");
      setConfig({ ...DEFAULT_CONFIG, ...(await cfgRes.json()), guildId: selectedGuild.id });
      if (ovRes.ok) setOverview(await ovRes.json());
      if (tRes.ok) {
        const t = await tRes.json();
        setChannels(t.channels ?? []);
        setRoles(t.roles ?? []);
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

  const patch = <K extends keyof BirthdayConfig>(key: K, value: BirthdayConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    if (!selectedGuild) return;
    if (config.enabled && !config.announceChannelId) {
      return showError("Choisis un salon", "L'annonce a besoin d'un salon pour être activée.");
    }
    if (!BOT_API_URL) return success("Enregistré (mode démo)", "Le serveur du bot n'est pas joignable ici.");
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
      if (!res.ok) throw new Error();
      success("Anniversaires synchronisés", "Les réglages ont été appliqués au bot.");
      load();
    } catch {
      showError("Échec de la sauvegarde", "Impossible de joindre le serveur du bot.");
    } finally {
      setSaving(false);
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
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">Birthdays</h1>
              <p className="text-xs text-white/40">Annonce quotidienne des anniversaires + rôle du jour</p>
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

      <div className="flex-1 overflow-y-auto os-scroll px-4 sm:px-6 py-6 pb-36 space-y-6 [overscroll-behavior:contain]">
        {!discordLoading && manageableGuilds.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-zinc-400">
            Connectez un serveur Discord où vous êtes administrateur.
          </div>
        )}

        {offline && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Le serveur du bot n&apos;est pas joignable depuis cet environnement. Réglages indicatifs ; utilise <code className="rounded bg-black/30 px-1">/birthday config</code> sur Discord.</span>
          </div>
        )}

        {selectedGuild && (
          <>
            {overview && (overview.today.length > 0 || overview.upcoming.length > 0 || overview.total > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <p className="text-[11px] text-zinc-400">Enregistrés</p>
                  <p className="mt-1 text-lg font-bold text-white">{overview.total}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Salon d&apos;annonce</label>
                  <select
                    value={config.announceChannelId ?? ""}
                    onChange={(e) => patch("announceChannelId", e.target.value || null)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]"
                  >
                    <option value="">— Choisir —</option>
                    {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">Heure d&apos;annonce : {config.announceHour}h</label>
                  <input type="range" min={0} max={23} value={config.announceHour} onChange={(e) => patch("announceHour", Number(e.target.value))} className="mt-2 w-full accent-[#5865F2]" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">Rôle « Anniversaire » (attribué le jour J, retiré le lendemain)</label>
                <select
                  value={config.birthdayRoleId ?? ""}
                  onChange={(e) => patch("birthdayRoleId", e.target.value || null)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 [&>option]:bg-[var(--bg-surface-elevated)]"
                >
                  <option value="">— Aucun —</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-zinc-500">Le bot a besoin de la permission Gérer les rôles, et son rôle doit être au-dessus.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">Message ({config.message.length}/500)</label>
                <textarea
                  value={config.message}
                  onChange={(e) => patch("message", e.target.value.slice(0, 500))}
                  rows={2}
                  className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
                />
                <p className="mt-1 text-[10px] text-zinc-500"><code className="rounded bg-black/30 px-1">{"{user}"}</code> = mention · <code className="rounded bg-black/30 px-1">{"{age}"}</code> = âge · <code className="rounded bg-black/30 px-1">{"{date}"}</code> = jj/mm</p>
              </div>

              <Switch checked={config.mentionUser} onChange={(v) => patch("mentionUser", v)} label="Mentionner le membre (ping)" hint="Sinon, son nom en gras sans notification." />
            </div>

            {overview && overview.upcoming.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="border-b border-white/10 px-4 py-3">
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
