import { Suspense } from "react";
import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import SettingsLayout from "@/components/settings/SettingsLayout";
import SettingsLayoutSkeleton from "@/components/settings/SettingsLayoutSkeleton";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLayoutSkeleton />}>
      <SettingsFormProvider>
        <SettingsLayout />
      </SettingsFormProvider>
    </Suspense>
  );
}
