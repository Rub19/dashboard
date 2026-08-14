"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettingsForm } from "./SettingsFormContext";

export default function SettingsBottomBar() {
  const i18n = useI18n();
  const { hasExplicitChanges, saveExplicit, cancelExplicit } = useSettingsForm();

  return (
    <AnimatePresence>
      {hasExplicitChanges && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed inset-x-0 bottom-6 z-40 mx-auto w-[calc(100%-3rem)] max-w-2xl"
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm text-[var(--foreground)]">{i18n("unsavedChanges")}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelExplicit}
                className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)]"
              >
                {i18n("cancel")}
              </button>
              <button
                type="button"
                onClick={saveExplicit}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:opacity-90"
              >
                {i18n("save")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
