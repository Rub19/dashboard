"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, X } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { subscribeGuildLive } from "@/lib/guildLive";
import { confirmDialog } from "@/lib/confirmDialog";
import { EthoneIcon } from "@/components/EthoneIcon";
import AnalyticsBarChart from "@/components/charts/AnalyticsBarChart";
import AnalyticsLineChart from "@/components/charts/AnalyticsLineChart";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const PERIODS = [7, 30, 60, 90, 180, 365];

interface Ranked {
  id: string;
  value: number;
  name: string;
  avatarUrl?: string | null;
}
interface SeriesPoint {
  day: string;
  messages: number;
  voiceHours: number;
  joins: number;
  leaves: number;
  members: number | null;
  activeUsers: number;
}
interface Overview {
  config: { enabled: boolean; startedAt: string | null };
  days: number;
  totals: { messages: number; voiceHours: number; joins: number; leaves: number; activeUsers: number };
  series: SeriesPoint[];
  voiceSessionsNow: number;
  memberCount: number | null;
  topMembersMessages: Ranked[];
  topMembersVoice: Ranked[];
  topChannelsMessages: Ranked[];
  topChannelsVoice: Ranked[];
}
interface MemberDetail {
  member: { id: string; name: string; avatarUrl: string | null; joinedAt: string | null; createdAt: string | null };
  windows: Record<"1" | "7" | "60", { messages: number; voiceHours: number }>;
  rank: { messages: number | null; voice: number | null };
  topChannels: Ranked[];
  topVoiceChannels: Ranked[];
  series: Array<{ day: string; messages: number; voiceHours: number }>;
}

const shortDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
};
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—");

