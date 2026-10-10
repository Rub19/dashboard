"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "@/components/icons/ph";
import { GhostButton, RoleChips, Row, Segmented, Stepper, Switch, useGuildApi } from "../kit";

/** Types qu'Etho affiche dans la fenêtre Discord (les autres demanderaient une page web, réservée au staff). */
const TYPES: [string, string][] = [
  ["SHORT_TEXT", "Texte court"],
  ["LONG_TEXT", "Paragraphe"],
  ["NUMBER", "Nombre"],
  ["EMAIL", "E-mail"],
  ["URL", "Lien"],
];
const MODAL_TYPES = new Set(TYPES.map(([t]) => t));
const MAX_FIELDS = 5;

type Field = { id: string; type: string; label: string; description: string; placeholder: string; required: boolean; minLength?: number; maxLength?: number; sectionId: string; order: number; options: unknown[] };
type Panel = { channelId: string; embedTitle: string; embedDescription: string; embedColor: string; buttonText: string; buttonEmoji: string; submissionMode: string; [k: string]: unknown };
type AntiSpam = { cooldownMinutes: number; maxSubmissionsPerUser: number; minAccountAgeDays: number; minGuildMembershipDays: number; requiredRoleIds: string[]; forbiddenRoleIds: string[]; blacklistUserIds: string[] };
export type FullForm = { id: string; title: string; description: string; category: string; status: string; fields: Field[]; panelConfig: Panel; antiSpam: AntiSpam };

