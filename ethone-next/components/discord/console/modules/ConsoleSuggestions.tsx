"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Switch, useGuildApi } from "../kit";

type Status = "pending" | "under_review" | "planned" | "accepted" | "in_progress" | "completed" | "rejected" | "duplicate" | "on_hold";
type Suggestion = { id: string; numericId: number; title: string; description: string; authorTag: string; category: string; status: Status; upvotesCount: number; downvotesCount: number; score: number; comments: unknown[]; staffResponse: string | null; createdAt: string };
type Config = { channelId: string | null; autoThread: boolean; dmNotifications: boolean };
type Overview = { pendingCount: number; underReviewCount: number; acceptedCount: number; completedCount: number; rejectedCount: number; totalVotes: number };

const STATUS: Record<Status, string> = {
  pending: "En attente",
  under_review: "À l'étude",
  planned: "Prévue",
  accepted: "Acceptée",
  in_progress: "En cours",
  completed: "Réalisée",
  rejected: "Refusée",
  duplicate: "Doublon",
  on_hold: "En pause",
};
const DECISIONS: Status[] = ["under_review", "accepted", "in_progress", "completed", "rejected"];
const FILTERS = {
  todo: (s: Status) => s === "pending" || s === "under_review" || s === "on_hold",
  yes: (s: Status) => s === "planned" || s === "accepted" || s === "in_progress" || s === "completed",
  no: (s: Status) => s === "rejected" || s === "duplicate",
  all: () => true,
};

/** Suggestions (format Keeper) : où elles arrivent, et traitement des idées avec réponse officielle. */
export default function ConsoleSuggestions({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [list, setList] = useState<Suggestion[] | null>(null);
  const [filter, setFilter] = useState<keyof typeof FILTERS>("todo");
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, l] = await Promise.all([api<Overview>("/suggestions/overview", { silent: true }), api<{ suggestions: Suggestion[] }>("/suggestions/list")]);
    if (o) setOv(o);
    setList(l?.suggestions ?? []);
  }, [api]);
  useEffect(() => {
    void load();
    api<Config>("/suggestions/config/settings").then((r) => r && setCfg(r));
  }, [api, load]);

  const saveCfg = async (patch: Partial<Config>) => {
    if (cfg) setCfg({ ...cfg, ...patch });
    const r = await api<{ config: Config }>("/suggestions/config/settings", { method: "PUT", json: patch });
    if (r) setCfg(r.config);
  };

  const toggle = (s: Suggestion) => {
    setOpen(open === s.id ? null : s.id);
    setReply(s.staffResponse ?? "");
  };
  const decide = async (s: Suggestion, status: Status) => {
    setBusy(true);
    const r = await api<{ suggestion: Suggestion }>(`/suggestions/${s.id}/status`, { method: "POST", json: { status, staffResponse: reply.trim() || undefined } });
    setBusy(false);
    if (r) {
      setList((l) => l?.map((x) => (x.id === s.id ? r.suggestion : x)) ?? null);
      setOpen(null);
      api<Overview>("/suggestions/overview", { silent: true }).then((o) => o && setOv(o));
    }
  };
  const remove = async (s: Suggestion) => {
    if (!(await confirmDialog(`Supprimer la suggestion #${s.numericId} « ${s.title} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    const r = await api(`/suggestions/${s.id}`, { method: "DELETE" });
    if (r) setList((l) => l?.filter((x) => x.id !== s.id) ?? null);
  };

  const shown = (list ?? []).filter((s) => FILTERS[filter](s.status)).sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));

  return (
    <ConsolePage title="Suggestions">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="À traiter" value={ov ? ov.pendingCount + ov.underReviewCount : "—"} />
        <StatTile label="Acceptées" value={ov ? ov.acceptedCount + ov.completedCount : "—"} />
        <StatTile label="Refusées" value={ov?.rejectedCount ?? "—"} />
        <StatTile label="Votes" value={ov?.totalVotes ?? "—"} />
      </motion.div>

      <Panel title="Réglages">
        {!cfg ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Salon des suggestions" hint="Où /suggest publie les idées, avec les boutons de vote.">
              <ChannelPicker guildId={guildId} value={cfg.channelId ?? ""} filterTypes={[0, 5, 15]} allowClear={false} placeholder="Choisir un salon" onChange={(id) => saveCfg({ channelId: id })} />
            </Row>
            <Row label="Fil de discussion" hint="Un fil s'ouvre sous chaque suggestion.">
              <Switch checked={cfg.autoThread} onChange={(v) => saveCfg({ autoThread: v })} label="Fil de discussion" />
            </Row>
            <Row label="Prévenir l'auteur" hint="Message privé quand le statut change.">
              <Switch checked={cfg.dmNotifications} onChange={(v) => saveCfg({ dmNotifications: v })} label="Prévenir l'auteur" />
            </Row>
          </>
        )}
      </Panel>

      <Panel
        title="Idées"
        actions={
          <Segmented
            label="Filtre"
            value={filter}
            options={[
              ["todo", "À traiter"],
              ["yes", "Acceptées"],
              ["no", "Refusées"],
              ["all", "Toutes"],
            ]}
            onChange={setFilter}
          />
        }
      >
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : shown.length === 0 ? (
          <EmptyLine>{list.length === 0 ? "Aucune suggestion pour l'instant." : "Rien dans cette liste."}</EmptyLine>
        ) : (
          <ul>
            {shown.map((s) => (
              <li key={s.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <button type="button" onClick={() => toggle(s)} aria-expanded={open === s.id} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]">
                  <span className="w-12 shrink-0 text-center text-xs font-semibold tabular-nums">
                    <span className="text-[var(--success)]">+{s.upvotesCount}</span> <span className="text-[var(--danger)]">−{s.downvotesCount}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                      <span className="font-mono font-normal text-[var(--text-muted)]">#{s.numericId}</span> {s.title}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {STATUS[s.status]} · {s.authorTag} · {s.category} · {sinceLabel(s.createdAt)}
                    </p>
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open === s.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="space-y-3 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 px-5 py-4">
                        <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{s.description}</p>
                        <textarea
                          value={reply}
                          maxLength={1000}
                          rows={2}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Réponse officielle (facultatif), affichée sous la suggestion"
                          className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          {DECISIONS.map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={busy}
                              onClick={() => decide(s, st)}
                              className={cn(
                                "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                                s.status === st ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              )}
                            >
                              {STATUS[st]}
                            </button>
                          ))}
                          <span className="flex-1" />
                          <GhostButton onClick={() => remove(s)}>Supprimer</GhostButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
