"use client";

import dynamic from "next/dynamic";
import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import SettingsLayoutSkeleton from "@/components/settings/SettingsLayoutSkeleton";

const SettingsLayout = dynamic(() => import("@/components/settings/SettingsLayout"), {
  ssr: false,
  loading: () => <SettingsLayoutSkeleton />,
});

export default function SettingsPage() {
  return (
    <SettingsFormProvider>
      <SettingsLayout />
    </SettingsFormProvider>
  );
}
