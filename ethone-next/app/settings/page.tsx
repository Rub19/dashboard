"use client";

import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import Settings from "@/components/settings/Settings";

export default function SettingsPage() {
  return (
    <SettingsFormProvider>
      <Settings />
    </SettingsFormProvider>
  );
}
