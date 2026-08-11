"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

const ICONS: Record<string, string> = {
  home: "home",
  notes: "notes",
  tasks: "tasks",
  calendar: "calendar",
  files: "files",
  bills: "bills",
  activity: "activity",
  interactions: "interactions",
  connections: "connections",
  plugins: "plugins",
  spaces: "spaces",
  flows: "flows",
  brain: "brain",
  focus: "focus",
  team: "team",
  mail: "mail",
  settings: "settings",
};

export default function Dock() {
  const { settings, update } = useSettings();
  const pathname = usePathname();
  const i18n = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (!settings.dockVisible || settings.layoutPreset === "sidebar-only" || settings.layoutPreset === "minimal") return null;

  function visibleItems() {
    return settings.dockItems
      .filter((id) => ICONS[id])
      .map((id) => ({ id, href: id === "home" ? "/" : `/${id}/`, icon: ICONS[id], label: i18n(id) }));
  }

  function move(id: string, delta: number) {
    const order = [...settings.dockItems];
    const idx = order.indexOf(id);
    const to = Math.min(order.length - 1, Math.max(0, idx + delta));
    if (idx < 0 || idx === to) return;
    order.splice(to, 0, order.splice(idx, 1)[0]);
    update({ dockItems: order });
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`flex items-end gap-1 border border-[var(--border)] bg-[var(--surface-raised)]/95 p-2 shadow-2xl backdrop-blur-md transition-all ${
          expanded ? "min-w-[320px] flex-wrap justify-center" : ""
        }`}
        style={{ borderRadius: "var(--dock-radius)" }}
      >
        {visibleItems().map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          return (
            <div key={item.id} className="group relative flex flex-col items-center">
              <Link
                href={item.href}
                aria-label={item.label}
                data-tooltip={item.label}
                data-haptic
                className={`flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-[var(--foreground)] transition-all hover:-translate-y-1 hover:scale-110 hover:border-[var(--accent)]/30 hover:bg-[var(--surface)] hover:shadow-lg ${
                  active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : ""
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </Link>
              {expanded && (
                <div className="mt-1 flex gap-0.5">
                  <button onClick={() => move(item.id, -1)} className="rounded p-0.5 text-[10px] text-[var(--muted)] hover:bg-[var(--surface)]">◀</button>
                  <button onClick={() => move(item.id, 1)} className="rounded p-0.5 text-[10px] text-[var(--muted)] hover:bg-[var(--surface)]">▶</button>
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={i18n("expand")}
          data-tooltip={i18n("expand")}
          data-haptic
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)] transition-all hover:bg-[var(--surface)] ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <Icon name="chevronUp" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
