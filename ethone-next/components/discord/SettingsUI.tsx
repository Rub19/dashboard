"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Éléments communs aux pages de réglages façon « carte » (interrupteur, champ libellé, nombre). */
export const inputCls = "h-10 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--bg-surface)] px-3 text-sm text-white outline-none focus:border-[#5865F2]/70";

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50", checked ? "bg-[#5865F2]" : "bg-white/20")}>
      <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-300">{label}</p>
      {children}
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export function ToggleField({ label, text, checked, onChange, disabled }: { label: string; text: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
        <span className="text-sm text-zinc-300">{text}</span>
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
export function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="border-b border-white/10 pb-6 last:border-0">
      <h3 className="text-base font-bold text-white">{title}</h3>
      {text && <p className="mt-0.5 text-sm text-zinc-400">{text}</p>}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">{children}</div>
    </section>
  );
}
