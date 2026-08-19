"use client";

import * as React from "react";

interface UseDismissOptions {
  ignore?: (target: Element) => boolean;
}

export function useDismiss(
  open: boolean,
  onClose: () => void,
  boundaryRef: React.RefObject<HTMLElement | null>,
  options: UseDismissOptions = {},
) {
  const { ignore } = options;

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target) return;

      if (boundaryRef.current?.contains(target)) return;
      if (ignore?.(target)) return;

      onClose();
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose, ignore, boundaryRef]);
}
