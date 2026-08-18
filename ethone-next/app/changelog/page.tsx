"use client";

import Card3D from "@/components/Card3D";
import { CHANGELOG_BY_LANG } from "@/data/changelog";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";

export default function ChangelogPage() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const changelog = CHANGELOG_BY_LANG[settings.language] || CHANGELOG_BY_LANG.fr;
  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("changelog")}</h1>

      <div className="min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden] space-y-4">
        {changelog.map((entry) => (
          <Card3D key={entry.version}>
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="break-words text-lg font-semibold">{entry.title}</h2>
                <span className="shrink-0 rounded-lg bg-[var(--panel-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                  {entry.version}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">{entry.date}</p>
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-[var(--foreground)]">
                {entry.items.map((item, i) => (
                  <li key={i} className="break-words">{item}</li>
                ))}
              </ul>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  );
}
