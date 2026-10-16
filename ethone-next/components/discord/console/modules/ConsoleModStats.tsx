"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, Panel, Segmented, StatTile, useGuildApi } from "../kit";
import { PageTitle } from "../sanctions/shared";

type Stats = {
  days: number;
  total: number;
  automatic: number;
  reportsOpen: number;
  appealsPending: number;
  perDay: Array<{ day: string; count: number }>;
  byType: Array<{ action: string; label: string; count: number }>;
  moderators: Array<{ id: string; tag: string; count: number }>;
  members: Array<{ id: string; tag: string; count: number }>;
};

function Bars({ rows }: { rows: Array<{ id: string; label: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2 p-5">
      {rows.map((r, i) => (
        <li key={r.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="truncate text-[var(--text-primary)]">{r.label}</span>
            <span className="font-mono tabular-nums text-[var(--text-muted)]">{r.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(r.count / max) * 100}%` }} transition={{ delay: i * 0.04, type: "spring", stiffness: 140, damping: 22 }} className="h-full rounded-full bg-[var(--success)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Statistiques de modération (format Keeper) : qui sanctionne quoi, ce qui revient le plus, qui est le plus sanctionné. */
export default function ConsoleModStats({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    setS(null);
    api<Stats>(`/sanctions/stats?days=${days}`).then((r) => r && setS(r));
  }, [api, days]);
  const max = s ? Math.max(1, ...s.perDay.map((d) => d.count)) : 1;

  return (
    <ConsolePage
      title={<PageTitle title="Statistiques" text="Qui sanctionne quoi, ce qui revient le plus, qui est le plus sanctionné." />}
      actions={
        <Segmented
          label="Période"
          value={days}
          options={[
            [7, "7 jours"],
            [30, "30 jours"],
            [90, "90 jours"],
          ]}
          onChange={setDays}
        />
      }
    >
      <motion.div key={days} variants={pageStagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sanctions" value={s?.total ?? "—"} />
        <StatTile label="Automatiques" value={s?.automatic ?? "—"} />
        <StatTile label="Signalements en cours" value={s?.reportsOpen ?? "—"} />
        <StatTile label="Appels en attente" value={s?.appealsPending ?? "—"} />
      </motion.div>

      <Panel title="Par jour">
        {!s ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <div className="flex h-40 items-end gap-1 px-5 pb-4 pt-6">
            {s.perDay.map((d, i) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
                  transition={{ delay: i * (0.3 / s.perDay.length), type: "spring", stiffness: 160, damping: 22 }}
                  className="w-full rounded-t bg-[var(--success)]/80 group-hover:bg-[var(--success)]"
                />
                <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                  {new Date(d.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {d.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-2">
        <Panel title="Par type">{!s ? <EmptyLine>Chargement…</EmptyLine> : s.byType.length === 0 ? <EmptyLine>Aucune sanction sur la période.</EmptyLine> : <Bars rows={s.byType.map((t) => ({ id: t.action, label: t.label, count: t.count }))} />}</Panel>
        <Panel title="Modérateurs">{!s ? <EmptyLine>Chargement…</EmptyLine> : s.moderators.length === 0 ? <EmptyLine>Aucune sanction manuelle.</EmptyLine> : <Bars rows={s.moderators.map((m) => ({ id: m.id, label: m.tag, count: m.count }))} />}</Panel>
      </div>

      <Panel title="Membres les plus sanctionnés">{!s ? <EmptyLine>Chargement…</EmptyLine> : s.members.length === 0 ? <EmptyLine>Personne sur la période.</EmptyLine> : <Bars rows={s.members.map((m) => ({ id: m.id, label: m.tag, count: m.count }))} />}</Panel>
    </ConsolePage>
  );
}
