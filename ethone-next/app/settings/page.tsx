"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import SettingsSearch from "@/components/settings/SettingsSearch";
import SettingsContent from "@/components/settings/SettingsContent";
import SettingsBottomBar from "@/components/settings/SettingsBottomBar";
import DangerZone from "@/components/settings/DangerZone";

export default function SettingsPage() {
  const i18n = useI18n();

  return (
    <SettingsFormProvider>
      <main className="space-y-4 p-4 pb-24 sm:p-5 lg:p-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{i18n("settingsTitle")}</h1>
        </motion.header>

        <SettingsSearch />
        <SettingsContent />
        <SettingsBottomBar />
        <DangerZone />
      </main>
    </SettingsFormProvider>
  );
}
