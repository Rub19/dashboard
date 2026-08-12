"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBrain } from "@/lib/hooks/useBrain";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function routeFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] || "home";
}

export default function AutomationRuntime() {
  const pathname = usePathname();
  const { runAutomations } = useBrain();
  const [activeFlow] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const route = routeFromPathname(pathname);
    runAutomations({ route, space: activeFlow, localTime: formatTime(new Date()) });
  }, [pathname, activeFlow, runAutomations]);

  useEffect(() => {
    const id = setInterval(() => {
      runAutomations({ route: routeFromPathname(pathname), space: activeFlow, localTime: formatTime(new Date()) });
    }, 15000);
    return () => clearInterval(id);
  }, [pathname, activeFlow, runAutomations]);

  return null;
}
