"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Éléments communs aux pages de réglages façon « carte » (interrupteur, champ libellé, nombre). */
export const inputCls = "h-10 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50", checked ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/20")}>
      <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-primary)]/80">{label}</p>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function ToggleField({ label, text, checked, onChange, disabled }: { label: string; text: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
        <span className="text-sm text-[var(--text-primary)]/80">{text}</span>
      </div>
    </Field>
  );
}

export function NumberField({ label, value, min, max, onChange, hint, disabled }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; hint?: string; disabled?: boolean }) {
  return (
    <Field label={label} hint={hint}>
      <input type="number" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className={inputCls} />
    </Field>
  );
}

/** Bloc titré : titre + sous-titre à gauche, contenu en grille (1 ou 2 colonnes) dessous. */
export function Section({ title, text, children, id }: { title: string; text?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-[var(--panel-border)] pb-6 last:border-0">
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
      {text && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{text}</p>}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">{children}</div>
    </section>
  );
}
