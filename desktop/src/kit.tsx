import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { errorText, t } from "./i18n";
import { listItem, listStagger, SPRING_PILL } from "./motion";
import { Button } from "./ui";

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
