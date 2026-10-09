"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, useGuildApi } from "../kit";

type FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
type RespStatus = "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "ARCHIVED" | "SPAM";
type Form = { id: string; title: string; description: string; category: string; status: FormStatus; fields: unknown[]; panelConfig: { channelId: string; messageId?: string }; updatedAt: string };
type Answer = { fieldId: string; fieldLabel: string; value: unknown };
type Resp = { id: string; formId: string; userId: string; userTag: string; answers: Answer[]; status: RespStatus; decisionReason?: string; submittedAt: string; reviewedAt?: string; assignedReviewerTag?: string };
type Stats = { totalForms: number; activeForms: number; totalResponses: number; pendingReviews: number; approvedCount: number; rejectedCount: number };

const FORM_STATUS: Record<FormStatus, string> = { DRAFT: "Brouillon", PUBLISHED: "Publié", CLOSED: "Fermé", ARCHIVED: "Archivé" };
const RESP_STATUS: Record<RespStatus, string> = {
  PENDING: "En attente",
  REVIEWING: "En cours d'examen",
  APPROVED: "Acceptée",
  REJECTED: "Refusée",
  CHANGES_REQUESTED: "Modifs demandées",
  ARCHIVED: "Archivée",
  SPAM: "Spam",
};
const DECISIONS: [RespStatus, string][] = [
  ["APPROVED", "Accepter"],
  ["REJECTED", "Refuser"],
  ["CHANGES_REQUESTED", "Demander des modifs"],
  ["SPAM", "Spam"],
];
const FILTERS = {
  todo: (s: RespStatus) => s === "PENDING" || s === "REVIEWING" || s === "CHANGES_REQUESTED",
  yes: (s: RespStatus) => s === "APPROVED",
  no: (s: RespStatus) => s === "REJECTED" || s === "SPAM",
  all: () => true,
};

