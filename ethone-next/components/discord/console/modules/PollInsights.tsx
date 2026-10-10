"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyLine, useGuildApi } from "../kit";

type OptionResult = { optionId: string; label: string; emoji?: string; votesCount: number; weightedPoints: number };
type Results = {
  uniqueParticipants: number;
  participationRate: number;
  quorumStatus: "PASSED" | "REJECTED" | "QUORUM_NOT_REACHED" | "NOT_APPLICABLE";
  approvalPercentage: number;
  questionsResults: { options: OptionResult[] }[];
};
type Vote = { id: string; userTag: string; selectedOptionIds: string[]; weight: number; votedAt: string };

const QUORUM: Record<Results["quorumStatus"], [string, string] | null> = {
  PASSED: ["Quorum atteint, proposition adoptée", "text-[var(--success)]"],
  REJECTED: ["Quorum atteint, proposition rejetée", "text-[var(--danger)]"],
  QUORUM_NOT_REACHED: ["Quorum pas encore atteint", "text-[var(--warning)]"],
  NOT_APPLICABLE: null,
};

/** Détail d'un sondage Etho : participation, quorum, points pondérés et liste des votants (sauf sondage anonyme). */
export default function PollInsights({ guildId, pollId, anonymous }: { guildId: string; pollId: string; anonymous: boolean }) {
  const api = useGuildApi(guildId);
  const [results, setResults] = useState<Results | null>(null);
  const [votes, setVotes] = useState<Vote[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<{ results: Results }>(`/polls/${pollId}/results`, { silent: true }), anonymous ? null : api<{ votes: Vote[] }>(`/polls/${pollId}/votes`, { silent: true })]).then(([r, v]) => {
      if (cancelled) return;
      setResults(r?.results ?? null);
      setVotes(v?.votes ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [api, pollId, anonymous]);

  if (!results) return <EmptyLine>Chargement des résultats…</EmptyLine>;
  const options = results.questionsResults[0]?.options ?? [];
  const weighted = options.some((o) => o.weightedPoints !== o.votesCount);
  const label = (id: string) => options.find((o) => o.optionId === id)?.label ?? "choix retiré";
  const quorum = QUORUM[results.quorumStatus];

  return (
    <div className="space-y-2 text-xs">
      <p className="text-[var(--text-muted)]">
        {results.uniqueParticipants} votant{results.uniqueParticipants > 1 ? "s" : ""} · {results.participationRate} % des membres
        {quorum && (
          <>
            {" · "}
            <span className={cn("font-semibold", quorum[1])}>{quorum[0]}</span>
            {results.quorumStatus !== "QUORUM_NOT_REACHED" && ` (${results.approvalPercentage} %)`}
          </>
        )}
      </p>
      {weighted && (
        <p className="text-[var(--text-muted)]">
          Points avec le poids des rôles : {options.map((o) => `${o.emoji ? `${o.emoji} ` : ""}${o.label} ${o.weightedPoints}`).join(" · ")}
        </p>
      )}
      {anonymous ? (
        <p className="text-[var(--text-muted)]">Vote anonyme : les noms des votants ne sont pas affichés.</p>
      ) : votes && votes.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
          {votes.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 border-t border-[var(--panel-border)] px-3 py-1.5 first:border-t-0">
              <span className="truncate font-medium text-[var(--text-primary)]">{v.userTag}</span>
              <span className="shrink-0 truncate text-[var(--text-muted)]">
                {v.selectedOptionIds.map(label).join(", ")}
                {v.weight > 1 ? ` · ×${v.weight}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
