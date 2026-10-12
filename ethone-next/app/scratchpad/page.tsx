"use client";

import { useState, useRef } from "react";
import {
  NotebookPen,
  CheckCircle2,
  Copy,
  Trash2,
  SlidersHorizontal,
  Eye,
  Layout,
  Download,
  List,
  ListChecks,
  Code2,
  Clock,
} from "@/components/icons/ph";
import { useI18n } from "@/lib/hooks/useI18n";
import FlatCard from "@/components/FlatCard";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/Textarea";
import Button from "@/components/ui/Button";
import MarkdownContent from "@/components/MarkdownContent";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useUserState } from "@/lib/hooks/useUserState";
import { useItems } from "@/lib/hooks/useItems";
import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "saving" | "error";
type ScratchViewMode = "edit" | "split" | "preview";

export default function ScratchpadPage() {
  const i18n = useI18n();
  const haptics = useHaptics();
  const { success: showSuccess, error: showError } = useToast();
  const { create: createNote } = useItems("notes");
  const { create: createTask } = useCloudTasks();

  const [note, setNote] = useUserState<string>("scratchpad", "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status] = useState<SaveStatus>("saved");
  const [mode, setMode] = useState<ScratchViewMode>("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = (note || "").length;
  const wordCount = (note || "").trim() ? (note || "").trim().split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const statusLabel: Record<SaveStatus, string> = {
    saved: i18n("saved", "Enregistré"),
    saving: i18n("saving", "Enregistrement…"),
    error: i18n("saveError", "Erreur"),
  };

  const insertSnippet = (snippet: string, cursorOffset = 0) => {
    const el = textareaRef.current;
    if (!el) {
      setNote((prev) => (prev ? `${prev}\n${snippet}` : snippet));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const next = before + snippet + after;
    setNote(next);
    haptics.trigger(8);
    setTimeout(() => {
      el.focus();
      const newPos = start + (cursorOffset || snippet.length);
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleDownloadMarkdown = () => {
    if (!note.trim()) return;
    haptics.trigger(10);
    const blob = new Blob([note], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scratchpad-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(i18n("scratchpadDownloaded", "Fichier Markdown téléchargé"));
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
    <div className="stagger-children h-full min-h-0 w-full flex flex-col overflow-hidden">
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
            variant="outline"
            size="md"
            disabled={!note.trim()}
            onClick={handleDownloadMarkdown}
            leftIcon={<Download className="h-4 w-4 text-[var(--text-muted)]" />}
            className="hidden sm:inline-flex"
            title="Télécharger en .md"
          >
            MD
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

      <div className="min-h-0 w-full flex-1 overflow-hidden flex flex-col">
        <FlatCard className="h-full flex flex-col p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--panel-border)]/60 select-none">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  mode === "edit"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                )}
              >
                <NotebookPen className="h-3.5 w-3.5" />
                <span>Édition</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("split")}
                className={cn(
                  "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  mode === "split"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                )}
              >
                <Layout className="h-3.5 w-3.5" />
                <span>Double vue</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  mode === "preview"
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Aperçu</span>
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => insertSnippet("**texte**", 7)}
                className="px-2 py-1 rounded text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                title="Gras (**texte**)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("\n- ", 3)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                title="Liste à puces"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("\n- [ ] ", 7)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                title="Case à cocher (- [ ])"
              >
                <ListChecks className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet("\n```\ncode\n```\n", 5)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                title="Bloc de code"
              >
                <Code2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const dateStr = now.toLocaleDateString("fr-FR");
                  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  insertSnippet(` [${dateStr} ${timeStr}] `);
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                title="Insérer date et heure"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 pt-3">
            {mode === "edit" && (
              <Textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={i18n("scratchpadPlaceholder", "Écrivez ce qui vous passe par la tête…")}
                className="h-full min-h-[40vh] resize-none p-4 leading-relaxed"
              />
            )}

            {mode === "preview" && (
              <div className="h-full min-h-[40vh] overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)]/30 p-5 os-scroll">
                {note.trim() ? (
                  <MarkdownContent content={note} className="space-y-2 text-sm leading-relaxed" />
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Aucun texte rédigé pour le moment. Basculez en mode Édition pour écrire.
                  </p>
                )}
              </div>
            )}

            {mode === "split" && (
              <div className="grid grid-cols-2 gap-3 h-full min-h-[40vh]">
                <Textarea
                  ref={textareaRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={i18n("scratchpadPlaceholder", "Écrivez ce qui vous passe par la tête…")}
                  className="h-full resize-none p-4 leading-relaxed"
                />
                <div className="h-full overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-2)]/30 p-4 os-scroll">
                  {note.trim() ? (
                    <MarkdownContent content={note} className="space-y-2 text-sm leading-relaxed" />
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      Aperçu dynamique en temps réel…
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
            <span>
              {charCount} {i18n("characters", "caractères")} · {wordCount} {i18n("words", "mots")} · ~{readingTimeMinutes} min de lecture
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              {statusLabel[status]}
            </span>
          </div>
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
              onClick={handleDownloadMarkdown}
              className="flex w-full items-center gap-2.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 text-[var(--accent-primary)]" />
              <span>Télécharger en fichier Markdown (.md)</span>
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
              <Copy className="h-4 w-4 text-[var(--text-muted)]" />
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
