"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Plus, Search } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ConsolePage, EmptyLine, GhostButton, Panel, Segmented, Select, useGuildApi, type MemberHit } from "../kit";
import { ACTION_LABEL, ACTION_TONE, DURATIONS, Drawer, INPUT, MemberSearch, PageTitle, Pills, PrimaryButton, SEVERITIES, Section, when, type Action, type Severity } from "../sanctions/shared";

type CaseRow = {
  caseNumber: number;
  action: Action;
  label: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  context: string | null;
  severity: Severity | null;
  points: number | null;
  durationSeconds: number | null;
  createdAt: string;
  expiresAt: string | null;
  open: boolean;
  status: string;
  origin: "moderators" | "auto" | "discord";
  appealStatus: string;
};
type Preset = { id: string; name: string; category: string | null; action: Action; severity: Severity; durationSeconds: number };
type Detail = { case: CaseRow; history: CaseRow[]; events: Array<{ type: string; at: string; value?: string | null }>; appeal: { status: string; answer: string } | null };

const TYPES: ReadonlyArray<readonly [string, string]> = [["", "Tous les types"], ...(["WARN", "NOTE", "TIMEOUT", "UNTIMEOUT", "KICK", "SOFTBAN", "BAN", "TEMPBAN", "UNBAN"] as Action[]).map((a) => [a, ACTION_LABEL[a]] as const)];
const ORIGINS: ReadonlyArray<readonly [string, string]> = [
  ["", "Toutes origines"],
  ["moderators", "Modérateurs"],
  ["auto", "Automatiques"],
  ["discord", "Faites dans Discord"],
];
const PERIODS: ReadonlyArray<readonly [number, string]> = [
  [0, "Depuis toujours"],
  [86400, "24 heures"],
  [604800, "7 jours"],
  [2592000, "30 jours"],
  [7776000, "90 jours"],
];
const NEW_TYPES: ReadonlyArray<readonly [Action, string]> = [
  ["WARN", "Avertissement"],
  ["NOTE", "Note"],
  ["TIMEOUT", "Mute"],
  ["KICK", "Expulsion"],
  ["TEMPBAN", "Ban temporaire"],
  ["BAN", "Bannissement"],
];
const ORIGIN_LABEL = { moderators: "Modérateur", auto: "Automatique", discord: "Dans Discord" } as const;
const EVENT_LABEL: Record<string, string> = { join: "Arrivée", leave: "Départ", nick: "Pseudo" };

