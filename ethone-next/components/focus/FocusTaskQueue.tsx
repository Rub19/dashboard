"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useItems } from "@/lib/hooks/useItems";
import { cn } from "@/lib/utils";

interface FocusTaskQueueProps {
  activeTaskId: string | null;
  onSelectTask: (task: { id: string; title: string }) => void;
}

export default function FocusTaskQueue({
  activeTaskId,
  onSelectTask,
}: FocusTaskQueueProps) {
  const { items: tasks, create, update } = useItems("tasks");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const pendingTasks = tasks.filter((t) => !t.done);
  const activeTask = pendingTasks.find((t) => t.id === activeTaskId) || pendingTasks[0];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const created = await create({
      title: newTaskTitle.trim(),
      priority: "normal",
      done: false,
    } as never);
    if (created && typeof created === "object" && "id" in created) {
      onSelectTask({ id: String(created.id), title: newTaskTitle.trim() });
    }
    setNewTaskTitle("");
    setShowAdd(false);
  };

  const handleToggleDone = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await update(id, { done: true } as never);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="check-circle" className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Tâche Active & File d&apos;attente
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-all"
        >
          <Icon name="plus" className="h-3 w-3" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Add Task Input Form */}
      {showAdd && (
        <form onSubmit={handleCreateTask} className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Ex: Rédiger le rapport..."
            className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] disabled:opacity-40"
          >
            Créer
          </button>
        </form>
      )}

      {/* Task Queue List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto os-scroll pr-1">
        {pendingTasks.length === 0 ? (
          <p className="py-3 text-center text-xs text-[var(--text-muted)] italic">
            Aucune tâche en attente. Créez-en une pour concentrer votre session !
          </p>
        ) : (
          pendingTasks.map((t, idx) => {
            const isCurrent = t.id === (activeTask?.id || activeTaskId);
            return (
              <div
                key={t.id}
                onClick={() => onSelectTask({ id: t.id, title: t.title })}
                className={cn(
                  "group flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs transition-all cursor-pointer",
                  isCurrent
                    ? "bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--text-primary)] font-semibold shadow-sm"
                    : "bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-hover)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleDone(t.id, e)}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--panel-border)] text-transparent hover:border-[var(--success)] hover:text-[var(--success)] group-hover:border-[var(--accent-primary)] transition-colors"
                    title="Terminer cette tâche"
                  >
                    <Icon name="check" className="h-3 w-3" />
                  </button>

                  <span className="truncate">{t.title}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[10px]">
                  {isCurrent ? (
                    <span className="rounded-full bg-[var(--accent-primary)]/20 px-2 py-0.5 font-bold text-[var(--accent-primary)]">
                      En cours
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">#{idx + 1}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
