"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Select, Switch, useGuildApi } from "../kit";
import { ACTION_LABEL, INPUT, MultiPills, PageTitle, SavingBadge, useSanctionConfig, when, type Action } from "../sanctions/shared";

type Appeal = { id: string; caseNumber: number; userId: string; userTag: string; action: Action; answer: string; status: "pending" | "accepted" | "refused"; createdAt: string; decidedBy?: string };
type Cfg = { appeals: { enabled: boolean; channelId: string | null; actions: Array<"WARN" | "TIMEOUT" | "TEMPBAN" | "BAN">; deciderRoleIds: string[]; mentionRoleIds: string[]; question: string; windowDays: number }; [k: string]: unknown };

const ACTIONS = [
  ["WARN", "Avertissements"],
  ["TIMEOUT", "Mutes"],
  ["TEMPBAN", "Bans temporaires"],
  ["BAN", "Bannissements"],
] as const;

/** Appels (format Keeper) : le membre sanctionné fait appel depuis son MP, l'équipe décide ici ou dans Discord. */
export default function ConsoleAppeals({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const { cfg, set, status } = useSanctionConfig<Cfg>(guildId);
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ appeals: Appeal[] }>("/sanctions/appeals");
    setAppeals(r?.appeals ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (a: Appeal, accept: boolean) => {
    setBusy(a.id);
    const r = await api(`/sanctions/appeals/${encodeURIComponent(a.id)}/decide`, { method: "POST", json: { accept } });
    setBusy(null);
    if (r) {
      success(accept ? "Appel accepté" : "Appel refusé", accept ? `La sanction de ${a.userTag} est levée.` : `${a.userTag} est prévenu.`);
      void load();
    }
  };

  if (!cfg)
    return (
      <ConsolePage title="Appels">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  const ap = cfg.appeals;
  const setA = (p: Partial<Cfg["appeals"]>) => set("appeals", { ...ap, ...p });
  const pending = appeals?.filter((a) => a.status === "pending").length ?? 0;

  return (
    <ConsolePage title={<PageTitle title="Appels" text="Le membre sanctionné peut faire appel depuis son message privé. L'équipe accepte, refuse ou en discute dans le salon des appels." />} actions={<SavingBadge text={status} />}>
      <Panel title="Demandes" actions={<span className="rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">{pending} en attente</span>}>
        {!appeals ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : appeals.length === 0 ? (
          <EmptyLine>Aucun appel pour l&apos;instant.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {appeals.map((a) => (
                <motion.li key={a.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_LAYOUT} className="space-y-1.5 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">{a.userTag}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {ACTION_LABEL[a.action] ?? a.action} · dossier n°{a.caseNumber} · {when(a.createdAt)}
                    </span>
                    <span className={cn("ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold", a.status === "pending" ? "bg-amber-500/15 text-amber-300" : a.status === "accepted" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>
                      {a.status === "pending" ? "En attente" : a.status === "accepted" ? `Acceptée${a.decidedBy ? ` · ${a.decidedBy}` : ""}` : `Refusée${a.decidedBy ? ` · ${a.decidedBy}` : ""}`}
                    </span>
                  </div>
                  <p className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-primary)]">{a.answer}</p>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <GhostButton onClick={() => decide(a, true)} disabled={busy === a.id}>
                        Accepter
                      </GhostButton>
                      <GhostButton onClick={() => decide(a, false)} disabled={busy === a.id}>
                        Refuser
                      </GhostButton>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Panel title="Réglages" actions={<Switch checked={ap.enabled} onChange={(v) => setA({ enabled: v })} label="Appels" />}>
        <Row label="Salon des appels">
          <ChannelPicker guildId={guildId} value={ap.channelId ?? ""} filterTypes={[0, 5]} placeholder="Choisir un salon" onChange={(id) => setA({ channelId: id || null })} />
        </Row>
        <Row label="Sanctions concernées" hint="Une expulsion ne se défait pas : pas d'appel possible.">
          <MultiPills label="Sanctions concernées" options={ACTIONS} value={ap.actions} onChange={(v) => setA({ actions: v })} />
        </Row>
        <Row label="Rôles qui décident" hint="En plus des membres qui ont une permission de modération.">
          <RoleChips guildId={guildId} ids={ap.deciderRoleIds} addLabel="Ajouter un rôle" onChange={(ids) => setA({ deciderRoleIds: ids })} />
        </Row>
        <Row label="Rôles mentionnés">
          <RoleChips guildId={guildId} ids={ap.mentionRoleIds} addLabel="Ajouter un rôle" onChange={(ids) => setA({ mentionRoleIds: ids })} />
        </Row>
        <Row label="Question posée" hint="Le titre du champ que remplit le membre (45 caractères). Vide : « Pourquoi lever cette sanction ? ».">
          <input value={ap.question} maxLength={45} onChange={(e) => setA({ question: e.target.value })} placeholder="Pourquoi lever cette sanction ?" className={cn(INPUT, "h-9")} />
        </Row>
        <Row label="Délai pour faire appel">
          <Select value={ap.windowDays} options={[[1, "1 jour"], [3, "3 jours"], [7, "7 jours"], [14, "14 jours"], [30, "30 jours"]]} onChange={(v) => setA({ windowDays: v })} aria-label="Délai pour faire appel" />
        </Row>
      </Panel>
    </ConsolePage>
  );
}
