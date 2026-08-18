"use client";

import { useI18n } from "@/lib/hooks/useI18n";
import LiveWidgets from "@/components/LiveWidgets";
import ActivityHub from "@/components/ActivityHub";

export default function ActivityPage() {
  const i18n = useI18n();

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{i18n("liveWidgets")}</h1>
            <p className="text-sm text-[var(--muted)]">{i18n("liveCardsDescription")}</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
        <LiveWidgets showHeader={false} />
        <ActivityHub />
      </div>
    </div>
  );
}
