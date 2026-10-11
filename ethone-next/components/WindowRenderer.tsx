"use client";

import { useWindowManager } from "./WindowManagerProvider";
import { FloatingWindow } from "./FloatingWindow";

export function WindowRenderer() {
  const { windows } = useWindowManager();

  return (
    <>
      {windows.map((win) => (
        <FloatingWindow key={win.id} win={win} />
      ))}
    </>
  );
}
