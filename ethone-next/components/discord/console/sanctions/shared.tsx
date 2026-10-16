"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { useGuildApi, type MemberHit } from "../kit";

export type Severity = "light" | "medium" | "grave";
export type Action = "WARN" | "NOTE" | "TIMEOUT" | "UNTIMEOUT" | "KICK" | "SOFTBAN" | "BAN" | "TEMPBAN" | "UNBAN" | "QUARANTINE";

export const ACTION_LABEL: Record<Action, string> = {
  WARN: "Avertissement",
  NOTE: "Note",
  TIMEOUT: "Mute",
  UNTIMEOUT: "Fin de mute",
  KICK: "Expulsion",
  SOFTBAN: "Softban",
  BAN: "Bannissement",
  TEMPBAN: "Ban temporaire",
  UNBAN: "Débannissement",
  QUARANTINE: "Quarantaine",
};

export const ACTION_TONE: Record<Action, string> = {
  WARN: "bg-amber-500/15 text-amber-300",
  NOTE: "bg-sky-500/15 text-sky-300",
  TIMEOUT: "bg-orange-500/15 text-orange-300",
  UNTIMEOUT: "bg-emerald-500/15 text-emerald-300",
  KICK: "bg-orange-500/15 text-orange-300",
  SOFTBAN: "bg-rose-500/15 text-rose-300",
  BAN: "bg-rose-500/15 text-rose-300",
  TEMPBAN: "bg-rose-500/15 text-rose-300",
  UNBAN: "bg-emerald-500/15 text-emerald-300",
  QUARANTINE: "bg-violet-500/15 text-violet-300",
};

export const SEVERITIES: ReadonlyArray<readonly [Severity, string]> = [
  ["light", "Légère"],
  ["medium", "Moyenne"],
  ["grave", "Grave"],
];

export const DURATIONS: ReadonlyArray<readonly [number, string]> = [
  [60, "1 minute"],
  [300, "5 minutes"],
  [600, "10 minutes"],
  [1800, "30 minutes"],
  [3600, "1 heure"],
  [10800, "3 heures"],
  [21600, "6 heures"],
  [43200, "12 heures"],
  [86400, "1 jour"],
  [259200, "3 jours"],
  [604800, "7 jours"],
  [1209600, "14 jours"],
  [2419200, "28 jours"],
];

export const EXPIRY_DAYS: ReadonlyArray<readonly [number, string]> = [
  [0, "Jamais"],
  [1, "Après 1 jour"],
  [3, "Après 3 jours"],
  [7, "Après 7 jours"],
  [14, "Après 14 jours"],
  [30, "Après 30 jours"],
  [60, "Après 60 jours"],
  [90, "Après 90 jours"],
  [180, "Après 180 jours"],
  [365, "Après 1 an"],
];

export const INPUT =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--accent-primary)]/70";

export function PageTitle({ title, text }: { title: string; text: string }) {
  return (
    <span className="block">
      {title}
      <span className="mt-1 block max-w-xl text-sm font-normal tracking-normal text-[var(--text-muted)]">{text}</span>
    </span>
  );
}

/** Boutons à choix unique (format Keeper) : vert plein quand choisi. */
export function Pills<T extends string>({ options, value, onChange, label }: { options: ReadonlyArray<readonly [T, string]>; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([v, text]) => {
        const on = value.includes(v);
        return (
          <motion.button
            key={v}
            type="button"
            whileTap={{ scale: 0.95 }}
            aria-pressed={on}
            onClick={() => onChange([v])}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors",
              on ? "border-transparent bg-[var(--success)] text-black" : "border-[var(--panel-border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            )}
          >
            {text}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Choix multiple en pastilles vertes (Sanctions concernées…). */
export function MultiPills<T extends string>({ options, value, onChange, label }: { options: ReadonlyArray<readonly [T, string]>; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([v, text]) => {
        const on = value.includes(v);
        return (
          <motion.button
            key={v}
            type="button"
            whileTap={{ scale: 0.95 }}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors",
              on ? "border-transparent bg-[var(--success)] text-black" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {text}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Panneau latéral (Nouvelle sanction, Nouvelle raison, détail d'un dossier). */
export function Drawer({ open, onClose, title, subtitle, footer, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; footer?: ReactNode; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <motion.aside
            role="dialog"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--panel-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <footer className="border-t border-[var(--panel-border)] px-5 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[12px] font-semibold text-[var(--text-muted)]">{label}</p>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn("flex items-center justify-center gap-1.5 rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-semibold text-black transition-[filter,opacity] hover:brightness-110 disabled:opacity-50", className)}
    >
      {children}
    </motion.button>
  );
}

/** Recherche d'un membre en ligne (format Keeper : champ de recherche puis liste). */
export function MemberSearch({ guildId, value, onChange }: { guildId: string; value: MemberHit | null; onChange: (m: MemberHit | null) => void }) {
  const api = useGuildApi(guildId);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (value || q.trim().length < 2) return setHits([]);
    const t = window.setTimeout(async () => {
      setLoading(true);
      const r = await api<{ members: MemberHit[] }>(`/console/members/search?q=${encodeURIComponent(q.trim())}`, { silent: true });
      setLoading(false);
      setHits(r?.members ?? []);
    }, 200);
    return () => window.clearTimeout(t);
  }, [api, q, value]);
  if (value)
    return (
      <motion.div layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-lg border border-[var(--panel-border)] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{value.displayName}</p>
          <p className="truncate text-[11px] text-[var(--text-muted)]">@{value.username} · {value.id}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label="Changer de membre" className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou identifiant du membre" className={cn(INPUT, "h-11 pl-9")} />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />}
      </div>
      <AnimatePresence initial={false}>
        {hits.length > 0 && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="max-h-64 overflow-y-auto rounded-lg border border-[var(--panel-border)] p-1">
            {hits.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onChange(m)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-[var(--surface-hover)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.displayName}</span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">@{m.username}</span>
                  </span>
                  {m.bot && <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">Bot</span>}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Réglages de sanctions du serveur : chargés une fois, enregistrés 600 ms après le dernier changement. */
export function useSanctionConfig<T extends Record<string, unknown>>(guildId: string) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<T | null>(null);
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const pending = useRef<Partial<T>>({});
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    api<{ config: T }>("/sanctions/config").then((r) => r && setCfg(r.config));
  }, [api]);
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;
    const r = await api<{ config: T }>("/sanctions/config", { method: "PUT", json: body });
    if (r) setCfg((c) => (c ? { ...r.config } : c));
    setSaving(r ? "saved" : "idle");
  }, [api]);
  useEffect(() => () => void (timer.current !== undefined && flush()), [flush]);
  /** Remplace une section entière (objet complet) et planifie l'enregistrement. */
  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setCfg((c) => (c ? { ...c, [key]: value } : c));
      pending.current = { ...pending.current, [key]: value };
      setSaving("pending");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 600);
    },
    [flush]
  );
  const status = saving === "pending" ? "Enregistrement…" : saving === "saved" ? "Enregistré" : "";
  return { cfg, set, status };
}

export const SavingBadge = ({ text }: { text: string }) => (
  <AnimatePresence mode="wait">
    {text && (
      <motion.span key={text} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_PILL} className="self-start text-xs text-[var(--text-muted)]">
        {text}
      </motion.span>
    )}
  </AnimatePresence>
);

export const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