/** Sanctions (format Keeper) : chaque sanction a son dossier numéroté, filtrable et exportable. Export gratuit. */
export default function ConsoleSanctions({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success, error } = useToast();
  const [status, setStatus] = useState<"" | "open" | "closed">("");
  const [type, setType] = useState("");
  const [origin, setOrigin] = useState("");
  const [since, setSince] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pages: number; cases: CaseRow[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  const query = new URLSearchParams({ ...(status && { status }), ...(type && { type }), ...(origin && { origin }), ...(since && { since: String(since) }), ...(q.trim() && { q: q.trim() }) }).toString();
  const load = useCallback(async () => {
    const r = await api<{ total: number; pages: number; cases: CaseRow[] }>(`/sanctions/cases?${query}&page=${page}`);
    if (r) setData(r);
  }, [api, query, page]);
  useEffect(() => {
    const t = window.setTimeout(load, q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);
  useEffect(() => setPage(1), [query]);

  const exportAs = async (format: "csv" | "json") => {
    const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/sanctions/cases?${query}&format=${format}`, { credentials: "include" }).catch(() => null);
    if (!res?.ok) return error("Export", "Le bot n'a pas répondu.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanctions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const openDetail = async (n: number) => {
    const r = await api<Detail>(`/sanctions/cases/${n}`);
    if (r) setDetail(r);
  };
  const revoke = async (c: CaseRow) => {
    if (!(await confirmDialog(`Lever le dossier n°${c.caseNumber} (${c.label}) ? ${c.action === "BAN" || c.action === "TEMPBAN" ? "Le membre sera débanni." : c.action === "TIMEOUT" ? "Le mute sera retiré." : "Il ne comptera plus pour les paliers."}`, { title: "Lever la sanction", confirmLabel: "Lever" }))) return;
    const r = await api(`/sanctions/cases/${c.caseNumber}/revoke`, { method: "POST", json: {} });
    if (r) {
      success("Sanction levée", `Dossier n°${c.caseNumber}.`);
      setDetail(null);
      void load();
    }
  };

  return (
    <ConsolePage
      title={<PageTitle title="Sanctions" text="Chaque sanction a son dossier numéroté : commandes, protection Etho, AutoMod et actions faites dans Discord." />}
      actions={
        <PrimaryButton onClick={() => setCreating(true)} className="self-start">
          <Plus className="h-4 w-4" />
          Nouvelle sanction
        </PrimaryButton>
      }
    >
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <Segmented
            label="État"
            value={status}
            options={[
              ["", "Toutes"],
              ["open", "En cours"],
              ["closed", "Closes"],
            ]}
            onChange={setStatus}
          />
          <Select value={type} options={TYPES} onChange={setType} aria-label="Type" />
          <Select value={origin} options={ORIGINS} onChange={setOrigin} aria-label="Origine" />
          <Select value={since} options={PERIODS} onChange={setSince} aria-label="Période" />
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="#numéro, raison, ID du membre" className={cn(INPUT, "h-9 pl-8 text-xs")} />
          </div>
        </div>
        {!data ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : data.cases.length === 0 ? (
          <EmptyLine>Aucune sanction ne correspond.</EmptyLine>
        ) : (
          <motion.ul key={`${query}-${page}`} variants={pageStagger} initial="initial" animate="animate">
            {data.cases.map((c) => (
              <motion.li key={c.caseNumber} variants={staggerItem}>
                <button type="button" onClick={() => openDetail(c.caseNumber)} className="grid w-full grid-cols-[3.5rem_7.5rem_1fr] items-center gap-3 border-t border-[var(--panel-border)] px-4 py-2.5 text-left transition-colors first:border-t-0 hover:bg-[var(--surface-hover)] sm:grid-cols-[3.5rem_8rem_12rem_1fr_9rem]">
                  <span className="font-mono text-xs text-[var(--text-muted)]">#{c.caseNumber}</span>
                  <span className={cn("w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold", ACTION_TONE[c.action])}>{c.label}</span>
                  <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{c.userTag}</span>
                  <span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{c.reason}</span>
                  <span className="hidden text-right text-[11px] text-[var(--text-muted)] sm:block">
                    {when(c.createdAt)}
                    <span className={cn("ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle", c.open ? "bg-[var(--success)]" : "bg-[var(--text-muted)]/50")} />
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-border)] px-4 py-3">
          <span className="text-xs text-[var(--text-muted)]">
            {data?.total ?? 0} dossier{(data?.total ?? 0) > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => exportAs("csv")} disabled={!data?.total}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </GhostButton>
            <GhostButton onClick={() => exportAs("json")} disabled={!data?.total}>
              <Download className="h-3.5 w-3.5" />
              JSON
            </GhostButton>
            <span className="mx-1 h-5 w-px bg-[var(--panel-border)]" />
            <GhostButton onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              Précédent
            </GhostButton>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {page} / {data?.pages ?? 1}
            </span>
            <GhostButton onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.pages ?? 1)}>
              Suivant
            </GhostButton>
          </div>
        </div>
      </Panel>

      <NewSanction guildId={guildId} open={creating} onClose={() => setCreating(false)} onDone={() => (setCreating(false), void load())} />

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? `Dossier n°${detail.case.caseNumber}` : ""} subtitle={detail ? `${detail.case.label} · ${ORIGIN_LABEL[detail.case.origin]}` : undefined}
        footer={detail && detail.case.open && ["WARN", "TIMEOUT", "BAN", "TEMPBAN"].includes(detail.case.action) ? <PrimaryButton className="w-full bg-[var(--danger)] text-white" onClick={() => revoke(detail.case)}>Lever la sanction</PrimaryButton> : undefined}
      >
        {detail && (
          <>
            <Section label="Membre">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {detail.case.userTag} <span className="font-mono text-xs font-normal text-[var(--text-muted)]">{detail.case.userId}</span>
              </p>
            </Section>
            <Section label="Raison">
              <p className="text-sm text-[var(--text-primary)]">{detail.case.reason}</p>
              {detail.case.context && <p className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-muted)]">Contexte : {detail.case.context}</p>}
            </Section>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ["Par", detail.case.moderatorTag],
                ["Date", when(detail.case.createdAt)],
                ["État", detail.case.open ? "En cours" : detail.case.status === "REVOKED" ? "Levée" : "Close"],
                detail.case.severity ? ["Gravité", `${SEVERITIES.find(([s]) => s === detail.case.severity)?.[1]} · ${detail.case.points ?? 0} pt`] : null,
                detail.case.expiresAt ? ["Fin", when(detail.case.expiresAt)] : null,
                detail.appeal ? ["Appel", detail.appeal.status === "pending" ? "En attente" : detail.appeal.status === "accepted" ? "Accepté" : "Refusé"] : null,
              ]
                .filter((x): x is string[] => Boolean(x))
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-[var(--panel-border)] px-3 py-2">
                    <p className="text-[var(--text-muted)]">{k}</p>
                    <p className="mt-0.5 font-semibold text-[var(--text-primary)]">{v}</p>
                  </div>
                ))}
            </div>
            <Section label={`Historique du membre · ${detail.history.length}`}>
              {detail.history.length === 0 && detail.events.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Aucun autre dossier.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.history.map((h) => (
                    <li key={h.caseNumber}>
                      <button type="button" onClick={() => openDetail(h.caseNumber)} className="flex w-full items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left hover:bg-[var(--surface-hover)]">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", ACTION_TONE[h.action])}>{h.label}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]">{h.reason}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{when(h.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                  {detail.events.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 px-3 py-1 text-xs text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">{EVENT_LABEL[e.type] ?? e.type}</span>
                      {e.value !== undefined && <span className="truncate">{e.value ?? "pseudo retiré"}</span>}
                      <span className="ml-auto text-[10px]">{when(e.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </Drawer>
    </ConsolePage>
  );
}

function NewSanction({ guildId, open, onClose, onDone }: { guildId: string; open: boolean; onClose: () => void; onDone: () => void }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [member, setMember] = useState<MemberHit | null>(null);
  const [action, setAction] = useState<Action>("WARN");
  const [severity, setSeverity] = useState<Severity>("light");
  const [duration, setDuration] = useState(3600);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [reason, setReason] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    api<{ config: { presets: { reasons: Preset[] } } }>("/sanctions/config", { silent: true }).then((r) => setPresets(r?.config.presets.reasons ?? []));
    setMember(null);
    setReason("");
    setContext("");
    setPresetId("");
  }, [api, open]);

  const pickPreset = (id: string) => {
    setPresetId(id);
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    if (NEW_TYPES.some(([a]) => a === p.action)) setAction(p.action);
    setSeverity(p.severity);
    setDuration(p.durationSeconds);
  };
  const submit = async () => {
    if (!member) return;
    setBusy(true);
    const r = await api<{ case: { caseNumber: number } }>("/sanctions/cases", {
      method: "POST",
      json: {
        userId: member.id,
        action,
        reason,
        context: context || undefined,
        severity: action === "WARN" ? severity : undefined,
        durationSeconds: action === "TIMEOUT" || action === "TEMPBAN" ? duration : undefined,
        presetId: presetId || undefined,
      },
    });
    setBusy(false);
    if (r) {
      success("Sanction appliquée", `Dossier n°${r.case.caseNumber} pour ${member.displayName}.`);
      onDone();
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nouvelle sanction"
      subtitle="Etho l'applique sur Discord en quelques secondes, comme une commande."
      footer={
        <PrimaryButton className="w-full" onClick={submit} disabled={!member || busy}>
          {busy ? "Application…" : "Sanctionner"}
        </PrimaryButton>
      }
    >
      <Section label="Membre">
        <MemberSearch guildId={guildId} value={member} onChange={setMember} />
      </Section>
      {presets.length > 0 && (
        <Section label="Raison prédéfinie">
          <Select value={presetId} width="w-full" aria-label="Raison prédéfinie" options={[["", "Aucune"], ...presets.map((p) => [p.id, `${p.name}${p.category ? ` · ${p.category}` : ""}`] as const)]} onChange={pickPreset} />
        </Section>
      )}
      <Section label="Sanction">
        <Pills label="Sanction" options={NEW_TYPES} value={[action]} onChange={([a]) => setAction(a)} />
        <AnimatePresence mode="wait" initial={false}>
          {action === "WARN" && (
            <motion.div key="sev" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_LAYOUT}>
              <Segmented label="Gravité" value={severity} options={SEVERITIES} onChange={setSeverity} />
            </motion.div>
          )}
          {(action === "TIMEOUT" || action === "TEMPBAN") && (
            <motion.div key="dur" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_LAYOUT}>
              <Select value={duration} options={action === "TIMEOUT" ? DURATIONS : [...DURATIONS.slice(4), [2592000, "30 jours"], [7776000, "90 jours"]]} onChange={setDuration} aria-label="Durée" />
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
      <Section label="Raison">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} placeholder="Vue par le membre" className={cn(INPUT, "py-2")} />
        <textarea value={context} onChange={(e) => setContext(e.target.value)} maxLength={1000} rows={3} placeholder="Contexte, pour les modérateurs seulement (optionnel)" className={cn(INPUT, "py-2")} />
      </Section>
    </Drawer>
  );
}
