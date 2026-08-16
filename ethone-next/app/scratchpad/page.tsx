"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import Card3D from "@/components/Card3D";
import BottomSheet from "@/components/BottomSheet";
import FormField from "@/components/FormField";
import Textarea from "@/components/Textarea";
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
    <div className="w-full sm:max-w-4xl lg:max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{i18n("scratchpadTitle")}</h1>
        <button
          type="button"
          onClick={() => { setSheetOpen(true); haptics.trigger(8); }}
          className="rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {i18n("scratchpadOptions")}
        </button>
      </div>

      <Card3D>
        <FormField
          label={i18n("scratchpadTitle")}
          help={`${charCount} ${i18n("characters")} · ${wordCount} ${i18n("words")} · ${statusLabel[status]}`}
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={i18n("scratchpadPlaceholder")}
            className="min-h-[40vh] resize-none p-4 leading-relaxed sm:min-h-[50vh]"
          />
        </FormField>
      </Card3D>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={i18n("scratchpadOptions")}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setNote(""); setSheetOpen(false); }}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-raised)]"
          >
            {i18n("scratchpadClear")}
          </button>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(note); setSheetOpen(false); }}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-raised)]"
          >
            {i18n("scratchpadCopy")}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
