"use client";

import ChangelogList from "@/components/ChangelogList";
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

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1">
        <div className="mx-auto w-full max-w-3xl">
          <ChangelogList entries={changelog} />
        </div>
      </div>
    </div>
  );
}