function Card({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function RankList({ rows, unit, isMember, onPick }: { rows: Ranked[]; unit: string; isMember?: boolean; onPick?: (id: string) => void }) {
  if (rows.length === 0) return <p className="py-6 text-center text-xs text-zinc-500">Aucune donnée sur cette période.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => {
        const Row = isMember && onPick ? "button" : "div";
        return (
          <li key={r.id}>
            <Row
              {...(isMember && onPick ? { type: "button" as const, onClick: () => onPick(r.id) } : {})}
              className={cn("relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-white/[0.03] px-3 py-2 text-left text-xs", isMember && onPick && "cursor-pointer transition hover:bg-white/[0.07]")}
            >
              <span aria-hidden className="absolute inset-y-0 left-0 bg-indigo-400/10" style={{ width: `${(r.value / max) * 100}%` }} />
              <span className="relative w-5 shrink-0 text-center font-bold text-zinc-500">{i + 1}</span>
              {isMember && (
                // eslint-disable-next-line @next/next/no-img-element
                r.avatarUrl ? <img src={r.avatarUrl} alt="" className="relative h-6 w-6 shrink-0 rounded-full" /> : <span className="relative h-6 w-6 shrink-0 rounded-full bg-white/10" />
              )}
              <span className="relative min-w-0 flex-1 truncate text-zinc-200">{isMember ? r.name : `# ${r.name}`}</span>
              <span className="relative shrink-0 tabular-nums font-semibold text-white">
                {fmt(r.value)} <span className="font-normal text-zinc-500">{unit}</span>
              </span>
            </Row>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Statistiques d'activité façon Statbot : messages et vocal par jour, évolution des membres, classements des membres et des
 * salons, fiche par membre. Toutes les données viennent du bot ; s'il ne répond pas, la page le dit.
 */
export default function StatsCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [board, setBoard] = useState<"messages" | "voice">("messages");
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/stats`;

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setState(BOT_API_URL ? "loading" : "offline");
      return;
    }
    try {
      const res = await fetch(`${base}/overview?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      setOverview((await res.json()) as Overview);
      setState("ok");
    } catch {
      setState("offline");
    }
  }, [guildId, base, days]);

  useEffect(() => {
    void load();
  }, [load]);

  // Actualisation automatique (les chiffres bougent en continu) + changements de configuration venus de Discord
  useEffect(() => {
    if (!guildId) return;
    const timer = setInterval(() => void load(), 60_000);
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeGuildLive(guildId, (event) => {
      if (event.type !== "CONFIG_UPDATED") return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void load(), 300);
    });
    return () => {
      clearInterval(timer);
      if (debounce) clearTimeout(debounce);
      unsubscribe();
    };
  }, [guildId, load]);

  const setEnabled = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${base}/config`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      if (!res.ok) throw new Error(String(res.status));
      success(enabled ? "Statistiques activées" : "Statistiques désactivées", enabled ? "Les données se collectent à partir de maintenant." : "La collecte est arrêtée ; l'historique est conservé.");
      await load();
    } catch {
      showError("Réglage non enregistré", "Le bot n'a pas répondu ou a refusé le changement.");
    } finally {
      setSaving(false);
    }
  };

  const clearData = async () => {
    if (!(await confirmDialog("Effacer toutes les statistiques de ce serveur ? L'historique (messages, vocal, membres) sera supprimé définitivement.", { title: "Effacer les statistiques", confirmLabel: "Tout effacer", tone: "danger" }))) return;
    setSaving(true);
    try {
      const res = await fetch(`${base}/data`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      success("Statistiques effacées", "L'historique de ce serveur a été supprimé.");
      await load();
    } catch {
      showError("Statistiques non effacées", "Le bot n'a pas répondu ou a refusé.");
    } finally {
      setSaving(false);
    }
  };

  const openMember = async (id: string) => {
    setMemberLoading(true);
    setMember(null);
    try {
      const res = await fetch(`${base}/member/${encodeURIComponent(id)}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      setMember((await res.json()) as MemberDetail);
    } catch {
      showError("Fiche indisponible", "Le bot n'a pas répondu.");
    } finally {
      setMemberLoading(false);
    }
  };

  const ov = overview;
  const enabled = ov?.config.enabled ?? false;
  const series = ov?.series ?? [];
  const messagesData = series.map((p) => ({ label: shortDay(p.day), value: p.messages }));
  const voiceData = series.map((p) => ({ label: shortDay(p.day), value: p.voiceHours }));
  const membersData = series.filter((p) => p.members !== null).map((p) => ({ label: shortDay(p.day), value: p.members as number }));
  const joinsData = series.map((p) => ({ label: shortDay(p.day), value: p.joins }));
  const leavesData = series.map((p) => ({ label: shortDay(p.day), value: p.leaves }));

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-44 text-white sm:p-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au hub Discord
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[var(--panel-border)] p-0.5">
              {PERIODS.map((p) => (
                <button key={p} type="button" onClick={() => setDays(p)} className={cn("cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition", days === p ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}>
                  {p} j
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void load()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05]">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </button>
          </div>
        </div>

        <header className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--panel-border)] bg-white/[0.03]">
            <EthoneIcon name="mod-stats" className="h-6 w-6 text-sky-300" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Statistiques</h1>
            <p className="mt-0.5 text-xs text-zinc-400">Messages et vocal par jour, évolution des membres, classements. Jours en UTC.</p>
          </div>
        </header>

        {state === "loading" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-500">Chargement…</div>}
        {state === "offline" && (
          <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-400">
            Le bot n&apos;a pas répondu pour ce serveur : les statistiques ne peuvent pas être affichées. Vérifiez que le bot est présent, puis actualisez.
          </div>
        )}

        {state === "ok" && ov && (
          <>
            <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", enabled ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-amber-500/25 bg-amber-500/[0.06]")}>
              <p className="text-xs leading-relaxed text-zinc-200">
                {enabled ? (
                  <>
                    Collecte <strong>active</strong>
                    {ov.config.startedAt ? <> depuis le {dateFr(ov.config.startedAt)}</> : null}. {ov.voiceSessionsNow} membre(s) en vocal en ce moment. Les commandes Discord : <code className="rounded bg-black/30 px-1">/stats server</code>, <code className="rounded bg-black/30 px-1">/stats member</code>, <code className="rounded bg-black/30 px-1">/stats top</code>.
                  </>
                ) : (
                  <>
                    Le module est <strong>désactivé</strong> (réglage par défaut) : aucune donnée n&apos;est collectée. Une fois activé, les statistiques se remplissent à partir de ce moment.
                  </>
                )}
              </p>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={saving} onClick={() => void setEnabled(!enabled)} className="cursor-pointer rounded-xl bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50">
                  {enabled ? "Désactiver" : "Activer la collecte"}
                </button>
                <button type="button" disabled={saving} onClick={() => void clearData()} className="cursor-pointer rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
                  Effacer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Messages" value={fmt(ov.totals.messages)} hint={`${days} derniers jours`} />
              <Kpi label="Vocal" value={`${fmt(ov.totals.voiceHours)} h`} hint={`${days} derniers jours`} />
              <Kpi label="Membres actifs" value={fmt(ov.totals.activeUsers)} hint="au moins un message ou du vocal" />
              <Kpi label="Arrivées / départs" value={`+${ov.totals.joins} / −${ov.totals.leaves}`} hint={`solde ${ov.totals.joins - ov.totals.leaves >= 0 ? "+" : ""}${ov.totals.joins - ov.totals.leaves}`} />
              <Kpi label="Membres" value={ov.memberCount !== null ? fmt(ov.memberCount) : "—"} hint="actuellement" />
            </div>

            <Card title="Messages" hint="Nombre de messages par jour (bots exclus)">
              <AnalyticsBarChart data={messagesData} height={240} color="#5aa9f6" valueSuffix=" messages" />
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Activité vocale" hint="Heures passées en vocal par jour (salon AFK exclu)">
                <AnalyticsBarChart data={voiceData} height={200} color="#f0559a" valueSuffix=" h" />
              </Card>
              <Card title="Évolution des membres" hint="Nombre de membres au fil des jours">
                <AnalyticsLineChart data={membersData} height={200} color="#3fd28a" />
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Arrivées" hint="Nouveaux membres par jour">
                <AnalyticsBarChart data={joinsData} height={150} color="#34d399" />
              </Card>
              <Card title="Départs" hint="Membres partis par jour">
                <AnalyticsBarChart data={leavesData} height={150} color="#fb7185" />
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Top membres" hint="Cliquez sur un membre pour ouvrir sa fiche">
                <div className="mb-3 inline-flex rounded-xl border border-[var(--panel-border)] p-0.5">
                  {(["messages", "voice"] as const).map((b) => (
                    <button key={b} type="button" onClick={() => setBoard(b)} className={cn("cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition", board === b ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}>
                      {b === "messages" ? "Messages" : "Vocal"}
                    </button>
                  ))}
                </div>
                <RankList rows={board === "messages" ? ov.topMembersMessages : ov.topMembersVoice} unit={board === "messages" ? "msg" : "h"} isMember onPick={(id) => void openMember(id)} />
              </Card>
              <Card title="Top salons" hint={board === "messages" ? "Salons textuels les plus actifs" : "Salons vocaux les plus fréquentés"}>
                <RankList rows={board === "messages" ? ov.topChannelsMessages : ov.topChannelsVoice} unit={board === "messages" ? "msg" : "h"} />
              </Card>
            </div>
          </>
        )}
      </div>

      {(member || memberLoading) && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setMember(null)} role="dialog" aria-modal="true" aria-label="Fiche membre">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6" onClick={(e) => e.stopPropagation()}>
            {memberLoading && !member && <p className="py-10 text-center text-sm text-zinc-400">Chargement de la fiche…</p>}
            {member && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {member.member.avatarUrl ? <img src={member.member.avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full ring-2 ring-sky-400/60" /> : <span className="h-16 w-16 shrink-0 rounded-full bg-white/10" />}
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">{member.member.name}</h3>
                      <p className="text-[11px] text-zinc-400">Compte créé le {dateFr(member.member.createdAt)} · Arrivé le {dateFr(member.member.joinedAt)}</p>
                    </div>
                  </div>
                  <button type="button" aria-label="Fermer" onClick={() => setMember(null)} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
                    <p className="text-[11px] font-semibold text-zinc-400">Rangs (60 jours)</p>
                    <p className="mt-2 text-sm text-zinc-300">Messages <strong className="float-right text-amber-300">{member.rank.messages ? `#${member.rank.messages}` : "—"}</strong></p>
                    <p className="mt-1 text-sm text-zinc-300">Vocal <strong className="float-right text-amber-300">{member.rank.voice ? `#${member.rank.voice}` : "—"}</strong></p>
                  </div>
                  {(["messages", "voiceHours"] as const).map((k) => (
                    <div key={k} className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
                      <p className="text-[11px] font-semibold text-zinc-400">{k === "messages" ? "Messages" : "Vocal"}</p>
                      {(["1", "7", "60"] as const).map((w) => (
                        <p key={w} className="mt-1 text-sm text-zinc-300">
                          {w} j <strong className="float-right text-white">{k === "messages" ? fmt(member.windows[w].messages) : `${fmt(member.windows[w].voiceHours)} h`}</strong>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-zinc-400">Messages — 60 jours</p>
                    <AnalyticsBarChart data={member.series.map((p) => ({ label: shortDay(p.day), value: p.messages }))} height={130} color="#3fd28a" />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-zinc-400">Vocal — 60 jours</p>
                    <AnalyticsBarChart data={member.series.map((p) => ({ label: shortDay(p.day), value: p.voiceHours }))} height={130} color="#f0559a" valueSuffix=" h" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold text-zinc-400">Salons textuels préférés</p>
                    <RankList rows={member.topChannels} unit="msg" />
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold text-zinc-400">Salons vocaux préférés</p>
                    <RankList rows={member.topVoiceChannels} unit="h" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
