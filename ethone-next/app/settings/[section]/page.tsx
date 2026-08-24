import { Suspense } from "react";
import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import SettingsLayout from "@/components/settings/SettingsLayout";
import SettingsLayoutSkeleton from "@/components/settings/SettingsLayoutSkeleton";

const SETTINGS_SECTIONS = [
  "profile",
  "appearance",
  "audio",
  "workspace",
  "language",
  "notifications",
  "security",
  "advanced",
];

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((section) => ({ section }));
}

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }> | { section: string };
}) {
  const { section } = await Promise.resolve(params);

  return (
    <Suspense fallback={<SettingsLayoutSkeleton />}>
      <SettingsFormProvider>
        <SettingsLayout initialSection={section} />
      </SettingsFormProvider>
    </Suspense>
  );
}
