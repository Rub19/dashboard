import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import SettingsLayout from "@/components/settings/SettingsLayout";

const SETTINGS_SECTIONS = [
  "general",
  "profile",
  "appearance",
  "themes",
  "animations",
  "audio",
  "soundscapes",
  "notifications",
  "dynamic-island",
  "dock",
  "workspace",
  "language",
  "connections",
  "privacy",
  "security",
  "sync",
  "storage",
  "performance",
  "accessibility",
  "shortcuts",
  "advanced",
  "about",
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
    <SettingsFormProvider>
      <SettingsLayout initialSection={section} />
    </SettingsFormProvider>
  );
}
