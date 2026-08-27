"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Zap, Check, Plus, X, ArrowRight, Loader2, ListPlus } from "lucide-react";
import { PRESET_TASK_PACKS, generateAITasks, type GeneratedTask, type TaskSuggestionPack } from "@/lib/tasks/ai-task-engine";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface AiTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: GeneratedTask[]) => Promise<void>;
}

export default function AiTaskDrawer({ isOpen, onClose, onAddTasks }: AiTaskDrawerProps) {
  const { notify, success } = useToast();
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
          className="absolute inset-0 bg-black/75 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0c0d14]/95 shadow-[0_16px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.25)]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Assistant & Suggestions IA</h3>
                <p className="text-xs text-zinc-400">Décomposez vos projets en tâches intelligentes</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 os-scroll">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Que souhaitez-vous accomplir ?
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="Ex: Préparer le sprint de tests et déploiement..."
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 pr-28 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-purple-500/60 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-2 flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-purple-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                ⚡ Suggestions instantanées
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PRESET_TASK_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => handleSelectPack(pack)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-all hover:scale-[1.02] active:scale-95 cursor-pointer bg-white/[0.03] hover:bg-white/[0.07]",
                      pack.gradient
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold text-white">{pack.title}</span>
                      <span className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.2 font-mono text-[9px] font-bold">
                        {pack.tasks.length} tâches
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] text-zinc-400">{pack.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Preview List */}
            {previewTasks.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">
                    📋 Tâches générées ({selectedIndices.size} / {previewTasks.length} sélectionnées)
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
                    className="text-[11px] font-semibold text-purple-400 hover:underline"
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
                          "flex items-center justify-between gap-3 rounded-xl border p-3 transition-all cursor-pointer",
                          isSelected
                            ? "border-purple-500/40 bg-purple-500/15 text-white shadow-xs"
                            : "border-white/10 bg-white/5 text-zinc-400 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all",
                              isSelected
                                ? "border-purple-400 bg-purple-500 text-white"
                                : "border-white/20 bg-transparent"
                            )}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <span className="text-xs font-medium truncate">{task.title}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                            {task.category}
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                              task.priority === "urgent"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : task.priority === "high"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
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
          <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={selectedIndices.size === 0}
              onClick={handleCommitTasks}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
