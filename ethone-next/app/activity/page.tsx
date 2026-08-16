"use client";

import { useI18n } from "@/lib/hooks/useI18n";
import LiveWidgets from "@/components/LiveWidgets";
import ActivityHub from "@/components/ActivityHub";

export default function ActivityPage() {
  const i18n = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n("liveWidgets")}</h1>
          <p className="text-sm text-[var(--muted)]">{i18n("liveCardsDescription")}</p>
        </div>
      </div>
      <LiveWidgets showHeader={false} />

      <ActivityHub />
    </div>
  );
}
