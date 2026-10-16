"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2 } from "@/components/icons/ph";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";
import AdvancedPollForm from "./AdvancedPollForm";
import PollInsights from "./PollInsights";
import { tx } from "@/lib/tx";

type Status = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED";
type Option = { id: string; label: string; emoji?: string; votesCount: number };
type Poll = { panelConfig?: { channelId?: string; messageId?: string }; id: string; native?: boolean; title: string; status: Status; type: string; questions: { title: string; options: Option[] }[]; endsAt?: string; createdAt: string; updatedAt: string; creatorTag?: string; anonymity?: string };

const STATUS: Record<Status, string> = { DRAFT: "Brouillon", SCHEDULED: "Programmé", ACTIVE: "En cours", PAUSED: "En pause", ENDED: "Terminé", ARCHIVED: "Archivé" };
const FILTERS = {
  live: (s: Status) => s === "ACTIVE" || s === "PAUSED" || s === "SCHEDULED",
  ended: (s: Status) => s === "ENDED" || s === "ARCHIVED",
  draft: (s: Status) => s === "DRAFT",
  all: () => true,
};
const MAX_ANSWERS = 10;
const input =
  "h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

const votesOf = (p: Poll) => (p.questions[0]?.options ?? []).reduce((n, o) => n + (o.votesCount || 0), 0);
const durationLabel = (h: number) => (h % 24 === 0 ? `${h / 24} j` : `${h} h`);

