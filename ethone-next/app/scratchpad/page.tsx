"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import FlatCard from "@/components/FlatCard";
import Modal from "@/components/ui/Modal";
import FormField from "@/components/FormField";
import Textarea from "@/components/Textarea";
import Button from "@/components/ui/Button";
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
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{i18n("scratchpadTitle")}</h1>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => { setSheetOpen(true); haptics.trigger(8); }}
        >
          {i18n("scratchpadOptions")}
        </Button>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll">
      <FlatCard className="h-full">
        <FormField
          label={i18n("scratchpadTitle")}
          help={`${charCount} ${i18n("characters")} · ${wordCount} ${i18n("words")} · ${statusLabel[status]}`}
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={i18n("scratchpadPlaceholder")}
            className="h-full min-h-[40vh] resize-none p-4 leading-relaxed sm:min-h-[50vh]"
          />
        </FormField>
      </FlatCard>

      <Modal
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={i18n("scratchpadOptions")}
        size="sm"
        position="bottom"
        hideFooter
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setNote(""); setSheetOpen(false); }}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
          >
            {i18n("scratchpadClear")}
          </button>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(note); setSheetOpen(false); }}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
          >
            {i18n("scratchpadCopy")}
          </button>
        </div>
      </Modal>
      </div>
    </div>
  );
}
