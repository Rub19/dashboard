"use client";

import { useCallback, useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Hash, Loader2, Plus, Search, Volume2, X } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT, SPRING_PILL, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { fetchGuildRoles, type RoleOption } from "../RolePicker";
import { fetchGuildChannels, type ChannelOption } from "../ChannelPicker";

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

/** Page de la console : titre puis blocs qui entrent en cascade (Panel = staggerItem), sauf mouvement réduit. */
export function ConsolePage({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={pageStagger}
      initial={reduced ? false : "initial"}
      animate="animate"
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
    <motion.section variants={staggerItem} className={cn("overflow-visible rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]", className)}>
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
    </motion.section>
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

/** Bouton « + … » qui ouvre une recherche en popover (format Keeper), partagé par les sélecteurs de membre et de rôle. */
function SearchPopover({
  label,
  disabled,
  placeholder,
  loading,
  q,
  setQ,
  open,
  setOpen,
  children,
}: {
  label: string;
  disabled?: boolean;
  placeholder: string;
  loading?: boolean;
  q: string;
  setQ: (v: string) => void;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

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
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />}
            </div>
            <ul className="max-h-72 overflow-y-auto p-1.5">{children}</ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PICK_ROW = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--text-primary)]/[0.07]";
const PickNote = ({ children }: { children: ReactNode }) => <li className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">{children}</li>;

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
    <SearchPopover label={label} disabled={disabled} placeholder="Rechercher un membre ou coller un ID" loading={loading} q={q} setQ={setQ} open={open} setOpen={setOpen}>
      {q.trim().length < 2 ? (
        <PickNote>Tape au moins deux lettres ou colle un identifiant.</PickNote>
      ) : !loading && hits.length === 0 ? (
        <PickNote>Aucun membre trouvé.</PickNote>
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
              className={PICK_ROW}
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
    </SearchPopover>
  );
}

/** « + Rôle » : liste filtrable des rôles du serveur (cache partagé avec les autres sélecteurs de rôle). */
export function RoleAdder({
  guildId,
  onPick,
  excludeIds = [],
  disabled,
  label = "Rôle",
}: {
  guildId: string;
  onPick: (r: RoleOption) => void;
  excludeIds?: string[];
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [roles, setRoles] = useState<RoleOption[] | null>(null);

  useEffect(() => {
    if (!open || roles) return;
    let cancelled = false;
    fetchGuildRoles(guildId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => {
      cancelled = true;
    };
  }, [guildId, open, roles]);

  const query = q.trim().toLowerCase();
  const shown = (roles ?? []).filter((r) => !excludeIds.includes(r.id) && (!query || r.name.toLowerCase().includes(query) || r.id === query));

  return (
    <SearchPopover label={label} disabled={disabled} placeholder="Rechercher un rôle ou coller un ID" loading={open && !roles} q={q} setQ={setQ} open={open} setOpen={setOpen}>
      {!roles ? null : shown.length === 0 ? (
        <PickNote>Aucun rôle trouvé.</PickNote>
      ) : (
        shown.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                onPick(r);
                setOpen(false);
                setQ("");
              }}
              className={PICK_ROW}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: roleColor(r.color) }} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{r.name}</span>
            </button>
          </li>
        ))
      )}
    </SearchPopover>
  );
}

/** « + Salon » : salons textuels et vocaux du serveur (hors catégories et fils), filtrables par nom. */
export function ChannelAdder({
  guildId,
  onPick,
  excludeIds = [],
  disabled,
  label = "Salon",
}: {
  guildId: string;
  onPick: (c: ChannelOption) => void;
  excludeIds?: string[];
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [channels, setChannels] = useState<ChannelOption[] | null>(null);

  useEffect(() => {
    if (!open || channels) return;
    let cancelled = false;
    fetchGuildChannels(guildId).then((c) => {
      if (!cancelled) setChannels(c.filter((x) => x.type !== 4 && x.type !== 10 && x.type !== 11 && x.type !== 12));
    });
    return () => {
      cancelled = true;
    };
  }, [guildId, open, channels]);

  const query = q.trim().toLowerCase();
  const shown = (channels ?? []).filter((c) => !excludeIds.includes(c.id) && (!query || c.name.toLowerCase().includes(query) || c.id === query));

  return (
    <SearchPopover label={label} disabled={disabled} placeholder="Rechercher un salon ou coller un ID" loading={open && !channels} q={q} setQ={setQ} open={open} setOpen={setOpen}>
      {!channels ? null : shown.length === 0 ? (
        <PickNote>Aucun salon trouvé.</PickNote>
      ) : (
        shown.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                onPick(c);
                setOpen(false);
                setQ("");
              }}
              className={PICK_ROW}
            >
              {c.type === 2 || c.type === 13 ? (
                <Volume2 className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              ) : (
                <Hash className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              )}
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{c.name}</span>
            </button>
          </li>
        ))
      )}
    </SearchPopover>
  );
}

/** Choix exclusif en pilule (format Keeper) : « Comme d'origine | Rôles choisis », « 1 2 3 4 5 »… */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: ReadonlyArray<readonly [T, ReactNode]>;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-[var(--panel-border)] p-0.5">
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => value !== v && onChange(v)}
          className={cn(
            "relative min-w-8 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
            value === v ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {value === v && <motion.span layoutId={`seg-${id}`} transition={SPRING_PILL} className="absolute inset-0 rounded-md bg-[var(--surface-hover)]" />}
          <span className="relative">{text}</span>
        </button>
      ))}
    </div>
  );
}

/** Pastille retirable (rôle, salon). */
export function Chip({ label, onRemove, children }: { label: string; onRemove: () => void; children?: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] py-1 pl-2 pr-1 text-xs text-[var(--text-primary)]">
      {children}
      <span className="max-w-40 truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`Retirer ${label}`} className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export const roleColor = (c?: string | number) => {
  if (typeof c === "string" && c.startsWith("#")) return c;
  const n = typeof c === "number" ? c : parseInt(String(c ?? ""), 10);
  return n > 0 ? `#${n.toString(16).padStart(6, "0")}` : "var(--text-muted)";
};

/** Liste de rôles en pastilles + « Ajouter un rôle ». Les noms viennent du cache de rôles partagé. */
export function RoleChips({
  guildId,
  ids,
  onChange,
  max,
  addLabel = "Rôle",
}: {
  guildId: string;
  ids: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  addLabel?: string;
}) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  useEffect(() => {
    fetchGuildRoles(guildId).then(setRoles);
  }, [guildId]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => {
        const r = roles.find((x) => x.id === id);
        return (
          <Chip key={id} label={r?.name ?? id} onRemove={() => onChange(ids.filter((x) => x !== id))}>
            <span className="h-2 w-2 rounded-full" style={{ background: roleColor(r?.color) }} />
          </Chip>
        );
      })}
      {(max === undefined || ids.length < max) && <RoleAdder guildId={guildId} label={addLabel} excludeIds={ids} onPick={(r) => onChange(max === 1 ? [r.id] : [...ids, r.id])} />}
    </div>
  );
}
