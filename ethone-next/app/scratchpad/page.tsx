"use client";

import { useState } from "react";
import { NotebookPen, CheckCircle2, Copy, Trash2, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import FlatCard from "@/components/FlatCard";
import Modal from "@/components/ui/Modal";
import FormField from "@/components/FormField";
import Textarea from "@/components/Textarea";
import Button from "@/components/ui/Button";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useUserState } from "@/lib/hooks/useUserState";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useToast } from "@/components/ToastProvider";

type SaveStatus = "saved" | "saving" | "error";

export default function ScratchpadPage() {
  const i18n = useI18n();
  const haptics = useHaptics();
  const { success: showSuccess, error: showError } = useToast();
  const { create: createNote } = useItems("notes");
  const { create: createTask } = useCloudTasks();

  const [note, setNote] = useUserState<string>("scratchpad", "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status] = useState<SaveStatus>("saved");

  const charCount = (note || "").length;
  const wordCount = (note || "").trim() ? (note || "").trim().split(/\s+/).length : 0;

  const statusLabel: Record<SaveStatus, string> = {
    saved: i18n("saved", "Enregistré"),
    saving: i18n("saving", "Enregistrement…"),
    error: i18n("saveError", "Erreur"),
  };

  const handleExportNotes = async () => {
    if (!note.trim()) return;
    haptics.trigger(12);
    try {
      const lines = note.trim().split("\n");
      const title = lines[0].slice(0, 80) || i18n("scratchpadNoteTitle", "Note Scratchpad");
      const body = lines.length > 1 ? lines.slice(1).join("\n").trim() : note.trim();
      await createNote({ title, body, done: false });
      showSuccess(i18n("scratchpadExportedNotes", "Note créée avec succès"), title);
      setSheetOpen(false);
    } catch {
      showError(i18n("scratchpadExportError", "Erreur lors de l'exportation"));
    }
  };

  const handleExportTask = async () => {
    if (!note.trim()) return;
    haptics.trigger(12);
    try {
      const lines = note.trim().split("\n");
      const title = lines[0].slice(0, 100) || i18n("scratchpadTaskTitle", "Tâche Scratchpad");
      const body = lines.length > 1 ? lines.slice(1).join("\n").trim() : "";
      await createTask({
        title,
        body,
        done: false,
        data: {
          category: "Général",
          priority: "medium",
          dueDate: new Date().toISOString(),
        },
      });
      showSuccess(i18n("scratchpadExportedTask", "Tâche créée avec succès"), title);
      setSheetOpen(false);
    } catch {
      showError(i18n("scratchpadExportError", "Erreur lors de l'exportation"));
    }
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n("scratchpadTitle", "Bloc-notes rapide")}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Capturez des idées volantes, synchronisées instantanément.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={!note.trim()}
            onClick={handleExportNotes}
            leftIcon={<NotebookPen className="h-4 w-4 text-[var(--accent-primary)]" />}
            className="hidden sm:inline-flex"
          >
            {i18n("scratchpadExportNotes", "Vers Notes")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={!note.trim()}
            onClick={handleExportTask}
            leftIcon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            className="hidden sm:inline-flex"
          >
            {i18n("scratchpadExportTask", "Créer Tâche")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              setSheetOpen(true);
              haptics.trigger(8);
            }}
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          >
            {i18n("scratchpadOptions", "Options")}
          </Button>
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll">
        <FlatCard className="h-full">
          <FormField
            label={i18n("scratchpadTitle", "Bloc-notes")}
            help={`${charCount} ${i18n("characters", "caractères")} · ${wordCount} ${i18n("words", "mots")} · ${statusLabel[status]}`}
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={i18n("scratchpadPlaceholder", "Écrivez ce qui vous passe par la tête…")}
              className="h-full min-h-[40vh] resize-none p-4 leading-relaxed sm:min-h-[50vh]"
            />
          </FormField>
        </FlatCard>

        <Modal
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={i18n("scratchpadOptions", "Options du bloc-notes")}
          size="sm"
          position="bottom"
          hideFooter
        >
          <div className="space-y-2">
            <button
              type="button"
              disabled={!note.trim()}
              onClick={handleExportNotes}
              className="flex w-full items-center gap-2.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <NotebookPen className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>{i18n("scratchpadExportNotes", "Exporter vers les Notes")}</span>
            </button>
            <button
              type="button"
              disabled={!note.trim()}
              onClick={handleExportTask}
              className="flex w-full items-center gap-2.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{i18n("scratchpadExportTask", "Créer une Tâche")}</span>
            </button>
            <button
              type="button"
              disabled={!note.trim()}
              onClick={() => {
                navigator.clipboard?.writeText(note);
                showSuccess(i18n("copied", "Copié dans le presse-papier"));
                setSheetOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4 text-zinc-400" />
              <span>{i18n("scratchpadCopy", "Copier tout le texte")}</span>
            </button>
            <button
              type="button"
              disabled={!note.trim()}
              onClick={() => {
                setNote("");
                setSheetOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10 backdrop-blur-[var(--panel-blur)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              <span>{i18n("scratchpadClear", "Effacer le bloc-notes")}</span>
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
