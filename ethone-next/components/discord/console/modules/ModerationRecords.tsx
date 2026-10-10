"use client";

import { useCallback, useEffect, useState } from "react";
import { sinceLabel } from "@/lib/discord/security-scan";
import { cn } from "@/lib/utils";
import { EmptyLine, GhostButton, MemberPicker, Panel, Segmented, StatTile, useGuildApi, type MemberHit } from "../kit";

type Profile = {
  userTag: string;
  stats: { warnings: number; timeouts: number; kicks: number; bans: number; totalCases: number; activeSanctionsCount: number };
  trustLevel: "TRUSTED" | "NORMAL" | "SUSPICIOUS" | "DANGEROUS";
  reportsCount?: number;
};
type TimelineItem = { id: string; type: "CASE" | "NOTE" | "REPORT"; title: string; description: string; timestamp: string; author: { tag: string } };
type Report = { id: string; reportedUserTag: string; reporterUserTag: string; reason: string; category?: string; messageContent?: string; status: "NEW" | "REVIEWING" | "ACTIONED" | "DISMISSED" | "ESCALATED"; createdAt: string };

const TRUST: Record<Profile["trustLevel"], [string, string]> = {
  TRUSTED: ["Fiable", "var(--success)"],
  NORMAL: ["Normal", "var(--text-muted)"],
  SUSPICIOUS: ["À surveiller", "var(--warning)"],
  DANGEROUS: ["Dangereux", "var(--danger)"],
};
const KIND: Record<TimelineItem["type"], string> = { CASE: "Sanction", NOTE: "Note", REPORT: "Signalement" };

/** Fiche d'un membre : compteurs de sanctions et historique (sanctions, notes du staff, signalements). */
export function MemberRecord({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [member, setMember] = useState<MemberHit | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[] | null>(null);

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    setProfile(null);
    setTimeline(null);
    Promise.all([api<{ profile: Profile }>(`/moderation/users/${member.id}/profile`), api<{ timeline: TimelineItem[] }>(`/moderation/users/${member.id}/timeline`)]).then(([p, t]) => {
      if (cancelled) return;
      setProfile(p?.profile ?? null);
      setTimeline(t?.timeline ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [api, member]);

  return (
    <Panel title="Fiche d'un membre" subtitle="Historique complet : sanctions, notes du staff et signalements." actions={<MemberPicker guildId={guildId} label={member ? member.displayName || member.username : "Choisir"} onPick={setMember} />}>
      {!member ? (
        <EmptyLine>Choisis un membre pour voir son historique.</EmptyLine>
      ) : !profile || !timeline ? (
        <EmptyLine>Chargement…</EmptyLine>
      ) : (
        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatTile label="Avertissements" value={profile.stats.warnings} />
            <StatTile label="Exclusions temp." value={profile.stats.timeouts} />
            <StatTile label="Expulsions" value={profile.stats.kicks} />
            <StatTile label="Bannissements" value={profile.stats.bans} />
            <StatTile label="Profil" value={TRUST[profile.trustLevel][0]} accent={TRUST[profile.trustLevel][1]} hint={profile.reportsCount ? `${profile.reportsCount} signalement(s)` : undefined} />
          </div>
          {timeline.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Aucun antécédent sur ce serveur.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
              {timeline.map((t) => (
                <li key={t.id} className="flex items-start gap-3 border-t border-[var(--panel-border)] px-3 py-2 first:border-t-0">
                  <span className="mt-0.5 w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{KIND[t.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{t.title}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {t.description} · par {t.author.tag}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{sinceLabel(t.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

/** Signalements des membres (bouton « Signaler » d'Etho) : à traiter ou à classer. */
export function ReportsPanel({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [filter, setFilter] = useState<"open" | "done">("open");
  const [reports, setReports] = useState<Report[] | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ reports: Report[] }>("/moderation/reports", { silent: true });
    setReports((r?.reports ?? []).slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (rep: Report, status: Report["status"]) => {
    setReports((l) => l?.map((x) => (x.id === rep.id ? { ...x, status } : x)) ?? null);
    if (!(await api(`/moderation/reports/${rep.id}`, { method: "PATCH", json: { status } }))) void load();
  };

  const open = (r: Report) => r.status === "NEW" || r.status === "REVIEWING" || r.status === "ESCALATED";
  const shown = (reports ?? []).filter((r) => (filter === "open" ? open(r) : !open(r)));

  return (
    <Panel
      title="Signalements"
      subtitle="Envoyés par les membres depuis Discord."
      actions={
        <Segmented
          label="Filtre"
          value={filter}
          options={[
            ["open", `À traiter${reports ? ` (${reports.filter(open).length})` : ""}`],
            ["done", "Traités"],
          ]}
          onChange={setFilter}
        />
      }
    >
      {!reports ? (
        <EmptyLine>Chargement…</EmptyLine>
      ) : shown.length === 0 ? (
        <EmptyLine>{filter === "open" ? "Aucun signalement en attente." : "Aucun signalement traité."}</EmptyLine>
      ) : (
        <ul>
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  {r.reportedUserTag}
                  <span className="font-normal text-[var(--text-muted)]"> · signalé par {r.reporterUserTag}</span>
                </p>
                <p className="text-[12px] text-[var(--text-primary)]">{r.reason}</p>
                {r.messageContent && <p className="mt-1 truncate rounded bg-[var(--surface-hover)] px-2 py-1 text-[11px] text-[var(--text-muted)]">« {r.messageContent} »</p>}
                <p className={cn("mt-1 text-[11px]", r.status === "ACTIONED" ? "text-[var(--success)]" : "text-[var(--text-muted)]")}>
                  {r.status === "ACTIONED" ? "Traité" : r.status === "DISMISSED" ? "Classé" : r.status === "ESCALATED" ? "Escaladé" : "Nouveau"} · {sinceLabel(r.createdAt)}
                </p>
              </div>
              {open(r) && (
                <div className="flex shrink-0 gap-1.5">
                  <GhostButton onClick={() => setStatus(r, "ACTIONED")}>Traité</GhostButton>
                  <GhostButton onClick={() => setStatus(r, "DISMISSED")}>Classer</GhostButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-[var(--panel-border)] px-5 py-2.5 text-[11px] text-[var(--text-muted)]">
        Bouton « Signaler » et salon des signalements :{" "}
        <a href={`/discord/moderation/reports/?guildId=${guildId}`} className="font-semibold text-[var(--text-primary)] hover:underline">
          installer ou régler
        </a>
      </p>
    </Panel>
  );
}
