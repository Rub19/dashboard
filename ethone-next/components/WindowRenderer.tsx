"use client";

import { useWindowManager } from "./WindowManagerProvider";
import { FloatingWindow } from "./FloatingWindow";
import { MissionControl } from "./MissionControl";

export function WindowRenderer() {
  const { windows } = useWindowManager();

  return (
    <>
      <MissionControl />
      {windows.map((win) => (
        <FloatingWindow key={win.id} win={win} />
      ))}
    </>
  );
}
