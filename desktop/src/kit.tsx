import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Select from "./Select";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, ChevronRight, Crosshair, Flag, RefreshCw, X } from "lucide-react";
import { errorText, lang, t, tr } from "./i18n";
import { filterActive, MatchFilter, NO_FILTER, ResultFilter, timeAgo } from "./match-filter";
import { listItem, listStagger, SPRING_PILL } from "./motion";
import { Button } from "./ui";

export function MatchCard({ mode, at, headIcon, banner, portrait, round, title, chips, result, kda, middle, last, onOpen, onPortraitError }: { mode: string; at?: string | null; headIcon?: ReactNode; banner?: string; portrait?: string; round?: boolean; title: string; chips?: ReactNode; result: "win" | "loss" | "draw"; kda: string; middle: ReactNode; last: ReactNode; onOpen: () => void; onPortraitError?: (image: HTMLImageElement) => void }) {
  return (
    <motion.li variants={listItem}>
      <button type="button" className={`match-card ${result}`} onClick={onOpen}>
        <span className="match-card-head">
          {headIcon && <span className="match-card-icon">{headIcon}</span>}
          <span><b>{mode}</b><small>{timeAgo(at, Date.now(), lang === "fr" ? "fr" : "en")}</small></span>
        </span>
        <span className="match-card-banner">
          {banner && <img className="match-card-map" src={banner} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
          {portrait && <img className={round ? "match-card-portrait round" : "match-card-portrait"} src={portrait} alt="" loading="lazy" onError={(event) => onPortraitError?.(event.currentTarget)} />}
          <span className="match-card-title"><b>{title}</b>{chips && <span className="match-card-chips">{chips}</span>}</span>
          <em>{result === "draw" ? tr("Égalité", "Draw") : result === "win" ? tr("Victoire", "Win") : tr("Défaite", "Loss")}</em>
        </span>
        <span className="match-card-foot">
          <span><Crosshair size={15} />{kda}</span>
          <span><BarChart3 size={15} />{middle}</span>
          <span><Flag size={15} />{last}</span>
          <ChevronRight size={16} />
        </span>
      </button>
    </motion.li>
  );
}

export function MatchFilters({ filter, onChange, modes, picks, pickLabel, shown, total }: { filter: MatchFilter; onChange: (next: MatchFilter) => void; modes: string[]; picks: string[]; pickLabel: string; shown: number; total: number }) {
  const results: [ResultFilter, string][] = [["all", tr("Toutes", "All")], ["win", tr("Victoires", "Wins")], ["loss", tr("Défaites", "Losses")]];
  return (
    <div className="match-filters" role="group" aria-label={tr("Filtrer les parties", "Filter games")}>
      <div className="segmented">
        {results.map(([id, label]) => <button key={id} type="button" className={filter.result === id ? "on" : ""} aria-pressed={filter.result === id} onClick={() => onChange({ ...filter, result: id })}>{filter.result === id && <span className="segmented-pill" />}<span>{label}</span></button>)}
      </div>
      <Select className="settings-select" value={filter.mode} aria-label={tr("Mode de jeu", "Game mode")} onChange={(event) => onChange({ ...filter, mode: event.target.value })}>
        <option value="">{tr("Tous les modes", "All modes")}</option>
        {modes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
      </Select>
      <Select className="settings-select" value={filter.pick} aria-label={pickLabel} onChange={(event) => onChange({ ...filter, pick: event.target.value })}>
        <option value="">{pickLabel}</option>
        {picks.map((pick) => <option key={pick} value={pick}>{pick}</option>)}
      </Select>
      {filterActive(filter) && <button type="button" className="link" onClick={() => onChange(NO_FILTER)}>{tr("Tout afficher", "Show all")}</button>}
      <small className="muted">{tr(`${shown} sur ${total}`, `${shown} of ${total}`)}</small>
    </div>
  );
}

export interface Loaded<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  set: (value: T) => void;
}

export function useLoad<T>(load: () => Promise<T>, keys: readonly unknown[] = []): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load().then(
      (value) => {
        if (!active) return;
        setData(value);
        setLoading(false);
      },
      (reason) => {
        if (!active) return;
        setError(errorText(reason));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...keys]);
  return { data, loading, error, reload: useCallback(() => setTick((value) => value + 1), []), set: setData };
}

export function Skeletons({ count = 3, height = 64 }: { count?: number; height?: number }) {
  return (
    <div className="kit-skeletons" aria-busy="true" aria-label={t("loading")}>
      {Array.from({ length: count }, (_, index) => <span key={index} style={{ height }} />)}
    </div>
  );
}

