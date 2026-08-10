"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import {
  Home,
  NotebookPen,
  CircleCheck,
  CalendarDays,
  Folder,
  Activity,
  Flame,
  Plug,
  LayoutGrid,
  Workflow,
  Brain,
  Timer,
  Users,
  Mail,
  Receipt,
  Settings,
  ChevronUp,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  notes: NotebookPen,
  tasks: CircleCheck,
  calendar: CalendarDays,
  files: Folder,
  bills: Receipt,
  activity: Activity,
  interactions: Flame,
  connections: Plug,
  plugins: Plug,
  spaces: LayoutGrid,
  flows: Workflow,
  brain: Brain,
  focus: Timer,
  team: Users,
  mail: Mail,
  settings: Settings,
};

export default function Dock() {
  const { settings, update } = useSettings();
  const pathname = usePathname();
  const i18n = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (!settings.dockVisible) return null;

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
        className={`flex items-end gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/95 p-2 shadow-2xl backdrop-blur-md transition-all ${
          expanded ? "min-w-[320px] flex-wrap justify-center" : ""
        }`}
      >
        {visibleItems().map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href);
          return (
            <div key={item.id} className="group relative flex flex-col items-center">
              <Link
                href={item.href}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-[var(--foreground)] transition-all hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:bg-[var(--surface)] hover:shadow-lg ${
                  active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
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
          onClick={() => setExpanded((v) => !v)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)] transition-all hover:bg-[var(--surface)] ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
