"use client";

import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useWindowManager } from "./WindowManagerProvider";

export function MissionControl() {
  const { windows, missionControl, setMissionControl, focusWindow } = useWindowManager();

  if (!missionControl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 p-8 backdrop-blur-sm"
    >
      <button
        onClick={() => setMissionControl(false)}
        className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <Icon name="close" className="h-6 w-6" />
      </button>

      <h2 className="mb-8 text-3xl font-bold text-white">Mission Control</h2>

      <div className="grid max-h-[80vh] w-full max-w-6xl grid-cols-2 gap-6 overflow-auto md:grid-cols-3 lg:grid-cols-4">
        {windows.map((win) => (
          <motion.button
            key={win.id}
            onClick={() => {
              focusWindow(win.id);
              setMissionControl(false);
            }}
            whileHover={{ scale: 1.03 }}
            className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-raised)] p-4 text-left shadow-2xl"
          >
            <p className="text-sm font-semibold">{win.title}</p>
            <p className="text-xs text-[var(--muted)]">{win.route}</p>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--accent)]" />
          </motion.button>
        ))}
      </div>

      {windows.length === 0 && <p className="text-white/70">Aucune fenêtre ouverte.</p>}
    </motion.div>
  );
}