export function ErrorBox({ message, onRetry, action }: { message: string; onRetry?: () => void; action?: ReactNode }) {
  return (
    <div className="kit-error" role="alert">
      <span>{message}</span>
      {(onRetry || action) && <div className="row">{onRetry && <Button onClick={onRetry}>{t("retry")}</Button>}{action}</div>}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="kit-empty">
      <b>{title}</b>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Status<T>({ state, empty, children, height }: { state: Loaded<T>; empty?: (data: T) => boolean; children: (data: T) => ReactNode; height?: number }) {
  if (state.data === null && state.loading) return <Skeletons height={height} />;
  if (state.data === null) return <ErrorBox message={state.error ?? t("loading")} onRetry={state.reload} />;
  if (empty?.(state.data)) return null;
  return (
    <>
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {children(state.data)}
    </>
  );
}

export function PageHead({ title, text, children, onRefresh, refreshing }: { title: string; text?: string; children?: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <header className="pagehead">
      <div>
        <h1>{title}</h1>
        {text && <p className="muted">{text}</p>}
      </div>
      <div className="row">
        {onRefresh && <Button data-refresh disabled={refreshing} title="F5" onClick={onRefresh}><RefreshCw size={14} className={refreshing ? "spin" : ""} />{t("refresh")}</Button>}
        {children}
      </div>
    </header>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, id, label }: { tabs: readonly { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (value: T) => void; id: string; label: string }) {
  return (
    <div className="kit-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} className={value === tab.id ? "on" : ""} onClick={() => onChange(tab.id)}>
          {value === tab.id && <motion.span layoutId={`tabs-${id}`} className="kit-tab-pill" transition={SPRING_PILL} />}
          <span className="kit-tab-label">{tab.icon}{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export function SideNav<T extends string>({ items, value, onChange, id, label }: { items: readonly { id: T; label: string; icon?: ReactNode; group?: string }[]; value: T; onChange: (value: T) => void; id: string; label: string }) {
  let group: string | undefined;
  return (
    <nav className="kit-sidenav" aria-label={label}>
      {items.map((item) => {
        const heading = item.group && item.group !== group ? item.group : null;
        group = item.group ?? group;
        return (
          <div key={item.id}>
            {heading && <h2>{heading}</h2>}
            <button type="button" className={value === item.id ? "on" : ""} aria-current={value === item.id ? "page" : undefined} onClick={() => onChange(item.id)}>
              {value === item.id && <motion.span layoutId={`sidenav-${id}`} className="kit-side-pill" transition={SPRING_PILL} />}
              <span>{item.icon}{item.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export function Stagger({ children, className, as = "ul" }: { children: ReactNode; className?: string; as?: "ul" | "div" }) {
  const Component = as === "ul" ? motion.ul : motion.div;
  return <Component className={className} variants={listStagger} initial="initial" animate="animate">{children}</Component>;
}

export const StaggerItem = motion.li;
export const staggerItem = listItem;

export function Drawer({ open, title, onClose, children, width = 560 }: { open: boolean; title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel.current) return;
      const stops = [...panel.current.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex='0']")].filter((item) => !item.hasAttribute("disabled") && item.offsetParent !== null);
      if (stops.length === 0) return;
      const at = stops.indexOf(document.activeElement as HTMLElement);
      if (at < 0 || (event.shiftKey ? at === 0 : at === stops.length - 1)) {
        event.preventDefault();
        stops[event.shiftKey ? stops.length - 1 : 0].focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [onClose, open]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="kit-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.aside key="panel" ref={panel} tabIndex={-1} autoFocus aria-modal="true" role="dialog" aria-label={title} className="kit-drawer" style={{ width: `min(${width}px, 92vw)` }} initial={reduce ? { opacity: 0 } : { transform: "translateX(100%)" }} animate={reduce ? { opacity: 1 } : { transform: "translateX(0%)" }} exit={reduce ? { opacity: 0 } : { transform: "translateX(100%)" }} transition={{ type: "spring", duration: 0.42, bounce: 0 }}>
            <header>
              <h2>{title}</h2>
              <button type="button" className="icon-btn" aria-label={t("close")} onClick={onClose}><X size={18} /></button>
            </header>
            <div className="kit-drawer-body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="kit-field"><span>{label}</span>{children}</label>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="kit-stat"><small>{label}</small><b>{value}</b>{hint && <small>{hint}</small>}</div>;
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1).replace(".", ",")} ${units[index]}`;
}
