"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Plus, Search } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

/** Boîte à outils des pages de la console au format Keeper : page, blocs, lignes de réglage, interrupteur, sélecteurs. */

export const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

/** Appel à l'API du bot pour un serveur : session incluse, erreur lisible. */
export function useGuildApi(guildId: string) {
  const { error: toastError } = useToast();
  return useCallback(
    async <T,>(path: string, init?: RequestInit & { json?: unknown; silent?: boolean }): Promise<T | null> => {
      if (!BOT_API_URL) return null;
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}${path}`, {
          ...init,
          credentials: "include",
          headers: init?.json !== undefined ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
          body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
        return data as T;
      } catch (err) {
        if (!init?.silent) toastError("Etho", err instanceof Error ? err.message : "Bot injoignable");
        return null;
      }
    },
    [guildId, toastError]
  );
}

export function ConsolePage({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_LAYOUT}
      className="mx-auto w-full max-w-4xl space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{title}</h1>
        {actions}
      </div>
      {children}
    </motion.div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-visible rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-center gap-2 border-t border-[var(--panel-border)] px-5 py-3.5 first:border-t-0 sm:grid-cols-[14rem_1fr]">
      <div>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</span>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-center text-xs text-[var(--text-muted)]">{children}</p>;
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[var(--success)]" : "bg-[var(--panel-border)]"
      )}
    >
      <motion.span
        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow"
        initial={false}
        animate={{ x: checked ? 16 : 0 }}
        transition={SPRING_PRESS}
      />
    </button>
  );
}

export function GhostButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-hover)] active:scale-[0.97] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export type MemberHit = { id: string; username: string; displayName: string; avatarUrl: string; bot: boolean };

/** « + Ajouter » : recherche un membre du serveur (au moins 2 lettres) ou accepte un identifiant collé. */
export function MemberPicker({
  guildId,
  label = "Ajouter",
  onPick,
  excludeIds = [],
  disabled,
  humansOnly,
}: {
  guildId: string;
  label?: string;
  onPick: (m: MemberHit) => void;
  excludeIds?: string[];
  disabled?: boolean;
  humansOnly?: boolean;
}) {
  const api = useGuildApi(guildId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (!open || query.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(async () => {
      const data = await api<{ members: MemberHit[] }>(`/console/members/search?q=${encodeURIComponent(query)}`, { silent: true });
      setHits((data?.members ?? []).filter((m) => !excludeIds.includes(m.id) && (!humansOnly || !m.bot)));
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [api, excludeIds, humansOnly, open, q]);

  return (
    <div ref={boxRef} className="relative">
      <GhostButton onClick={() => setOpen((v) => !v)} disabled={disabled}>
        <Plus className="h-3.5 w-3.5" />
        {label}
      </GhostButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={SPRING_LAYOUT}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] shadow-2xl"
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--panel-border)] px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                placeholder="Rechercher un membre ou coller un ID"
                aria-label="Rechercher un membre ou coller un ID"
                className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />}
            </div>
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {q.trim().length < 2 ? (
                <li className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">Tape au moins deux lettres ou colle un identifiant.</li>
              ) : !loading && hits.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">Aucun membre trouvé.</li>
              ) : (
                hits.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(m);
                        setOpen(false);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--text-primary)]/[0.07]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.avatarUrl} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)]">{m.displayName}</span>
                        <span className="block truncate text-[11px] text-[var(--text-muted)]">
                          @{m.username} · ID {m.id}
                        </span>
                      </span>
                      {m.bot && <span className="shrink-0 rounded-md bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">Bot</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
