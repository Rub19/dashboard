"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { confirmDialog } from "@/lib/confirmDialog";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Segmented, StatTile, useGuildApi } from "../kit";

type Point = { day: string; messages: number; voiceHours: number; joins: number; leaves: number; members: number | null; activeUsers: number };
type Ranked = { id: string; value: number; name: string; avatarUrl?: string | null };
type Overview = {
  config: { enabled: boolean };
  totals: { messages: number; voiceHours: number; joins: number; leaves: number; activeUsers: number };
  series: Point[];
  memberCount: number | null;
  topMembersMessages: Ranked[];
  topMembersVoice: Ranked[];
  topChannelsMessages: Ranked[];
  topChannelsVoice: Ranked[];
};
type Row = { id: string; rank: number; name: string; avatarUrl: string | null; messages: number; voiceHours: number; score: number };
type Sort = "messages" | "voice" | "score";
type Metric = "messages" | "voiceHours" | "activeUsers";

const DAYS = [7, 30, 90, 365] as const;
const fmt = (n: number) => n.toLocaleString("fr-FR");
const METRIC: Record<Metric, string> = { messages: "Messages", voiceHours: "Heures de vocal", activeUsers: "Membres actifs" };

/** Statistiques (format Keeper) : activité du serveur sur une période, graphique, meilleurs membres et salons. */
export default function ConsoleStats({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [days, setDays] = useState<(typeof DAYS)[number]>(30);
  const [ov, setOv] = useState<Overview | null>(null);
  const [metric, setMetric] = useState<Metric>("messages");
  const [sort, setSort] = useState<Sort>("messages");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    setOv(null);
    const r = await api<Overview>(`/stats/overview?days=${days}`);
    if (r) setOv(r);
  }, [api, days]);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      api<{ rows: Row[] }>(`/stats/leaderboard?days=${days}&sort=${sort}&limit=25&q=${encodeURIComponent(q.trim())}`, { silent: true }).then((r) => setRows(r?.rows ?? []));
    }, q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [api, days, sort, q]);

  const clearData = async () => {
    if (!(await confirmDialog("Effacer toutes les statistiques collectées sur ce serveur ? C'est définitif.", { title: "Effacer les statistiques", confirmLabel: "Effacer" }))) return;
    if (await api("/stats/data", { method: "DELETE" })) void load();
  };

  const series = ov?.series ?? [];
  const max = Math.max(1, ...series.map((p) => p[metric] ?? 0));

  return (
    <ConsolePage title="Statistiques" actions={<Segmented label="Période" value={days} options={DAYS.map((d) => [d, d === 365 ? "1 an" : `${d} j`] as const)} onChange={setDays} />}>
      {ov && !ov.config.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : Etho ne collecte plus l&apos;activité. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Messages" value={ov ? fmt(ov.totals.messages) : "—"} />
        <StatTile label="Heures de vocal" value={ov ? fmt(ov.totals.voiceHours) : "—"} />
        <StatTile label="Membres actifs" value={ov ? fmt(ov.totals.activeUsers) : "—"} hint={ov?.memberCount ? `sur ${fmt(ov.memberCount)} membres` : undefined} />
        <StatTile label="Arrivées / départs" value={ov ? `+${fmt(ov.totals.joins)} / −${fmt(ov.totals.leaves)}` : "—"} />
      </motion.div>

      <Panel title="Activité" actions={<Segmented label="Mesure" value={metric} options={Object.entries(METRIC) as [Metric, string][]} onChange={setMetric} />}>
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : series.every((p) => !p[metric]) ? (
          <EmptyLine>Aucune activité enregistrée sur cette période.</EmptyLine>
        ) : (
          <div className="px-5 pb-4 pt-5">
            <div className="flex h-36 items-end gap-px" role="img" aria-label={`${METRIC[metric]} par jour`}>
              {series.map((p) => (
                <motion.div
                  key={p.day}
                  title={`${new Date(p.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${fmt(p[metric] ?? 0)}`}
                  className="min-w-0 flex-1 rounded-t-sm bg-[var(--accent-primary)]/70 hover:bg-[var(--accent-primary)]"
                  initial={{ height: 0 }}
                  animate={{ height: `${((p[metric] ?? 0) / max) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>{series[0] && new Date(series[0].day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
              <span>max {fmt(max)}</span>
              <span>{series.at(-1) && new Date(series.at(-1)!.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <TopList title="Salons les plus actifs" items={ov?.topChannelsMessages} unit="messages" prefix="#" />
        <TopList title="Salons vocaux" items={ov?.topChannelsVoice} unit="h" prefix="🔊 " />
      </div>

      <Panel
        title="Classement des membres"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher un membre"
              className="h-8 w-36 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
            />
            <Segmented
              label="Tri"
              value={sort}
              options={[
                ["messages", "Messages"],
                ["voice", "Vocal"],
                ["score", "Score"],
              ]}
              onChange={setSort}
            />
          </div>
        }
      >
        {!rows ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : rows.length === 0 ? (
          <EmptyLine>{q ? "Aucun membre trouvé." : "Aucune activité sur cette période."}</EmptyLine>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                <span className={cn("w-7 shrink-0 text-center text-xs font-bold tabular-nums", r.rank <= 3 ? "text-[var(--warning)]" : "text-[var(--text-muted)]")}>{r.rank}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.avatarUrl ? <img src={r.avatarUrl} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-[var(--panel-border)]" />}
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">{r.name}</p>
                <span className="w-20 text-right text-xs tabular-nums text-[var(--text-primary)]">{fmt(r.messages)} msg</span>
                <span className="w-16 text-right text-xs tabular-nums text-[var(--text-muted)]">{fmt(r.voiceHours)} h</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Données">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5">
          <p className="text-[11px] text-[var(--text-muted)]">Supprime tout l&apos;historique d&apos;activité de ce serveur (messages, vocal, arrivées).</p>
          <GhostButton onClick={clearData}>Effacer les statistiques</GhostButton>
        </div>
      </Panel>
    </ConsolePage>
  );
}

function TopList({ title, items, unit, prefix }: { title: string; items?: Ranked[]; unit: string; prefix: string }) {
  const top = Math.max(1, ...(items ?? []).map((i) => i.value));
  return (
    <Panel title={title}>
      {!items ? (
        <EmptyLine>Chargement…</EmptyLine>
      ) : items.length === 0 ? (
        <EmptyLine>Rien sur cette période.</EmptyLine>
      ) : (
        <ul className="space-y-2 px-5 py-4">
          {items.slice(0, 6).map((i) => (
            <li key={i.id}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate text-[var(--text-primary)]">
                  {prefix}
                  {i.name}
                </span>
                <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                  {fmt(i.value)} {unit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]">
                <motion.div className="h-full rounded-full bg-[var(--accent-primary)]" initial={{ width: 0 }} animate={{ width: `${(i.value / top) * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
