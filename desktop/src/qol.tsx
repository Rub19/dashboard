import { ReactNode, useCallback, useEffect, useRef, useState, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { tr } from "./i18n";
import { readJson, write } from "./settings";

const PERSIST_EVENT = "ethone-persist";

export function setPersisted(key: string, value: string) {
  write(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PERSIST_EVENT, { detail: { key, value } }));
}

export function usePersisted<T extends string>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => readJson<T>(key) ?? initial);
  useEffect(() => {
    const listener = (event: Event) => {
      const { detail } = event as CustomEvent<{ key: string; value: T }>;
      if (detail.key === key) setValue(detail.value);
    };
    window.addEventListener(PERSIST_EVENT, listener);
    return () => window.removeEventListener(PERSIST_EVENT, listener);
  }, [key]);
  return [value, useCallback((next: T) => setPersisted(key, next), [key])];
}

interface ToastItem {
  id: number;
  message: string;
  tone: "ok" | "bad" | "plain";
  action?: { label: string; run: () => void };
}

const TOAST_EVENT = "ethone-toast";
let toastId = 0;

export function toast(message: string, options: { tone?: ToastItem["tone"]; action?: ToastItem["action"]; duration?: number } = {}) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { id: ++toastId, message, tone: options.tone ?? "ok", action: options.action, duration: options.duration ?? (options.action ? 6000 : 2600) } }));
}

export function undoable(message: string, commit: () => Promise<unknown>, undo: () => void, onError: (reason: unknown) => void) {
  let cancelled = false;
  const timer = setTimeout(() => {
    if (!cancelled) commit().catch(onError);
  }, 6000);
  toast(message, { action: { label: tr("Annuler", "Undo"), run: () => { cancelled = true; clearTimeout(timer); undo(); } } });
}

export async function copyText(text: string, label = tr("Copié", "Copied")) {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
  } catch {
    toast(tr("Impossible de copier. Sélectionne le texte à la main.", "Could not copy. Select the text by hand."), { tone: "bad" });
  }
}

function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener = (event: Event) => {
      const { duration, ...item } = (event as CustomEvent<ToastItem & { duration: number }>).detail;
      setItems((current) => [...current.slice(-2), item]);
      setTimeout(() => setItems((current) => current.filter((other) => other.id !== item.id)), duration);
    };
    window.addEventListener(TOAST_EVENT, listener);
    return () => window.removeEventListener(TOAST_EVENT, listener);
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div key={item.id} layout className={`toast ${item.tone} ${item.action ? "" : "plain"}`} initial={{ opacity: 0, transform: "translateY(12px) scale(.97)" }} animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }} exit={{ opacity: 0, transform: "translateY(12px) scale(.97)" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
            {item.tone === "ok" ? <CheckCircle2 size={15} /> : item.tone === "bad" ? <AlertCircle size={15} /> : null}
            <span>{item.message}</span>
            {item.action && <button type="button" onClick={() => { item.action?.run(); setItems((current) => current.filter((other) => other.id !== item.id)); }}>{item.action.label}</button>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  run: () => void;
}

const MENU_EVENT = "ethone-context-menu";

export function contextMenu(event: ReactMouseEvent, items: MenuItem[]) {
  event.preventDefault();
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: { x: event.clientX, y: event.clientY, items } }));
}

function ContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const close = useCallback(() => {
    setMenu(null);
    if (opener.current instanceof HTMLElement) opener.current.focus();
  }, []);
  useEffect(() => {
    const listener = (event: Event) => {
      opener.current = document.activeElement;
      setMenu((event as CustomEvent<{ x: number; y: number; items: MenuItem[] }>).detail);
    };
    window.addEventListener(MENU_EVENT, listener);
    return () => window.removeEventListener(MENU_EVENT, listener);
  }, []);
  useEffect(() => {
    if (!menu) return;
    box.current?.querySelector("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const buttons = [...(box.current?.querySelectorAll("button") ?? [])];
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(at + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [close, menu]);
  const width = 220;
  const height = (menu?.items.length ?? 0) * 28 + 14;
  const left = menu ? Math.min(menu.x, window.innerWidth - width - 8) : 0;
  const top = menu ? Math.min(menu.y, window.innerHeight - height - 8) : 0;
  return (
    <AnimatePresence>
      {menu && (
        <motion.div ref={box} role="menu" className="ctx-menu" style={{ left, top, width, transformOrigin: `${menu.x - left}px ${menu.y - top}px` }} initial={{ opacity: 0, transform: "scale(.96)" }} animate={{ opacity: 1, transform: "scale(1)" }} exit={{ opacity: 0, transform: "scale(.98)" }} transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}>
          {menu.items.map((item) => <button key={item.label} type="button" role="menuitem" className={item.danger ? "danger" : ""} onClick={() => { setMenu(null); item.run(); }}>{item.icon}{item.label}</button>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tooltips() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; instant: boolean } | null>(null);
  useEffect(() => {
    let timer = 0;
    let target: HTMLElement | null = null;
    let saved = "";
    let lastShown = 0;
    const hide = () => {
      clearTimeout(timer);
      if (target && saved) target.setAttribute("title", saved);
      target = null;
      saved = "";
      setTip((current) => {
        if (current) lastShown = Date.now();
        return null;
      });
    };
    const over = (event: PointerEvent) => {
      const next = (event.target as HTMLElement | null)?.closest?.<HTMLElement>("[title]");
      if (!next || next === target) return;
      hide();
      target = next;
      saved = next.getAttribute("title") ?? "";
      next.removeAttribute("title");
      if (!saved) return;
      const instant = Date.now() - lastShown < 400;
      timer = window.setTimeout(() => {
        if (!target) return;
        const box = target.getBoundingClientRect();
        const x = Math.max(8, Math.min(box.left + box.width / 2 - 70, window.innerWidth - 288));
        setTip({ text: saved, x, y: box.bottom + 30 > window.innerHeight ? box.top - 30 : box.bottom + 6, instant });
      }, instant ? 0 : 450);
    };
    const out = (event: PointerEvent) => {
      if (target && !target.contains(event.relatedTarget as Node | null)) hide();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerdown", hide);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", hide);
      clearTimeout(timer);
    };
  }, []);
  return tip ? <div className={`tip ${tip.instant ? "instant" : ""}`} role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div> : null;
}

export function Overlays() {
  return createPortal(<><Toasts /><ContextMenu /><Tooltips /></>, document.body);
}
