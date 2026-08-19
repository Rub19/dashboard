"use client";

import * as React from "react";

export interface TapGesture {
  pointerType?: string;
  state: boolean;
}

export function useTapGesture() {
  const ref = React.useRef<TapGesture | null>(null);

  const start = React.useCallback(
    (event: React.PointerEvent, state: boolean) => {
      ref.current = {
        pointerType: event.pointerType,
        state,
      };
    },
    [],
  );

  const drop = React.useCallback(() => {
    ref.current = null;
  }, []);

  const take = React.useCallback(() => {
    const value = ref.current;
    ref.current = null;
    return value;
  }, []);

  return React.useMemo(
    () => ({
      start,
      drop,
      take,
    }),
    [start, drop, take],
  );
}
