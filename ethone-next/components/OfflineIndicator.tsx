"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

export default function OfflineIndicator() {
  const i18n = useI18n();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[90] flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400 backdrop-blur-sm">
      <Icon name="wifi-off" className="h-3.5 w-3.5" />
      <span>{i18n("offline")}</span>
    </div>
  );
}
