"use client";

import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useWindowManager, type WindowState } from "./WindowManagerProvider";
import { useLayer } from "./LayerProvider";
import { useRef } from "react";

export function FloatingWindow({ win }: { win: WindowState }) {
  const i18n = useI18n();
  const { closeWindow, focusWindow, updateWindow } = useWindowManager();
  const draggingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const layer = useLayer(true, () => closeWindow(win.id), {
    boundary: panelRef,
    kind: win.options?.modal ? "dialog" : "panel",
    modal: win.options?.modal === true,
    trapFocus: win.options?.modal === true,
    closeOnEscape: win.options?.closeOnEscape !== false,
    closeOnOutside: win.options?.closeOnOutside === true,
    closeOnResize: win.options?.closeOnResize === true,
    closeOnScroll: win.options?.closeOnScroll === true,
    initialFocus: win.options?.focusOnOpen !== false,
  });

  function toggleMaximize() {
    if (win.maximized) {
      const prev = win.prev || { x: 80, y: 80, width: 560, height: 360 };
      updateWindow(win.id, { ...prev, maximized: false });
    } else {
      const prev = { x: win.x, y: win.y, width: win.width, height: win.height };
      const padding = 16;
      const width = typeof window !== "undefined" ? window.innerWidth - padding * 2 : 1024;
      const height = typeof window !== "undefined" ? window.innerHeight - padding * 2 : 768;
      updateWindow(win.id, { x: padding, y: padding, width, height, maximized: true, prev });
    }
  }

  function toggleFullscreen() {
    if (!panelRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      panelRef.current.requestFullscreen().catch(() => {});
    }
  }

  return (
    <motion.div
      ref={panelRef}
      drag={!win.maximized}
      dragMomentum={false}
      onDragStart={() => { draggingRef.current = true; }}
      onDragEnd={(_, info) => {
        draggingRef.current = false;
        updateWindow(win.id, { x: win.x + info.offset.x, y: win.y + info.offset.y });
        focusWindow(win.id);
        layer.activate();
      }}
      onPointerDown={() => {
        focusWindow(win.id);
        layer.activate();
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, x: win.x, y: win.y }}
      style={{
        width: win.width,
        height: win.height,
        zIndex: win.z,
        resize: win.maximized ? "none" : "both",
        overflow: "hidden",
      }}
      className="absolute flex flex-col rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl backdrop-blur-[var(--panel-blur)]"
    >
      <div className={`flex h-10 items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 ${win.maximized ? "" : "cursor-grab active:cursor-grabbing"} backdrop-blur-[var(--panel-blur)]`}>
        <span className="select-none text-sm font-semibold">{win.title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateWindow(win.id, { height: win.height > 100 ? 48 : 360 })}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--panel-bg)]"
            aria-label={i18n("minimize")}
          >
            <Icon name="minus" className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--panel-bg)]"
            aria-label={i18n("fullscreen")}
          >
            <Icon name="expand" className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleMaximize}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--panel-bg)]"
            aria-label={i18n(win.maximized ? "restore" : "maximize")}
          >
            <Icon name={win.maximized ? "minimize" : "maximize"} className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            aria-label={i18n("close")}
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-2">
        <iframe
          src={win.route}
          title={win.title}
          className="h-full w-full rounded-[var(--panel-radius)] border-0 bg-[var(--panel-bg)]"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </motion.div>
  );
}
