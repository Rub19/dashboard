"use client";

import { useRef, useCallback } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  type Placement,
} from "@floating-ui/react";
import { useLayer } from "@/components/LayerProvider";

export function useTopbarDropdown({
  open,
  onClose,
  placement = "bottom-end",
}: {
  open: boolean;
  onClose: () => void;
  placement?: Placement;
}) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const { refs, floatingStyles } = useFloating({
    open,
    placement,
    strategy: "fixed",
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  useLayer(open, onClose, {
    boundary: panelRef,
    anchor: triggerRef,
    kind: "popover",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    initialFocus: false,
    trapFocus: false,
  });

  const setTrigger = useCallback(
    (el: HTMLElement | null) => {
      triggerRef.current = el;
      refs.setReference(el);
    },
    [refs]
  );

  const setPanel = useCallback(
    (el: HTMLElement | null) => {
      panelRef.current = el;
      refs.setFloating(el);
    },
    [refs]
  );

  return { setTrigger, setPanel, floatingStyles };
}
