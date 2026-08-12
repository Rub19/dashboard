"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

export default function V8StatusBar() {
  const i18n = useI18n();
  const pathname = usePathname();
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");

  const page = pathname === "/" ? "home" : pathname.split("/").filter(Boolean)[0] || "home";

  return (
    <div
      data-v8-status-bar
      className="v8-status-bar fixed bottom-0 left-0 z-30 hidden w-full items-center justify-between border-t border-[var(--border)] bg-[var(--background)]/90 px-4 py-1 text-[10px] text-[var(--muted)] backdrop-blur-md md:flex"
    >
      <span className="capitalize">{i18n(page)}</span>
      <span className="capitalize">{i18n(activeSpace)}</span>
      <span>Ethone v8-shell</span>
    </div>
  );
}
