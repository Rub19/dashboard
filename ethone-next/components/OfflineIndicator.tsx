"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function OfflineIndicator() {
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
      <WifiOff className="h-3.5 w-3.5" />
      <span>Vous êtes hors ligne. Certaines fonctionnalités sont indisponibles.</span>
    </div>
  );
}
