"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { POLL_BOT_API_URL, STATUS_LABELS, usePollData } from "./usePollData";
import { formatApiError } from "@/lib/format-error";

const ACTIONS: Record<string, Array<{ path: string; label: string; confirm?: string }>> = {
  DRAFT: [{ path: "publish", label: "Publier" }],
  SCHEDULED: [{ path: "publish", label: "Publier maintenant" }],
  ACTIVE: [
    { path: "pause", label: "Mettre en pause" },
    { path: "end", label: "Terminer", confirm: "Terminer ce sondage maintenant ? Les votes seront clos." },
  ],
  PAUSED: [
    { path: "resume", label: "Reprendre" },
    { path: "end", label: "Terminer", confirm: "Terminer ce sondage maintenant ? Les votes seront clos." },
  ],
};

/** Page d'un sondage : informations, avancement et résultats réels lus sur le bot. */
export default function PollDetailClient() {
  const { poll, results, loading, error, reload, guildId, pollId } = usePollData();
  const { success, error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const guildQuery = guildId ? `?guildId=${guildId}` : "";
  const isNative = poll?.native === true;

  const runAction = async (action: { path: string; label: string; confirm?: string }) => {
    if (!guildId || !POLL_BOT_API_URL) return;
    if (action.confirm && !(await confirmDialog(action.confirm))) return;
    setBusy(true);
    try {
      const res = await fetch(`${POLL_BOT_API_URL}/api/guilds/${guildId}/polls/${encodeURIComponent(pollId)}/${action.path}`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(formatApiError(data?.error, "Action refusée par le bot."));
      success(action.label, "Fait.");
      reload();
    } catch (e) {
      toastError("Échec", e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const copyVoteLink = async () => {
    const url = `${window.location.origin}/discord/polls/${encodeURIComponent(pollId)}/vote/${guildQuery}`;
    try {
      await navigator.clipboard.writeText(url);
      success("Lien copié", "Partagez-le aux membres qui ont accès au dashboard.");
    } catch {
      toastError("Copie impossible", url);
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6" aria-busy="true" aria-label="Chargement du sondage">
        <div className="skeleton-shimmer h-8 w-1/2 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
        <div className="skeleton-shimmer h-56 rounded-[var(--panel-radius)]" />
      </div>
    );

  if (error || !poll) {
    return (
      <div className="rise-in mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Sondage indisponible</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{error || "Ce sondage n'existe pas sur ce serveur."}</p>
        <Link href={`/discord/polls${guildQuery}`} className="mt-5 inline-block rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]">
          Retour aux sondages
        </Link>
      </div>
    );
  }

  const status = STATUS_LABELS[poll.status] ?? { label: poll.status, tone: "bg-[var(--surface-raised)]/60 text-[var(--text-muted)]" };
  const byQuestion = new Map((results?.questionsResults ?? []).map((q) => [q.questionId, q]));

  return (
    <div className="text-[var(--text-primary)]">
      <div className="stagger-children mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="mb-5 text-xs text-[var(--text-muted)]">
          <Link href={`/discord/polls${guildQuery}`} className="hover:text-[var(--text-primary)] transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]">Sondages &amp; votes</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--text-muted)]">{poll.title}</span>
        </nav>

        <header className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-[var(--surface-raised)]/50 px-2 py-0.5 text-[var(--text-muted)]">{poll.category}</span>
            {poll.native && (
              <span className="rounded-md bg-[var(--accent-primary)]/15 px-2 py-0.5 font-semibold text-[var(--accent-primary)]" title="Vote et affichage gérés par Discord">Natif</span>
            )}
            <span className="rounded-md bg-[var(--surface-raised)]/50 px-2 py-0.5 font-mono text-[var(--text-muted)]">{poll.type}</span>
            <span className={`rounded-md px-2 py-0.5 font-semibold ${status.tone}`}>{status.label}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{poll.title}</h1>
          {poll.description && <p className="mt-2 text-sm text-[var(--text-muted)]">{poll.description}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/discord/polls/${encodeURIComponent(pollId)}/results${guildQuery}`} className="rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50">
              Résultats détaillés
            </Link>
            {!isNative && (
              <Link href={`/discord/polls/${encodeURIComponent(pollId)}/settings${guildQuery}`} className="rounded-lg border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]">
                Réglages
              </Link>
            )}
            {!isNative && (
              <button type="button" onClick={copyVoteLink} className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]">
                Copier le lien de vote
              </button>
            )}
            {(ACTIONS[poll.status] ?? []).filter((a) => !isNative || a.path === "end").map((a) => (
              <button
                key={a.path}
                type="button"
                disabled={busy}
                onClick={() => runAction(a)}
                className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70 disabled:opacity-50 transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]"
              >
                {a.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            // Natif : Discord ne fournit que les décomptes par réponse (pas de participants ni de participation).
            ["Votes", results ? String(results.totalVotes) : "—"],
            ...(isNative
              ? [["Mode", poll.type === "MULTIPLE_CHOICE" ? "Choix multiple" : "Choix unique"]]
              : [
                  ["Participants", results ? String(results.uniqueParticipants) : "—"],
                  ["Participation", results && results.serverMemberCount > 0 ? `${results.participationRate} %` : "—"],
                  ["Anonymat", poll.anonymity],
                ]),
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <section className="stagger-children mt-6 space-y-4">
          {poll.questions.map((question) => {
            const result = byQuestion.get(question.id);
            return (
              <div key={question.id} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
                <h2 className="text-sm font-semibold">{question.title}</h2>
                <ul className="stagger-children mt-3 space-y-2.5">
                  {question.options.map((option) => {
                    const r = result?.options.find((o) => o.optionId === option.id);
                    const pct = r?.percentage ?? 0;
                    return (
                      <li key={option.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-primary)]">
                            {option.emoji ? `${option.emoji} ` : ""}
                            {option.label}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            {r?.votesCount ?? 0} vote{(r?.votesCount ?? 0) > 1 ? "s" : ""} · {pct} %
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]/50">
                          <div className="bar-grow h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: option.color || "var(--accent-primary)" }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
