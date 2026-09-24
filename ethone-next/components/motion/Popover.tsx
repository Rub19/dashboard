"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { cn } from "@/lib/utils";

/**
 * Menu déroulant ancré à son bouton (profil, langue, notifications, support, focus…).
 *
 * Volontairement sobre : le panneau apparaît en fondu avec un très léger glissement (120 ms, l'animation est coupée
 * si le système demande « réduire les animations »), il est opaque, ne déforme pas le bouton, ne floute rien derrière
 * lui et ne touche pas à la mise en page. Il se ferme au clic à l'extérieur ou avec Échap.
 * L'ancienne version « goutte » (bouton qui se transforme en panneau par ressort et masque animé) a été retirée.
 */

type Side = "top" | "bottom";
type Align = "start" | "center" | "end";

const VIEWPORT_MARGIN = 8;

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  side: Side;
  align: Align;
  gap: number;
  contentId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  setTriggerRef: (node: HTMLElement | null) => void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(part: string): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error(`${part} doit être utilisé dans <Popover>.`);
  return ctx;
}

export interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Conservé pour compatibilité : seul le clic est géré. */
  trigger?: "click" | "hover";
  side?: Side;
  align?: Align;
  sideOffset?: number;
  /** Conservés pour compatibilité (ancien effet « goutte »), sans effet. */
  panelRadius?: number;
  gooStrength?: number;
  className?: string;
}

export function Popover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "center",
  sideOffset = 8,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const contentId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
  const setTriggerRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const value = useMemo<PopoverContextValue>(
    () => ({ open, setOpen, toggle, side, align, gap: sideOffset, contentId, triggerRef, contentRef, setTriggerRef }),
    [open, setOpen, toggle, side, align, sideOffset, contentId, setTriggerRef],
  );

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export interface PopoverTriggerProps {
  children: ReactElement;
  asChild?: boolean;
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const ctx = usePopoverContext("PopoverTrigger");
  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const childProps = child.props;
  const childRef = (childProps as { ref?: Ref<HTMLElement> }).ref;

  return cloneElement(child, {
    onClick: (event: { defaultPrevented?: boolean }) => {
      (childProps.onClick as ((e: unknown) => void) | undefined)?.(event);
      if (!event.defaultPrevented) ctx.toggle();
    },
    ref: mergeRefs(childRef, ctx.setTriggerRef),
    "aria-haspopup": "dialog",
    "aria-expanded": ctx.open,
    "aria-controls": ctx.open ? ctx.contentId : undefined,
    "data-state": ctx.open ? "open" : "closed",
  });
}

export interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

export function PopoverContent({ children, className }: PopoverContentProps) {
  const { open, setOpen, side, align, gap, contentId, triggerRef, contentRef } = usePopoverContext("PopoverContent");
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(open, close, contentRef, { ignore: (target) => Boolean(triggerRef.current?.contains(target)) });

  const place = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const panel = contentRef.current?.getBoundingClientRect();
    if (!trigger || !panel) return;
    let left = align === "end" ? trigger.right - panel.width : align === "start" ? trigger.left : trigger.left + (trigger.width - panel.width) / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - panel.width - VIEWPORT_MARGIN));
    let top = side === "bottom" ? trigger.bottom + gap : trigger.top - gap - panel.height;
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - panel.height - VIEWPORT_MARGIN));
    setPosition((prev) => (prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5 ? prev : { left, top }));
  }, [align, side, gap, triggerRef, contentRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    place();
    const observer = new ResizeObserver(place);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, contentRef, mounted]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={contentRef}
      id={contentId}
      role="dialog"
      data-popover-panel=""
      className={cn("fixed", position && "ethone-popover-in", className)}
      // Invisible jusqu'à la première mesure : pas de flash à la mauvaise position.
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, zIndex: 10000, visibility: position ? "visible" : "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}
