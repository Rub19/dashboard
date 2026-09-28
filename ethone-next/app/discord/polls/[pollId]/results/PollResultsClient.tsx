"use client";

import Link from "next/link";
import { POLL_BOT_API_URL, STATUS_LABELS, usePollData } from "../usePollData";

const QUORUM_LABELS: Record<string, string> = {
  PASSED: "Adopté",
  REJECTED: "Rejeté",
  QUORUM_NOT_REACHED: "Quorum non atteint",
};

/** Résultats d'un sondage : chiffres réels du bot, avec export CSV / JSON. */
export default function PollResultsClient() {
  const { poll, results, loading, error, guildId, pollId } = usePollData();
  const guildQuery = guildId ? `?guildId=${guildId}` : "";

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-xs text-[var(--text-muted)]">Chargement des résultats…</div>;

  if (error || !poll) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Résultats indisponibles</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">{error || "Ce sondage n'existe pas sur ce serveur."}</p>
        <Link href={`/discord/polls${guildQuery}`} className="mt-5 inline-block rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70">
          Retour aux sondages
        </Link>
      </div>
    );
  }

  const status = STATUS_LABELS[poll.status] ?? { label: poll.status, tone: "bg-[var(--surface-raised)]/60 text-[var(--text-muted)]" };
  const exportBase = `${POLL_BOT_API_URL}/api/guilds/${guildId}/polls/${encodeURIComponent(pollId)}/export`;
  const anonymous = poll.resultsVisibility === "STAFF_ONLY";

  return (
    <div className="text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="mb-5 text-xs text-[var(--text-muted)]">
          <Link href={`/discord/polls${guildQuery}`} className="hover:text-[var(--text-primary)]">Sondages &amp; votes</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/discord/polls/${encodeURIComponent(pollId)}${guildQuery}`} className="hover:text-[var(--text-primary)]">{poll.title}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--text-muted)]">Résultats</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{poll.title}</h1>
            <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
            {anonymous && <p className="mt-2 text-xs text-amber-300/90">Résultats réservés au staff (réglage du sondage).</p>}
          </div>
          <div className="flex gap-2">
            <a href={`${exportBase}/csv`} className="rounded-lg border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70">Exporter CSV</a>
            <a href={`${exportBase}/json`} className="rounded-lg border border-[var(--panel-border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/70">Exporter JSON</a>
          </div>
        </div>

        {!results ? (
          <p className="mt-8 rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-xs text-[var(--text-muted)]">Aucun résultat disponible pour ce sondage.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(poll.native
                ? [["Votes", String(results.totalVotes)], ["Sondage", "Natif Discord"]]
                : [
                    ["Votes", String(results.totalVotes)],
                    ["Participants", String(results.uniqueParticipants)],
                    ["Participation", results.serverMemberCount > 0 ? `${results.participationRate} %` : "—"],
                    ["Quorum", QUORUM_LABELS[results.quorumStatus] ?? "Sans quorum"],
                  ]
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
                  <p className="text-xs text-[var(--text-muted)]">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <section className="mt-6 space-y-4">
              {results.questionsResults.map((q) => (
                <div key={q.questionId} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-semibold">{q.title}</h2>
                    <span className="text-xs text-[var(--text-muted)]">{q.totalVotes} vote{q.totalVotes > 1 ? "s" : ""}</span>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {q.options.map((o) => (
                      <li key={o.optionId}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-primary)]">{o.emoji ? `${o.emoji} ` : ""}{o.label}</span>
                          <span className="text-[var(--text-muted)]">{o.votesCount} · {o.percentage} %</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]/50">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, o.percentage)}%`, background: o.color || "var(--accent-primary)" }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
