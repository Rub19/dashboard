"use client";

import { motion } from "framer-motion";
import { X, Maximize2, Minus } from "lucide-react";
import { useWindowManager, WindowState } from "./WindowManagerProvider";
import { useRef } from "react";

export function FloatingWindow({ win }: { win: WindowState }) {
  const { closeWindow, focusWindow, updateWindow } = useWindowManager();
  const draggingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={panelRef}
      drag
      dragMomentum={false}
      onDragStart={() => { draggingRef.current = true; }}
      onDragEnd={(_, info) => {
        draggingRef.current = false;
        updateWindow(win.id, { x: win.x + info.offset.x, y: win.y + info.offset.y });
        focusWindow(win.id);
      }}
      onPointerDown={() => focusWindow(win.id)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, x: win.x, y: win.y }}
      style={{
        width: win.width,
        height: win.height,
        zIndex: win.z,
        resize: "both",
        overflow: "hidden",
      }}
      className="absolute flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
    >
      <div className="flex h-10 cursor-grab items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 active:cursor-grabbing">
        <span className="select-none text-sm font-semibold">{win.title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateWindow(win.id, { height: win.height > 100 ? 48 : 360 })}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => closeWindow(win.id)} className="rounded p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-2">
        <iframe
          src={win.route}
          title={win.title}
          className="h-full w-full rounded-xl border-0 bg-[var(--surface)]"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </motion.div>
  );
}