const showValue = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Formulaires (format Keeper) : formulaires du serveur, panneau Discord et traitement des réponses. */
export default function ConsoleForms({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [forms, setForms] = useState<Form[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Resp[] | null>(null);
  const [filter, setFilter] = useState<keyof typeof FILTERS>("todo");
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [openResp, setOpenResp] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [panelChannel, setPanelChannel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ stats: Stats; forms: Form[] }>("/forms/overview");
    setForms(r?.forms ?? []);
    if (r) setStats(r.stats);
    setFormId((cur) => cur ?? r?.forms?.find((f) => f.status === "PUBLISHED")?.id ?? r?.forms?.[0]?.id ?? null);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!formId) return;
    setResponses(null);
    api<{ responses: Resp[] }>(`/forms/${formId}/responses`).then((r) => setResponses(r?.responses ?? []));
  }, [api, formId]);

  const replaceForm = (f?: Form) => f && setForms((l) => l?.map((x) => (x.id === f.id ? f : x)) ?? null);
  const publish = async (f: Form) => {
    setBusy(true);
    const r = await api<{ form: Form }>(`/forms/${f.id}/publish`, { method: "POST" });
    setBusy(false);
    replaceForm(r?.form);
  };
  const sendPanel = async (f: Form) => {
    setBusy(true);
    const r = await api<{ form?: Form }>(`/forms/${f.id}/panel/publish`, { method: "POST", json: { channelId: panelChannel || f.panelConfig.channelId } });
    setBusy(false);
    if (r) void load();
  };
  const duplicate = async (f: Form) => {
    const r = await api<{ form: Form }>(`/forms/${f.id}/duplicate`, { method: "POST", json: { title: `${f.title} (copie)` } });
    if (r?.form) setForms((l) => [...(l ?? []), r.form]);
  };
  const remove = async (f: Form) => {
    if (!(await confirmDialog(`Supprimer le formulaire « ${f.title} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/forms/${f.id}`, { method: "DELETE" })) {
      setForms((l) => l?.filter((x) => x.id !== f.id) ?? null);
      if (formId === f.id) setFormId(null);
    }
  };
  const review = async (r: Resp, status: RespStatus) => {
    setBusy(true);
    const res = await api<{ response: Resp }>(`/forms/${r.formId}/responses/${r.id}/review`, { method: "POST", json: { status, decisionReason: reason.trim() || undefined } });
    setBusy(false);
    if (res?.response) {
      setResponses((l) => l?.map((x) => (x.id === r.id ? res.response : x)) ?? null);
      setOpenResp(null);
      api<{ stats: Stats }>("/forms/overview", { silent: true }).then((o) => o && setStats(o.stats));
    }
  };

  const shown = (responses ?? []).filter((r) => FILTERS[filter](r.status)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const current = forms?.find((f) => f.id === formId) ?? null;

  return (
    <ConsolePage
      title="Formulaires"
      actions={
        <Link href={`/discord/forms/create?guildId=${guildId}`} className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          Nouveau formulaire
        </Link>
      }
    >
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Publiés" value={stats ? stats.activeForms : "—"} hint={stats ? `sur ${stats.totalForms}` : undefined} />
        <StatTile label="À traiter" value={stats?.pendingReviews ?? "—"} />
        <StatTile label="Acceptées" value={stats?.approvedCount ?? "—"} />
        <StatTile label="Refusées" value={stats?.rejectedCount ?? "—"} />
      </motion.div>

      <Panel title="Formulaires du serveur">
        {!forms ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : forms.length === 0 ? (
          <EmptyLine>Aucun formulaire. Crée-en un avec « Nouveau formulaire ».</EmptyLine>
        ) : (
          <ul>
            {forms.map((f) => (
              <li key={f.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                <button
                  type="button"
                  onClick={() => {
                    setOpenForm(openForm === f.id ? null : f.id);
                    setPanelChannel(f.panelConfig.channelId || "");
                  }}
                  aria-expanded={openForm === f.id}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{f.title}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      <span className={cn(f.status === "PUBLISHED" && "text-[var(--success)]")}>{FORM_STATUS[f.status]}</span> · {f.fields.length} question{f.fields.length > 1 ? "s" : ""} · {f.category} · modifié{" "}
                      {sinceLabel(f.updatedAt)}
                    </p>
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {openForm === f.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                      <div className="border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40">
                        <Row label="Panneau Discord" hint={f.panelConfig.messageId ? "Déjà envoyé : un nouvel envoi poste un nouveau panneau." : "Message avec le bouton pour répondre au formulaire."}>
                          <div className="flex flex-wrap items-center gap-2">
                            <ChannelPicker guildId={guildId} value={panelChannel} filterTypes={[0, 5]} placeholder="Choisir un salon" onChange={(id) => setPanelChannel(id)} />
                            <GhostButton disabled={busy || f.status !== "PUBLISHED" || !(panelChannel || f.panelConfig.channelId)} onClick={() => sendPanel(f)}>
                              Envoyer
                            </GhostButton>
                          </div>
                          {f.status !== "PUBLISHED" && <p className="mt-1 text-[11px] text-[var(--warning)]">Publie le formulaire avant d&apos;envoyer son panneau.</p>}
                        </Row>
                        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
                          {f.status !== "PUBLISHED" && (
                            <GhostButton disabled={busy} onClick={() => publish(f)}>
                              Publier
                            </GhostButton>
                          )}
                          <GhostButton onClick={() => setFormId(f.id)}>Voir les réponses</GhostButton>
                          <Link href={`/discord/forms/${f.id}?guildId=${guildId}`} className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                            Modifier les questions
                          </Link>
                          <GhostButton onClick={() => duplicate(f)}>Dupliquer</GhostButton>
                          <span className="flex-1" />
                          <GhostButton onClick={() => remove(f)}>Supprimer</GhostButton>
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

      {current && (
        <Panel
          title={`Réponses · ${current.title}`}
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
          {!responses ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : shown.length === 0 ? (
            <EmptyLine>{responses.length === 0 ? "Aucune réponse pour l'instant." : "Rien dans cette liste."}</EmptyLine>
          ) : (
            <ul>
              {shown.map((r) => (
                <li key={r.id} className="border-t border-[var(--panel-border)] first:border-t-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenResp(openResp === r.id ? null : r.id);
                      setReason(r.decisionReason ?? "");
                    }}
                    aria-expanded={openResp === r.id}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-hover)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{r.userTag}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {RESP_STATUS[r.status]} · envoyée {sinceLabel(r.submittedAt)}
                        {r.assignedReviewerTag ? ` · ${r.assignedReviewerTag}` : ""}
                      </p>
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {openResp === r.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
                        <div className="space-y-3 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 px-5 py-4">
                          <dl className="space-y-2">
                            {r.answers.map((a) => (
                              <div key={a.fieldId}>
                                <dt className="text-[11px] font-semibold text-[var(--text-muted)]">{a.fieldLabel}</dt>
                                <dd className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{showValue(a.value)}</dd>
                              </div>
                            ))}
                          </dl>
                          <textarea
                            value={reason}
                            maxLength={1000}
                            rows={2}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Raison (facultatif), envoyée au membre avec la décision"
                            className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                          />
                          <div className="flex flex-wrap items-center gap-1.5">
                            {DECISIONS.map(([st, label]) => (
                              <button
                                key={st}
                                type="button"
                                disabled={busy}
                                onClick={() => review(r, st)}
                                className={cn(
                                  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                                  r.status === st ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                              >
                                {label}
                              </button>
                            ))}
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
      )}
    </ConsolePage>
  );
}
