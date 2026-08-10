"use client";

import Card3D from "@/components/Card3D";
import { CHANGELOG } from "@/data/changelog";
import { useI18n } from "@/lib/hooks/useI18n";

export default function ChangelogPage() {
  const i18n = useI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("changelog")}</h1>

      <div className="space-y-4">
        {CHANGELOG.map((entry) => (
          <Card3D key={entry.version}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{entry.title}</h2>
                <span className="shrink-0 rounded-full bg-[var(--surface-raised)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                  {entry.version}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">{entry.date}</p>
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-[var(--foreground)]">
                {entry.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
