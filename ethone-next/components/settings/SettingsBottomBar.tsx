"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettingsForm } from "./SettingsFormContext";
import Button from "@/components/ui/Button";

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
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={cancelExplicit}
              >
                {i18n("cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={saveExplicit}
                className="active:scale-95"
              >
                {i18n("save")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
