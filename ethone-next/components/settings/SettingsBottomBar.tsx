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
          className="fixed inset-x-0 bottom-20 z-40 mx-auto w-[calc(100%-3rem)] max-w-2xl"
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="text-sm text-zinc-200">{i18n("unsavedChanges")}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelExplicit}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {i18n("cancel")}
              </button>
              <button
                type="button"
                onClick={saveExplicit}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "var(--accent-color, var(--accent, #a855f7))",
                  boxShadow: "0 0 16px var(--accent-glow, rgba(168, 85, 247, 0.35))",
                }}
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
