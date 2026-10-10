"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown, X } from "@/components/icons/ph";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { ConsolePage, EmptyLine, MemberPicker, Panel, useGuildApi } from "./kit";

type Role = { id: string; name: string; color: string | null; managed: boolean; permissions: string[]; aboveEtho: boolean; memberCount: number };
type Inspect = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bot: boolean;
  joinedAt: string | null;
  createdAt: string;
  isOwner: boolean;
  etho: { canAct: boolean };
  roles: Array<{ id: string; name: string; color: string | null }>;
  permissions: string[];
  whitelisted: { antiRaid: boolean; antiNuke: boolean };
  blacklisted: boolean;
};

const PREVIEW = 12;

/** Rôles et membres (format Keeper) : rôles sensibles, ceux au-dessus d'Etho, et inspection d'un membre. */
export default function ConsoleMembers({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [aboveCount, setAboveCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [inspected, setInspected] = useState<Inspect | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ roles: Role[]; aboveEthoCount: number }>("/console/roles").then((d) => {
      if (!cancelled && d) {
        setRoles(d.roles);
        setAboveCount(d.aboveEthoCount);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const inspect = async (id: string) => {
    const d = await api<Inspect>(`/console/members/${id}/inspect`);
    if (d) setInspected(d);
  };

  const shown = showAll ? roles ?? [] : (roles ?? []).slice(0, PREVIEW);

  return (
    <ConsolePage title="Rôles et membres">
      <AnimatePresence>
        {inspected && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING_LAYOUT}>
            <Panel
              title={
                <span className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inspected.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
                  {inspected.displayName}
                  <span className="text-xs font-normal text-[var(--text-muted)]">@{inspected.username}</span>
                </span>
              }
              actions={
                <button type="button" onClick={() => setInspected(null)} aria-label="Fermer" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">
                  <X className="h-4 w-4" />
                </button>
              }
            >
              <div className="grid gap-4 px-5 py-4 text-xs sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Etho</p>
                  <p className="text-[var(--text-primary)]">
                    {inspected.isOwner
                      ? "Propriétaire du serveur : Etho ne peut pas le sanctionner."
                      : inspected.etho.canAct
                        ? "Etho peut agir sur ce membre."
                        : "Son rôle le plus haut est au-dessus d'Etho : Etho ne peut pas le sanctionner."}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    Whitelist : {inspected.whitelisted.antiRaid || inspected.whitelisted.antiNuke ? [inspected.whitelisted.antiRaid && "anti-raid", inspected.whitelisted.antiNuke && "protections"].filter(Boolean).join(", ") : "non"}
                    {inspected.blacklisted && " · blacklisté"}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    Compte créé {sinceLabel(inspected.createdAt)}
                    {inspected.joinedAt && ` · arrivé ${sinceLabel(inspected.joinedAt)}`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Permissions sensibles</p>
                  <div className="flex flex-wrap gap-1">
                    {inspected.permissions.length ? (
                      inspected.permissions.map((p) => (
                        <span key={p} className="rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)]">Aucune</span>
                    )}
                  </div>
                  <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Rôles</p>
                  <div className="flex flex-wrap gap-1">
                    {inspected.roles.map((r) => (
                      <span key={r.id} className="flex items-center gap-1 rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color ?? "var(--text-muted)" }} />
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel title="Rôles sensibles" subtitle="Rôles capables de casser le serveur." actions={<MemberPicker guildId={guildId} label="Inspecter un membre" onPick={(m) => inspect(m.id)} />}>
        {!roles ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : roles.length === 0 ? (
          <EmptyLine>Aucun rôle sensible sur ce serveur.</EmptyLine>
        ) : (
          <>
            {aboveCount > 0 && (
              <p className="flex items-center gap-2 border-b border-[var(--panel-border)] px-5 py-2.5 text-xs text-[var(--danger)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {aboveCount} rôle{aboveCount > 1 ? "s" : ""} sensible{aboveCount > 1 ? "s" : ""} au-dessus d&apos;Etho : il ne peut pas agir sur leurs membres.
              </p>
            )}
            <ul>
              {shown.map((r) => (
                <li key={r.id} className="grid items-center gap-2 border-t border-[var(--panel-border)] px-5 py-2.5 first:border-t-0 sm:grid-cols-[11rem_1fr_auto]">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color ?? "var(--text-muted)" }} />
                    <span className="truncate">{r.name}</span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {r.permissions.map((p) => (
                      <span key={p} className="rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                        {p}
                      </span>
                    ))}
                  </span>
                  {r.aboveEtho ? (
                    <span className="justify-self-end rounded-md bg-[var(--danger)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--danger)]">Au-dessus d&apos;Etho</span>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
            {roles.length > PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="flex w-full items-center justify-center gap-1 border-t border-[var(--panel-border)] py-2.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {showAll ? "Voir moins" : `Voir les ${roles.length} rôles`}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
              </button>
            )}
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}
