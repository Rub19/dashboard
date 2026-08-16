"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import Modal from "@/components/ui/Modal";

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

  const handleClose = () => {
    setOpen(false);
    setInput("");
  };

  return (
    <>
      <div className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/5 p-4 shadow-[0_0_30px_-10px_rgba(244,63,94,0.2)] sm:p-5">
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
          className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/20 hover:brightness-110 active:scale-[0.98]"
        >
          Supprimer le compte
        </button>
      </div>

      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Supprimer définitivement"
        description={`Cette action est irréversible. Tapez ${confirmText} pour confirmer.`}
        size="md"
        hideFooter
      >
        <div className="mb-4 flex items-center gap-2 text-rose-400">
          <Icon name="triangle-alert" className="h-5 w-5" />
          <span className="text-sm font-medium">Action irréversible</span>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={confirmText}
          className="mb-4 w-full rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-rose-400/50 focus:border-rose-500"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:bg-rose-600 active:scale-[0.98]"
          >
            Supprimer définitivement
          </button>
        </div>
      </Modal>
    </>
  );
}
