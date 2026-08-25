"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { WifiOff, Loader2, Wifi } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";

type IndicatorStatus = "idle" | "offline" | "syncing" | "online";

export default function OfflineIndicator() {
  const i18n = useI18n();
  const [status, setStatus] = useState<IndicatorStatus>(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    return "idle";
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOffline = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("offline");
    };

    const handleOnline = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("syncing");
      timeoutRef.current = setTimeout(() => {
        setStatus("online");
        timeoutRef.current = setTimeout(() => {
          setStatus("idle");
        }, 2000);
      }, 1500);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (status === "idle") return null;

  const config = {
    offline: {
      icon: <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />,
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
      border: "border-amber-500/30",
      bg: "bg-[var(--surface-raised)]/95",
      text: "text-amber-300",
      label: i18n("offline", "Vous êtes hors ligne. Certaines fonctionnalités sont indisponibles."),
      role: "alert" as const,
    },
    syncing: {
      icon: <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" />,
      dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-pulse",
      border: "border-sky-500/30",
      bg: "bg-[var(--surface-raised)]/95",
      text: "text-sky-300",
      label: i18n("syncing", "Synchronisation..."),
      role: "status" as const,
    },
    online: {
      icon: <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" />,
      dot: "bg-[var(--success)] shadow-[0_0_8px_rgba(52,211,153,0.6)]",
      border: "border-[var(--success)]/30",
      bg: "bg-[var(--surface-raised)]/95",
      text: "text-emerald-300",
      label: i18n("online", "En ligne"),
      role: "status" as const,
    },
  }[status];

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] pointer-events-none flex max-w-[calc(100vw-2rem)] items-center justify-center px-2"
      aria-live="polite"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: -16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-colors duration-300 ${config.border} ${config.bg} ${config.text}`}
        role={config.role}
      >
        {config.icon}
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
        <span className="truncate">{config.label}</span>
      </motion.div>
    </div>
  );
}
