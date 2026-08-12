"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";

function FeatureFallbackContent() {
  const i18n = useI18n();
  const search = useSearchParams();
  const feature = search.get("feature") || "unknown";
  const { settings } = useSettings();

  function fallbackMessage() {
    if (!settings.brainEnabled && feature === "brain") return i18n("brainDisabled");
    if (feature === "mail") return i18n("featureMailUnavailable");
    if (feature === "files") return i18n("featureFilesUnavailable");
    if (feature === "integrations") return i18n("featureIntegrationsUnavailable");
    return i18n("featureFallbackMessage");
  }

  return (
    <div className="w-full sm:max-w-3xl lg:max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{i18n("featureFallbackTitle")}</h1>
      <Card3D>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Icon name="alert-triangle" className="mt-1 h-5 w-5 text-amber-400" />
          <div className="min-w-0">
            <p className="break-words font-medium capitalize">{feature}</p>
            <p className="break-words text-sm text-[var(--muted)]">{fallbackMessage()}</p>
          </div>
        </div>
      </Card3D>
      <Card3D>
        <p className="break-words text-sm text-[var(--muted)]">{i18n("featureFallbackHint")}</p>
      </Card3D>
    </div>
  );
}

export default function FeatureFallbackPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Card3D><div className="h-8 w-1/3 animate-pulse rounded bg-[var(--border)]" /></Card3D></div>}>
      <FeatureFallbackContent />
    </Suspense>
  );
}
