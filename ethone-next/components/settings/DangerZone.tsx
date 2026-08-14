"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";

export default function DangerZone({ confirmText = "SUPPRIMER" }: { confirmText?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const canConfirm = input.trim() === confirmText;

  const handleConfirm = () => {
    if (!canConfirm) return;
    // action destructive à brancher ici
    setOpen(false);
    setInput("");
  };

  return (
    <>
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-[0_0_30px_-10px_rgba(244,63,94,0.2)] sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="triangle-alert" className="h-5 w-5 text-rose-400" />
          <h2 className="font-semibold text-rose-400">Zone de danger</h2>
        </div>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Ces actions sont irréversibles. La suppression de votre compte effacera toutes vos données.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
        >
          Supprimer le compte
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[var(--surface)] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-2">
                <Icon name="triangle-alert" className="h-5 w-5 text-rose-400" />
                <h3 className="text-lg font-semibold text-rose-400">Supprimer définitivement</h3>
              </div>
              <p className="mb-4 text-sm text-[var(--foreground)]">
                Cette action est irréversible. Tapez <strong>{confirmText}</strong> pour confirmer.
              </p>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={confirmText}
                className="mb-4 w-full rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-rose-400/50 focus:border-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setInput(""); }}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--surface-raised)]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-600"
                >
                  Supprimer définitivement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
