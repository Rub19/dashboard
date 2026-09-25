"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PAGE = 25;

interface Row {
  rank: number;
  id: string;
  name: string;
  avatarUrl: string | null;
  messages: number;
  voiceHours: number;
  messageShare: number;
  voiceShare: number;
  activeDays: number;
}
interface Board {
  sort: string;
  total: number;
  totals: { messages: number; voiceHours: number; members: number };
  rows: Row[];
}

const SORTS: Array<["messages" | "voice" | "active", string]> = [
  ["messages", "Messages"],
  ["voice", "Vocal"],
  ["active", "Jours actifs"],
];
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
const MEDALS = ["🥇", "🥈", "🥉"];

/** Classement complet des membres : tri, recherche par nom, pagination, parts du serveur. Un clic ouvre la fiche du membre. */
export default function StatsMembersBoard({ base, days, refreshKey, onPick }: { base: string; days: number; refreshKey: number; onPick: (id: string) => void }) {
  const [sort, setSort] = useState<"messages" | "voice" | "active">("messages");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<Board["totals"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const res = await fetch(`${base}/leaderboard?days=${days}&sort=${sort}&q=${encodeURIComponent(query)}&limit=${PAGE}&offset=${offset}`, { credentials: "include" });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Board;
        setRows((prev) => (offset === 0 ? json.rows : [...prev, ...json.rows]));
        setTotal(json.total);
        setTotals(json.totals);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [base, days, sort, query]
  );

  useEffect(() => {
    void load(0);
  }, [load, refreshKey]);

  const maxMsg = Math.max(1, ...rows.map((r) => r.messages));
  const maxVoice = Math.max(1, ...rows.map((r) => r.voiceHours));

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Classement des membres</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {totals ? `${fmt(totals.members)} membre(s) actif(s) · ${fmt(totals.messages)} messages · ${fmt(totals.voiceHours)} h de vocal sur ${days} jours` : "Sur la période choisie"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[var(--panel-border)] p-0.5">
            {SORTS.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setSort(k)} className={cn("cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition", sort === k ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white")}>
                {l}
              </button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un membre…" aria-label="Rechercher un membre" className="h-9 w-48 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] px-3 text-xs text-white outline-none focus:border-[#5865F2]/70" />
        </div>
      </div>

      {failed ? (
        <p className="py-10 text-center text-xs text-zinc-400">Le bot n&apos;a pas répondu : le classement est indisponible.</p>
      ) : rows.length === 0 && !loading ? (
        <p className="py-10 text-center text-xs text-zinc-500">{query ? "Aucun membre ne correspond à cette recherche." : "Aucune activité enregistrée sur cette période."}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[11px] text-zinc-500">
              <tr>
                <th className="w-10 pb-2 font-semibold">#</th>
                <th className="pb-2 font-semibold">Membre</th>
                <th className="pb-2 font-semibold">Messages</th>
                <th className="pb-2 font-semibold">Vocal</th>
                <th className="pb-2 text-right font-semibold">Jours actifs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => onPick(r.id)} className="cursor-pointer transition hover:bg-white/[0.04]">
                  <td className="py-2 pr-2 font-bold text-zinc-400">{MEDALS[r.rank - 1] ?? r.rank}</td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2.5">
                      {r.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full" />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
                      )}
                      <span className="max-w-[180px] truncate text-sm font-semibold text-white">{r.name}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="w-14 shrink-0 tabular-nums font-semibold text-white">{fmt(r.messages)}</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-sky-400/80" style={{ width: `${(r.messages / maxMsg) * 100}%` }} />
                      </span>
                      <span className="text-[11px] text-zinc-500">{r.messageShare}%</span>
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="w-14 shrink-0 tabular-nums font-semibold text-white">{fmt(r.voiceHours)} h</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-pink-400/80" style={{ width: `${(r.voiceHours / maxVoice) * 100}%` }} />
                      </span>
                      <span className="text-[11px] text-zinc-500">{r.voiceShare}%</span>
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-300">{r.activeDays} j</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{rows.length > 0 ? `${rows.length} sur ${fmt(total)} affiché(s)` : loading ? "Chargement…" : ""}</span>
        {rows.length < total && (
          <button type="button" disabled={loading} onClick={() => void load(rows.length)} className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.05] disabled:opacity-50">
            {loading ? "Chargement…" : "Voir plus"}
          </button>
        )}
      </div>
    </section>
  );
}