const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const small = "h-8 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const newId = () => `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Éditeur d'un formulaire : questions (fenêtre Discord), conditions pour répondre et panneau. Enregistrement unique. */
export default function FormEditor({ guildId, form, onSaved, onCancel }: { guildId: string; form: FullForm; onSaved: (f: FullForm) => void; onCancel: () => void }) {
  const api = useGuildApi(guildId);
  const [f, setF] = useState<FullForm>(() => structuredClone(form));
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<FullForm>) => setF((x) => ({ ...x, ...patch }));
  const setField = (i: number, patch: Partial<Field>) => set({ fields: f.fields.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const list = [...f.fields];
    const [it] = list.splice(i, 1);
    list.splice(i + dir, 0, it);
    set({ fields: list.map((x, k) => ({ ...x, order: k })) });
  };

  const incompatible = f.fields.length > MAX_FIELDS || f.fields.some((x) => !MODAL_TYPES.has(x.type));
  const save = async () => {
    setBusy(true);
    const r = await api<{ form: FullForm }>(`/forms/${f.id}`, {
      method: "PUT",
      json: {
        title: f.title.trim(),
        description: f.description,
        category: f.category,
        fields: f.fields.map((x, k) => ({ ...x, order: k, label: x.label.trim() })),
        antiSpam: f.antiSpam,
        // Fenêtre Discord : les membres répondent sans quitter Discord.
        panelConfig: { ...f.panelConfig, submissionMode: "MODAL" },
      },
    });
    setBusy(false);
    if (r?.form) onSaved(r.form);
  };

  return (
    <>
      <Row label="Titre" hint="Les 45 premiers caractères s'affichent en haut de la fenêtre Discord.">
        <input value={f.title} maxLength={100} onChange={(e) => set({ title: e.target.value })} aria-label="Titre" className={`${field} h-9 py-0`} />
      </Row>
      <Row label="Description">
        <textarea value={f.description} maxLength={1000} rows={2} onChange={(e) => set({ description: e.target.value })} aria-label="Description" className={field} />
      </Row>

      <div className="border-t border-[var(--panel-border)] px-5 py-3.5">
        <p className="mb-1 text-[13px] font-semibold text-[var(--text-primary)]">Questions</p>
        <p className="mb-2 text-[11px] text-[var(--text-muted)]">Discord affiche 5 questions au maximum dans sa fenêtre de réponse.</p>
        {incompatible && (
          <p className="mb-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/[0.06] px-3 py-2 text-[11px] text-[var(--warning)]">
            Ce formulaire a plus de 5 questions ou des types que Discord n&apos;affiche pas : les membres ne peuvent pas y répondre. Garde 5 questions de texte au maximum.
          </p>
        )}
        <div className="space-y-2">
          {f.fields.map((q, i) => (
            <div key={q.id} className="space-y-1.5 rounded-lg border border-[var(--panel-border)] p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-5 text-center text-xs font-bold text-[var(--text-muted)]">{i + 1}</span>
                <input value={q.label} maxLength={45} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Question" aria-label={`Question ${i + 1}`} className={`${small} min-w-0 flex-1 text-sm`} />
                <select value={MODAL_TYPES.has(q.type) ? q.type : ""} onChange={(e) => setField(i, { type: e.target.value })} aria-label="Type de réponse" className={small}>
                  {!MODAL_TYPES.has(q.type) && <option value="">Type non affiché par Discord</option>}
                  {TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={i === f.fields.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => set({ fields: f.fields.filter((_, j) => j !== i) })} aria-label="Retirer la question" className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--danger)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <input value={q.placeholder} maxLength={100} onChange={(e) => setField(i, { placeholder: e.target.value })} placeholder="Exemple de réponse (facultatif)" aria-label="Exemple de réponse" className={`${small} min-w-0 flex-1`} />
                <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <Switch checked={q.required} onChange={(v) => setField(i, { required: v })} label="Obligatoire" />
                  Obligatoire
                </label>
                {(q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    Longueur max
                    <input
                      type="number"
                      min={1}
                      max={q.type === "LONG_TEXT" ? 4000 : 400}
                      value={q.maxLength ?? ""}
                      onChange={(e) => setField(i, { maxLength: e.target.value ? Math.max(1, Math.min(q.type === "LONG_TEXT" ? 4000 : 400, Number(e.target.value))) : undefined })}
                      aria-label="Longueur maximale"
                      className={`${small} w-20`}
                    />
                  </span>
                )}
              </div>
            </div>
          ))}
          {f.fields.length < MAX_FIELDS && (
            <GhostButton
              onClick={() =>
                set({ fields: [...f.fields, { id: newId(), type: "SHORT_TEXT", label: "", description: "", placeholder: "", required: true, sectionId: f.fields[0]?.sectionId ?? "section-1", order: f.fields.length, options: [] }] })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Question
            </GhostButton>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--panel-border)]">
        <Row label="Délai entre deux réponses" hint="Par membre.">
          <Segmented
            label="Délai"
            value={[0, 60, 1440, 10080].includes(f.antiSpam.cooldownMinutes) ? f.antiSpam.cooldownMinutes : 1440}
            options={[
              [0, "Aucun"],
              [60, "1 h"],
              [1440, "1 jour"],
              [10080, "7 jours"],
            ]}
            onChange={(v) => set({ antiSpam: { ...f.antiSpam, cooldownMinutes: v } })}
          />
        </Row>
        <Row label="Réponses par membre">
          <Stepper value={f.antiSpam.maxSubmissionsPerUser} min={1} max={20} unit="réponse(s)" onCommit={(n) => set({ antiSpam: { ...f.antiSpam, maxSubmissionsPerUser: n } })} />
        </Row>
        <Row label="Compte Discord créé depuis">
          <Stepper value={f.antiSpam.minAccountAgeDays} min={0} max={365} unit="jours" onCommit={(n) => set({ antiSpam: { ...f.antiSpam, minAccountAgeDays: n } })} />
        </Row>
        <Row label="Sur le serveur depuis">
          <Stepper value={f.antiSpam.minGuildMembershipDays} min={0} max={365} unit="jours" onCommit={(n) => set({ antiSpam: { ...f.antiSpam, minGuildMembershipDays: n } })} />
        </Row>
        <Row label="Rôles requis" hint="Vide : tout le monde.">
          <RoleChips guildId={guildId} ids={f.antiSpam.requiredRoleIds} onChange={(ids) => set({ antiSpam: { ...f.antiSpam, requiredRoleIds: ids } })} />
        </Row>
        <Row label="Rôles exclus">
          <RoleChips guildId={guildId} ids={f.antiSpam.forbiddenRoleIds} onChange={(ids) => set({ antiSpam: { ...f.antiSpam, forbiddenRoleIds: ids } })} />
        </Row>
      </div>

      <div className="border-t border-[var(--panel-border)]">
        <Row label="Titre du panneau">
          <input value={f.panelConfig.embedTitle} maxLength={256} onChange={(e) => set({ panelConfig: { ...f.panelConfig, embedTitle: e.target.value } })} aria-label="Titre du panneau" className={`${field} h-9 py-0`} />
        </Row>
        <Row label="Texte du panneau">
          <textarea value={f.panelConfig.embedDescription} maxLength={2000} rows={2} onChange={(e) => set({ panelConfig: { ...f.panelConfig, embedDescription: e.target.value } })} aria-label="Texte du panneau" className={field} />
        </Row>
        <Row label="Bouton">
          <div className="flex flex-wrap items-center gap-2">
            <input value={f.panelConfig.buttonEmoji} maxLength={32} onChange={(e) => set({ panelConfig: { ...f.panelConfig, buttonEmoji: e.target.value } })} aria-label="Emoji du bouton" className={`${small} w-14 text-center`} />
            <input value={f.panelConfig.buttonText} maxLength={80} onChange={(e) => set({ panelConfig: { ...f.panelConfig, buttonText: e.target.value } })} aria-label="Texte du bouton" className={`${small} w-48`} />
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(f.panelConfig.embedColor) ? f.panelConfig.embedColor : "#6366f1"}
              onChange={(e) => set({ panelConfig: { ...f.panelConfig, embedColor: e.target.value } })}
              aria-label="Couleur du panneau"
              className="h-8 w-9 cursor-pointer rounded border border-[var(--panel-border)] bg-transparent"
            />
          </div>
        </Row>
      </div>

      <div className="flex items-center gap-1.5 border-t border-[var(--panel-border)] px-5 py-3">
        <button
          type="button"
          disabled={busy || !f.title.trim() || f.fields.length === 0 || f.fields.some((x) => !x.label.trim()) || incompatible}
          onClick={save}
          className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        <GhostButton onClick={onCancel}>Fermer</GhostButton>
      </div>
    </>
  );
}
