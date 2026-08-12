"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { activityJournal } from "@/lib/activity-journal";

function routeFromPathname(pathname: string) {
  return pathname === "/" ? "home" : pathname.split("/").filter(Boolean)[0] || "home";
}

export function ActivityJournalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const route = routeFromPathname(pathname || "/");
    if (lastRouteRef.current === route) return;
    lastRouteRef.current = route;
    activityJournal.captureRoute(route);
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      const route = routeFromPathname(window.location.pathname);
      activityJournal.captureRoute(route);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return <>{children}</>;
}