/** Sondages (format Keeper) : sondage Discord en quelques secondes, suivi des votes et clôture. */
export default function ConsolePolls({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [filter, setFilter] = useState<keyof typeof FILTERS>("live");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"discord" | "advanced">("discord");

  // Brouillon du sondage rapide (sondage natif Discord).
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState(["", ""]);
  const [hours, setHours] = useState(24);
  const [multi, setMulti] = useState(false);
  const [channelId, setChannelId] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ polls: Poll[] }>("/polls");
    setPolls(r?.polls ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const replace = (p: Poll | undefined) => p && setPolls((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? null);
  const action = async (p: Poll, path: string, json?: unknown) => {
    setBusy(true);
    const r = await api<{ poll?: Poll }>(`/polls/${p.id}/${path}`, { method: "POST", json });
    setBusy(false);
    if (r?.poll) replace(r.poll);
    else if (r) void load();
  };
  const remove = async (p: Poll) => {
    if (!(await confirmDialog(tx("Supprimer le sondage « {title} » et ses votes ?", { title: p.title }), { title: tx("Supprimer"), confirmLabel: tx("Supprimer") }))) return;
    if (await api(`/polls/${p.id}`, { method: "DELETE" })) setPolls((l) => l?.filter((x) => x.id !== p.id) ?? null);
  };

  const cleanAnswers = answers.map((a) => a.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && cleanAnswers.length >= 2 && !!channelId && !busy;
  const create = async () => {
    setBusy(true);
    const r = await api<{ poll: Poll }>("/polls", {
      method: "POST",
      json: { native: true, channelId, durationHours: hours, allowMultiselect: multi, questions: [{ title: question.trim(), options: cleanAnswers.map((label) => ({ label })) }] },
    });
    setBusy(false);
    if (r?.poll) {
      setPolls((l) => [r.poll, ...(l ?? [])]);
      setQuestion("");
      setAnswers(["", ""]);
      setFilter("live");
    }
  };

  const all = polls ?? [];
  const shown = all.filter((p) => FILTERS[filter](p.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const live = all.filter((p) => p.status === "ACTIVE").length;
  const totalVotes = all.reduce((n, p) => n + votesOf(p), 0);

  return (
    <ConsolePage
      title={tx("Sondages")}
      actions={
        <Segmented
          label={tx("Type de sondage")}
          value={mode}
          options={[
            ["discord", "Sondage Discord"],
            ["advanced", "Sondage avancé"],
          ]}
          onChange={setMode}
        />
      }
    >
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("En cours")} value={polls ? live : "—"} />
        <StatTile label={tx("Terminés")} value={polls ? all.filter((p) => p.status === "ENDED").length : "—"} />
        <StatTile label={tx("Votes")} value={polls ? totalVotes : "—"} />
        <StatTile label={tx("Brouillons")} value={polls ? all.filter((p) => p.status === "DRAFT").length : "—"} />
      </motion.div>

      {mode === "advanced" && <AdvancedPollForm guildId={guildId} onCreated={() => { setFilter("live"); void load(); }} />}

      {mode === "discord" && (
      <Panel title={tx("Nouveau sondage")} subtitle={tx("Sondage Discord natif : les membres votent directement dans le message.")}>
        <Row label={tx("Question")}>
          <input value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder={tx("Quel jeu ce week-end ?")} className={input} />
        </Row>
        <Row label={tx("Réponses")} hint={tx("De 2 à {MAX_ANSWERS} réponses, 55 caractères maximum.", { MAX_ANSWERS })}>
          <div className="space-y-1.5">
            {answers.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={a}
                  maxLength={55}
                  onChange={(e) => setAnswers((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={tx("Réponse {v0}", { v0: i + 1 })}
                  aria-label={tx("Réponse {v0}", { v0: i + 1 })}
                  className={input}
                />
                {answers.length > 2 && (
                  <button type="button" onClick={() => setAnswers((l) => l.filter((_, j) => j !== i))} aria-label={tx("Retirer la réponse {v0}", { v0: i + 1 })} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {answers.length < MAX_ANSWERS && (
              <GhostButton onClick={() => setAnswers((l) => [...l, ""])}>
                <Plus className="h-3.5 w-3.5" /> {" "}{tx("Réponse")}
              </GhostButton>
            )}
          </div>
        </Row>
        <Row label={tx("Durée")} hint={tx("Discord clôt le sondage automatiquement (32 jours maximum).")}>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label={tx("Durée")} value={[1, 24, 72, 168].includes(hours) ? hours : 0} options={[[1, "1 h"], [24, "1 j"], [72, "3 j"], [168, "7 j"]]} onChange={(v) => v && setHours(v)} />
            <Stepper value={hours} min={1} max={768} unit="heures" onCommit={setHours} />
          </div>
        </Row>
        <Row label={tx("Plusieurs réponses")} hint={tx("Chaque membre peut cocher plusieurs réponses.")}>
          <Switch checked={multi} onChange={setMulti} label={tx("Plusieurs réponses")} />
        </Row>
        <Row label={tx("Salon")}>
          <ChannelPicker guildId={guildId} value={channelId} filterTypes={[0, 5, 15]} placeholder={tx("Choisir un salon")} onChange={(id) => setChannelId(id)} />
        </Row>
        <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
          <button
            type="button"
            disabled={!canCreate}
            onClick={create}
            className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {tx("Publier le sondage (")}{durationLabel(hours)})
          </button>
        </div>
      </Panel>
      )}

      <Panel
        title={tx("Sondages du serveur")}
        actions={
          <Segmented
            label={tx("Filtre")}
            value={filter}
            options={[
              ["live", "En cours"],
              ["ended", "Terminés"],
              ["draft", "Brouillons"],
              ["all", "Tous"],
            ]}
            onChange={setFilter}
          />
        }
      >
        {!polls ? (
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        ) : shown.length === 0 ? (
          <EmptyLine>{all.length === 0 ? tx("Aucun sondage pour l'instant.") : tx("Rien dans cette liste.")}</EmptyLine>
        ) : (
          <ul>
            {shown.map((p) => {
              const votes = votesOf(p);
              const options = p.questions[0]?.options ?? [];
              const top = Math.max(1, ...options.map((o) => o.votesCount || 0));
              return (
                <li key={p.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                  <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]">
                    <span className="w-14 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--text-primary)]">
                      {votes}
                      <span className="block text-[10px] font-normal text-[var(--text-muted)]">{tx("vote")}{votes > 1 ? "s" : ""}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.questions[0]?.title || p.title}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        <span className={cn(p.status === "ACTIVE" && "text-[var(--success)]")}>{STATUS[p.status]}</span>
                        {p.native ? tx(" · Discord") : ""}
                        {p.status === "ACTIVE" && p.endsAt ? tx(" · se termine {v0}", { v0: new Date(p.endsAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) }) : ` · ${sinceLabel(p.createdAt)}`}
                        {p.creatorTag ? ` · ${p.creatorTag}` : ""}
                      </p>
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {open === p.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                        <div className="space-y-3 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 px-5 py-4">
                          <ul className="space-y-2">
                            {options.map((o) => {
                              const pct = votes ? Math.round(((o.votesCount || 0) / votes) * 100) : 0;
                              return (
                                <li key={o.id}>
                                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                    <span className="truncate text-[var(--text-primary)]">
                                      {o.emoji ? `${o.emoji} ` : ""}
                                      {o.label}
                                    </span>
                                    <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                                      {o.votesCount || 0} · {pct} %
                                    </span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]">
                                    <motion.div
                                      className="h-full rounded-full bg-[var(--accent-primary)]"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${((o.votesCount || 0) / top) * 100}%` }}
                                      transition={SPRING_LAYOUT}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          {!p.native && p.status !== "DRAFT" && <PollInsights guildId={guildId} pollId={p.id} anonymous={Boolean(p.anonymity && p.anonymity !== "PUBLIC")} />}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.status === "DRAFT" && !p.native && (
                              <GhostButton disabled={busy} onClick={() => action(p, "publish")}>
                                {tx("Lancer")}
                              </GhostButton>
                            )}
                            {!p.native && p.status === "ACTIVE" && (
                              <GhostButton disabled={busy} onClick={() => action(p, "pause")}>
                                {tx("Mettre en pause")}
                              </GhostButton>
                            )}
                            {!p.native && p.status === "PAUSED" && (
                              <GhostButton disabled={busy} onClick={() => action(p, "resume")}>
                                {tx("Reprendre")}
                              </GhostButton>
                            )}
                            {!p.native && (p.status === "ACTIVE" || p.status === "PAUSED") && (
                              <GhostButton disabled={busy} onClick={() => action(p, "extend", { additionalHours: 24 })}>
                                +24 h
                              </GhostButton>
                            )}
                            {(p.status === "ACTIVE" || p.status === "PAUSED") && (
                              <GhostButton disabled={busy} onClick={() => action(p, "end")}>
                                {tx("Terminer maintenant")}
                              </GhostButton>
                            )}
                            {!p.native && p.panelConfig?.channelId && (p.status === "ACTIVE" || p.status === "PAUSED") && (
                              <GhostButton disabled={busy} onClick={() => action(p, "panel/deploy", { channelId: p.panelConfig?.channelId })}>
                                {p.panelConfig?.messageId ? tx("Republier le panneau") : tx("Publier le panneau")}
                              </GhostButton>
                            )}
                            {!p.native && (
                              <a href={`${BOT_API_URL}/api/guilds/${guildId}/polls/${p.id}/export/csv`} className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                                {tx("Exporter les votes")}
                              </a>
                            )}
                            <span className="flex-1" />
                            <GhostButton disabled={busy} onClick={() => remove(p)}>
                              {tx("Supprimer")}
                            </GhostButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
