"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Zap, Check, X, Loader2, ListPlus } from "lucide-react";
import { PRESET_TASK_PACKS, generateAITasks, type GeneratedTask, type TaskSuggestionPack } from "@/lib/tasks/ai-task-engine";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface AiTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: GeneratedTask[]) => Promise<void>;
}

export default function AiTaskDrawer({ isOpen, onClose, onAddTasks }: AiTaskDrawerProps) {
  const { success } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<GeneratedTask[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const tasks = await generateAITasks(prompt);
      setPreviewTasks(tasks);
      setSelectedIndices(new Set(tasks.map((_, i) => i)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPack = (pack: TaskSuggestionPack) => {
    setPreviewTasks(pack.tasks);
    setSelectedIndices(new Set(pack.tasks.map((_, i) => i)));
    setPrompt(pack.title);
  };

  const toggleTaskSelection = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleCommitTasks = async () => {
    const tasksToAdd = previewTasks.filter((_, i) => selectedIndices.has(i));
    if (tasksToAdd.length === 0) return;

    await onAddTasks(tasksToAdd);
    success(
      `${tasksToAdd.length} tâche(s) ajoutée(s)`,
      "Générées par l'IA et intégrées à votre espace."
    );
    setPreviewTasks([]);
    setPrompt("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="v8-panel relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Assistant IA</h3>
                <p className="text-xs text-[var(--text-muted)]">Décomposez un projet en tâches</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 os-scroll">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Que souhaitez-vous accomplir ?
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="Ex : Préparer le sprint de tests et déploiement…"
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/50 px-4 py-3 pr-28 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent-primary)]"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>Générer</span>
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <Zap className="h-3.5 w-3.5" />
                Suggestions instantanées
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PRESET_TASK_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => handleSelectPack(pack)}
                    className="flex flex-col items-start gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 p-3.5 text-left transition-colors hover:bg-[var(--surface-2)] active:scale-[0.99]"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{pack.title}</span>
                      <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{pack.tasks.length} tâches</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] text-[var(--text-muted)]">{pack.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Preview List */}
            {previewTasks.length > 0 && (
              <div className="space-y-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-2)]/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                    <ListPlus className="h-3.5 w-3.5" />
                    Tâches générées ({selectedIndices.size} / {previewTasks.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndices(
                        selectedIndices.size === previewTasks.length
                          ? new Set()
                          : new Set(previewTasks.map((_, i) => i))
                      )
                    }
                    className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline"
                  >
                    {selectedIndices.size === previewTasks.length ? "Désélectionner tout" : "Tout sélectionner"}
                  </button>
                </div>

                <div className="space-y-2">
                  {previewTasks.map((task, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTaskSelection(idx)}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
                          isSelected
                            ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                            : "border-[var(--panel-border)] bg-[var(--surface-2)]/40 text-[var(--text-muted)] opacity-70"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              isSelected
                                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                                : "border-[var(--panel-border)] bg-transparent"
                            )}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <span className="text-xs font-medium truncate">{task.title}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-md border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                            {task.category}
                          </span>
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                              task.priority === "urgent"
                                ? "border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger)]"
                                : task.priority === "high"
                                ? "border-[var(--warning)]/25 bg-[var(--warning)]/10 text-[var(--warning)]"
                                : "border-[var(--panel-border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                            )}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--panel-border)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={selectedIndices.size === 0}
              onClick={handleCommitTasks}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-xs font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ListPlus className="h-4 w-4" />
              <span>Ajouter {selectedIndices.size} tâche(s)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
