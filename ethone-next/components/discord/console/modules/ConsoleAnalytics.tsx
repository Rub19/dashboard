"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ConsolePage, EmptyLine, Panel, Segmented, StatTile, useGuildApi } from "../kit";

type Period = "24h" | "7d" | "30d" | "90d";
type Kpi = { label: string; current: number; previous: number; percentageChange: number; trend: "up" | "down" | "neutral"; unit?: string };
type Overview = {
  kpis: Record<"members" | "activeUsers" | "messages" | "commands" | "voiceHours" | "moderationActions" | "tickets" | "securityIncidents", Kpi>;
  insights: { id: string; text: string; trend: "positive" | "warning" | "neutral" }[];
  retentionRate: number | null;
  peakHeatmap: { day: number; hour: number; value: number }[];
  topCommands: { command: string; count: number; percentage: number }[];
  moderationBreakdown: Record<string, number>;
};

const KPIS: [keyof Overview["kpis"], string][] = [
  ["messages", "Messages"],
  ["activeUsers", "Membres actifs"],
  ["commands", "Commandes"],
  ["voiceHours", "Heures de vocal"],
  ["members", "Membres"],
  ["moderationActions", "Sanctions"],
  ["tickets", "Tickets"],
  ["securityIncidents", "Incidents"],
];
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Analytics (format Keeper) : évolution par rapport à la période précédente, heures d'activité, commandes et modération. */
export default function ConsoleAnalytics({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [period, setPeriod] = useState<Period>("7d");
  const [ov, setOv] = useState<Overview | null>(null);

  useEffect(() => {
    setOv(null);
    api<Overview>(`/analytics/overview?period=${period}`).then((r) => r && setOv(r));
  }, [api, period]);

  const heat = new Map((ov?.peakHeatmap ?? []).map((c) => [`${c.day}-${c.hour}`, c.value]));
  const heatMax = Math.max(1, ...(ov?.peakHeatmap ?? []).map((c) => c.value));
  const mod = Object.entries(ov?.moderationBreakdown ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const exportUrl = (format: "csv" | "json") => `${BOT_API_URL}/api/guilds/${guildId}/analytics/export?period=${period}&format=${format}`;

  return (
    <ConsolePage
      title="Analytics"
      actions={
        <Segmented
          label="Période"
          value={period}
          options={[
            ["24h", "24 h"],
            ["7d", "7 j"],
            ["30d", "30 j"],
            ["90d", "90 j"],
          ]}
          onChange={setPeriod}
        />
      }
    >
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map(([key, label]) => {
          const k = ov?.kpis[key];
          return (
            <StatTile
              key={key}
              label={label}
              value={k ? fmt(k.current) : "—"}
              hint={
                k ? (
                  <span className={cn(k.trend === "up" && "text-[var(--success)]", k.trend === "down" && "text-[var(--danger)]")}>
                    {k.trend === "neutral" ? "stable" : `${k.percentageChange > 0 ? "+" : ""}${k.percentageChange} %`} vs période précédente
                  </span>
                ) : undefined
              }
            />
          );
        })}
      </motion.div>

      {ov && ov.insights.length > 0 && (
        <Panel title="À retenir">
          <ul>
            {ov.insights.map((i) => (
              <li key={i.id} className="flex items-start gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    i.trend === "positive" ? "bg-[var(--success)]" : i.trend === "warning" ? "bg-[var(--warning)]" : "bg-[var(--text-muted)]"
                  )}
                />
                <p className="text-xs text-[var(--text-primary)]">{i.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Heures d'activité" subtitle={ov?.retentionRate != null ? `${ov.retentionRate} % des membres actifs de la période précédente le sont encore.` : undefined}>
        {!ov ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : ov.peakHeatmap.every((c) => !c.value) ? (
          <EmptyLine>Pas encore assez d&apos;activité enregistrée.</EmptyLine>
        ) : (
          <div className="overflow-x-auto px-5 py-4">
            <div className="grid min-w-[36rem] grid-cols-[2.5rem_repeat(24,1fr)] gap-0.5 text-[9px] text-[var(--text-muted)]">
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="text-center">
                  {h % 3 === 0 ? `${h}h` : ""}
                </span>
              ))}
              {ORDER.map((d) => (
                <div key={d} className="contents">
                  <span className="pr-1 text-right leading-4">{DAYS[d]}</span>
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = heat.get(`${d}-${h}`) ?? 0;
                    return (
                      <span
                        key={h}
                        title={`${DAYS[d]} ${h} h : ${fmt(v)} messages`}
                        className="h-4 rounded-sm"
                        style={{ background: v ? `color-mix(in srgb, var(--accent-primary) ${Math.round(15 + (v / heatMax) * 85)}%, transparent)` : "var(--panel-border)" }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Commandes les plus utilisées">
          {!ov ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : ov.topCommands.length === 0 ? (
            <EmptyLine>Aucune commande sur cette période.</EmptyLine>
          ) : (
            <ul className="space-y-2 px-5 py-4">
              {ov.topCommands.slice(0, 8).map((c) => (
                <li key={c.command}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-[var(--text-primary)]">/{c.command}</span>
                    <span className="shrink-0 tabular-nums text-[var(--text-muted)]">{fmt(c.count)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]">
                    <motion.div className="h-full rounded-full bg-[var(--accent-primary)]" initial={{ width: 0 }} animate={{ width: `${c.percentage}%` }} transition={{ duration: 0.4 }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Sanctions par type">
          {!ov ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : mod.length === 0 ? (
            <EmptyLine>Aucune sanction sur cette période.</EmptyLine>
          ) : (
            <ul>
              {mod.map(([type, n]) => (
                <li key={type} className="flex justify-between border-t border-[var(--panel-border)] px-5 py-2 text-xs first:border-t-0">
                  <span className="text-[var(--text-primary)]">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                  <span className="tabular-nums text-[var(--text-muted)]">{fmt(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Exporter">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <p className="text-[11px] text-[var(--text-muted)]">Données de la période choisie, jour par jour.</p>
          <div className="flex gap-2">
            {(["csv", "json"] as const).map((f) => (
              <a key={f} href={exportUrl(f)} className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                {f.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </Panel>
    </ConsolePage>
  );
}
