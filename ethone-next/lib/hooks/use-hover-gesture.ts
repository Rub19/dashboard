"use client";

import * as React from "react";

export type HoverGesture = {
  enter: (event: React.PointerEvent) => boolean;
  leave: (event: React.PointerEvent) => boolean;
};

export function useHoverGesture(): HoverGesture {
  const pointerRef = React.useRef<string | null>(null);

  const enter = React.useCallback((event: React.PointerEvent) => {
    const pointerType = event.pointerType;
    if (pointerType === "touch" || pointerType === "pen") return false;
    pointerRef.current = pointerType;
    return true;
  }, []);

  const leave = React.useCallback((event: React.PointerEvent) => {
    const pointerType = event.pointerType;
    if (pointerType === "touch" || pointerType === "pen") return false;
    if (pointerRef.current && pointerRef.current !== pointerType) {
      pointerRef.current = null;
      return false;
    }
    pointerRef.current = null;
    return true;
  }, []);

  return React.useMemo(
    () => ({
      enter,
      leave,
    }),
    [enter, leave],
  );
}
