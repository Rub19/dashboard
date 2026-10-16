"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import ChannelPicker from "../../ChannelPicker";
import { useToast } from "@/components/ToastProvider";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, Stepper, Switch, useGuildApi } from "../kit";
import { INPUT, PageTitle, SavingBadge, when } from "../sanctions/shared";

type Report = { id: string; reportedUserId: string; reportedUserTag: string; reporterUserId: string; reporterUserTag: string; reason: string; channelId?: string; messageId?: string; status: string; assignedModerator?: { tag: string }; createdAt: string; caseNumber?: number };
type Cfg = {
  enabled: boolean;
  channelId: string | null;
  cooldownSeconds: number;
  moderatorRoleIds: string[];
  mentionRoleIds: string[];
  reactionEmoji: string;
  groupWindow: boolean;
  maxClaims: number;
  customSanctions: boolean;
  notifyReporter: boolean;
  confirmationMessage: string;
  threadPerReport: boolean;
  triageThreads: boolean;
};

const STATUS: Record<string, string> = { NEW: "Nouveau", REVIEWING: "Pris en charge", ESCALATED: "Escaladé", ACTIONED: "Traité", DISMISSED: "Refusé" };

/** Signalements (format Keeper) : file de l'équipe et réglages, tout gratuit (fil par signalement et fils de tri compris). */
export default function ConsoleReportsKeeper({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [queue, setQueue] = useState<{ open: Report[]; done: Report[] } | null>(null);
  const [tab, setTab] = useState<"open" | "done">("open");
  const [saving, setSaving] = useState("");
  const pending = useRef<Partial<Cfg>>({});
  const timer = useRef<number | undefined>(undefined);

  const loadQueue = useCallback(async () => {
    const r = await api<{ open: Report[]; done: Report[] }>("/sanctions/reports");
    if (r) setQueue(r);
  }, [api]);
  useEffect(() => {
    api<{ config: Cfg }>("/report-system/config").then((r) => r && setCfg(r.config));
    void loadQueue();
  }, [api, loadQueue]);

  const save = (patch: Partial<Cfg>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    pending.current = { ...pending.current, ...patch };
    setSaving("Enregistrement…");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const body = pending.current;
      pending.current = {};
      const r = await api<{ config: Cfg }>("/report-system/config", { method: "PUT", json: body });
      if (r) setCfg(r.config);
      else api<{ config: Cfg }>("/report-system/config", { silent: true }).then((x) => x && setCfg(x.config));
      setSaving(r ? "Enregistré" : "");
    }, 600);
  };
  const close = async (r: Report, status: "ACTIONED" | "DISMISSED") => {
    const ok = await api(`/sanctions/reports/${r.reportedUserId}/close`, { method: "POST", json: { status } });
    if (ok) {
      success(status === "DISMISSED" ? "Signalement refusé" : "Signalement traité", r.reportedUserTag);
      void loadQueue();
    }
  };

  const list = queue ? queue[tab] : null;
  const toggle = (label: string, key: keyof Cfg, hint?: string) => (
    <Row label={label} hint={hint}>
      <Switch checked={Boolean(cfg?.[key])} onChange={(v) => save({ [key]: v } as Partial<Cfg>)} label={label} />
    </Row>
  );

  return (
    <ConsolePage title={<PageTitle title="Signalements" text="Les membres signalent un membre ou un message (/report ou clic droit). L'équipe traite chaque signalement depuis Discord ou ici." />} actions={<SavingBadge text={saving} />}>
      <Panel
        title="File"
        actions={
          <Segmented
            label="File"
            value={tab}
            options={[
              ["open", `En cours · ${queue?.open.length ?? 0}`],
              ["done", "Traités"],
            ]}
            onChange={setTab}
          />
        }
      >
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : list.length === 0 ? (
          <EmptyLine>{tab === "open" ? "Aucun signalement en attente." : "Aucun signalement traité pour l'instant."}</EmptyLine>
        ) : (
          <motion.ul key={tab} variants={pageStagger} initial="initial" animate="animate">
            {list.map((r) => (
              <motion.li key={r.id} variants={staggerItem} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {r.reportedUserTag} <span className="font-normal text-[var(--text-muted)]">signalé par {r.reporterUserTag}</span>
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{r.reason}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                    {when(r.createdAt)} · {STATUS[r.status] ?? r.status}
                    {r.assignedModerator ? ` · ${r.assignedModerator.tag}` : ""}
                    {r.caseNumber ? ` · dossier n°${r.caseNumber}` : ""}
                  </p>
                </div>
                {r.messageId && r.channelId && (
                  <a href={`https://discord.com/channels/${guildId}/${r.channelId}/${r.messageId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    Message <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {tab === "open" && (
                  <div className="flex gap-2">
                    <GhostButton onClick={() => close(r, "ACTIONED")}>Traité</GhostButton>
                    <GhostButton onClick={() => close(r, "DISMISSED")}>Refuser</GhostButton>
                  </div>
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Panel>

      <Panel title="Réglages" actions={cfg && <Switch checked={cfg.enabled} onChange={(v) => save({ enabled: v })} label="Signalements" />}>
        {!cfg ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : (
          <>
            <Row label="Salon des signalements">
              <ChannelPicker guildId={guildId} value={cfg.channelId ?? ""} filterTypes={[0, 5, 15]} placeholder="Choisir un salon" onChange={(id) => save({ channelId: id || null })} />
            </Row>
            <Row label="Rôles modérateurs" hint="Ils peuvent prendre en charge, sanctionner et clore, en plus des membres qui ont une permission de modération.">
              <RoleChips guildId={guildId} ids={cfg.moderatorRoleIds} addLabel="Ajouter un rôle" onChange={(ids) => save({ moderatorRoleIds: ids })} />
            </Row>
            <Row label="Rôles mentionnés">
              <RoleChips guildId={guildId} ids={cfg.mentionRoleIds} addLabel="Ajouter un rôle" onChange={(ids) => save({ mentionRoleIds: ids })} />
            </Row>
            <Row label="Réaction sur le message signalé" hint="Un émoji ajouté au message signalé par clic droit. Vide : aucune réaction.">
              <input value={cfg.reactionEmoji} maxLength={80} onChange={(e) => save({ reactionEmoji: e.target.value.trim() })} aria-label="Émoji de réaction" className={cn(INPUT, "h-9 w-28 text-center")} />
            </Row>
            {toggle("Regrouper en 15 minutes", "groupWindow", "Plusieurs signalements du même membre en 15 minutes forment un seul signalement.")}
            <Row label="Prises en charge simultanées" hint="Combien de signalements un modérateur peut avoir en cours. 0 : sans limite.">
              <Stepper value={cfg.maxClaims} min={0} max={50} onCommit={(n) => save({ maxClaims: n })} />
            </Row>
            {toggle("Sanctions personnalisées", "customSanctions", "Sinon, depuis un signalement, seules les raisons prédéfinies sont proposées.")}
            {toggle("Prévenir le signaleur", "notifyReporter", "À la clôture : issue, modérateur et sanction éventuelle.")}
            <Row label="Délai entre deux signalements">
              <Stepper value={cfg.cooldownSeconds} min={0} max={3600} unit="s" onCommit={(n) => save({ cooldownSeconds: n })} />
            </Row>
            <Row label="Message de confirmation" hint="Ce que lit le membre après avoir signalé. Vide : texte par défaut.">
              <textarea value={cfg.confirmationMessage} maxLength={500} rows={2} onChange={(e) => save({ confirmationMessage: e.target.value })} placeholder="Merci, ton signalement a bien été envoyé à l'équipe de modération." className={cn(INPUT, "py-2")} />
            </Row>
            {toggle("Fil par signalement", "threadPerReport", "Un fil s'ouvre sous chaque signalement pour en discuter.")}
            {toggle("Fils de tri", "triageThreads", "Chaque signalement clos est rangé dans un fil Résolus, Sanctionnés ou Refusés.")}
          </>
        )}
      </Panel>
    </ConsolePage>
  );
}
