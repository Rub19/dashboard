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
      icon: <WifiOff className="h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />,
      dot: "bg-[var(--warning)]",
      label: i18n("offline", "Vous êtes hors ligne. Certaines fonctionnalités sont indisponibles."),
      role: "alert" as const,
    },
    syncing: {
      icon: <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--info)]" />,
      dot: "bg-[var(--info)] animate-pulse",
      label: i18n("syncing", "Synchronisation..."),
      role: "status" as const,
    },
    online: {
      icon: <Wifi className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />,
      dot: "bg-[var(--success)]",
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
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="v8-panel pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg"
        role={config.role}
      >
        {config.icon}
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
        <span className="truncate">{config.label}</span>
      </motion.div>
    </div>
  );
}
