"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import BottomSheet from "@/components/BottomSheet";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { getUserState, setUserState } from "@/lib/user-state";

type SaveStatus = "saved" | "saving" | "error";

export default function ScratchpadPage() {
  const i18n = useI18n();
  const haptics = useHaptics();
  const [note, setNote] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("saved");

  const charCount = note.length;
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ethone-scratchpad") : "";
    if (saved) setNote(saved);
    getUserState<string>("scratchpad", "").then((remote) => {
      if (typeof remote === "string") setNote(remote);
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ethone-scratchpad", note);
    }

    setStatus("saving");
    const t = setTimeout(() => {
      setUserState("scratchpad", note)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, 700);

    return () => clearTimeout(t);
  }, [note]);

  const statusLabel: Record<SaveStatus, string> = {
    saved: i18n("saved"),
    saving: i18n("saving"),
    error: i18n("saveError"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("scratchpadTitle")}</h1>
        <button
          type="button"
          onClick={() => { setSheetOpen(true); haptics.trigger(8); }}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {i18n("scratchpadOptions")}
        </button>
      </div>

      <Card3D>
        <label htmlFor="scratchpad" className="sr-only">{i18n("scratchpadPlaceholder")}</label>
        <textarea
          id="scratchpad"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={i18n("scratchpadPlaceholder")}
          className="min-h-[50vh] w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-2">
            <span>{charCount} {i18n("characters")}</span>
            <span>·</span>
            <span>{wordCount} {i18n("words")}</span>
          </span>
          <span className="flex items-center gap-1.5" data-status={status}>
            {status === "saving" && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />}
            {status !== "saving" && (
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "saved" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            )}
            {statusLabel[status]}
          </span>
        </div>
      </Card3D>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={i18n("scratchpadOptions")}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setNote(""); setSheetOpen(false); }}
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-raised)]"
          >
            {i18n("scratchpadClear")}
          </button>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(note); setSheetOpen(false); }}
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-raised)]"
          >
            {i18n("scratchpadCopy")}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
