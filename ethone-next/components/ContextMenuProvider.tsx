"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import BentoContextMenu from "@/components/BentoContextMenu";

type ContextMenuContextValue = {
  open: boolean;
  x: number;
  y: number;
  context: string | null;
  contextId: string | null;
};

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  }
  return ctx;
}

function isContextMenuDisabled(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    'input, textarea, [contenteditable="true"], [data-no-context-menu]'
  );
}

function findContextMenuTrigger(
  target: EventTarget | null
): HTMLElement | null {
  if (!target) return null;
  if (target instanceof Element) {
    return target.closest("[data-context-menu]") as HTMLElement | null;
  }
  if (target instanceof Node && target.parentElement) {
    return target.parentElement.closest("[data-context-menu]") as HTMLElement | null;
  }
  return null;
}

export default function ContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [adjusted, setAdjusted] = useState({ x: 0, y: 0 });
  const [version, setVersion] = useState(0);
  const [context, setContext] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const openAt = useCallback((x: number, y: number) => {
    setPoint({ x, y });
    setAdjusted({ x, y });
    setOpen(true);
    setVersion((v) => v + 1);
  }, []);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    let nx = point.x;
    let ny = point.y;

    if (nx + rect.width > vw - margin) nx = nx - rect.width;
    if (ny + rect.height > vh - margin) ny = ny - rect.height;

    nx = Math.max(margin, Math.min(nx, vw - rect.width - margin));
    ny = Math.max(margin, Math.min(ny, vh - rect.height - margin));

    setAdjusted({ x: nx, y: ny });
  }, [open, version, point]);

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      if (isContextMenuDisabled(e.target)) return;

      if (open && menuRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        close();
        return;
      }

      const trigger = findContextMenuTrigger(e.target);
      const nextContext = trigger?.dataset.contextMenu ?? null;
      const nextContextId = trigger?.dataset.contextId ?? null;

      e.preventDefault();
      setContext(nextContext);
      setContextId(nextContextId);
      openAt(e.clientX, e.clientY);
    }

    function onPointerDown(e: PointerEvent) {
      if (!open) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (open && e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }

    function onResize() {
      if (open) close();
    }

    function onScroll() {
      if (open) close();
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close, openAt]);

  return (
    <ContextMenuContext.Provider
      value={{ open, x: adjusted.x, y: adjusted.y, context, contextId }}
    >
      {children}
      <AnimatePresence>
        {open && (
          <BentoContextMenu
            ref={menuRef}
            onClose={close}
            x={adjusted.x}
            y={adjusted.y}
            context={context}
            contextId={contextId}
          />
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
}
