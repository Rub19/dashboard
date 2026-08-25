"use client";

import { memo, useCallback } from "react";
import { Icon } from "@/lib/icons";
import { hapticSuccessPattern, hapticRigidImpact } from "@/lib/haptics";
import type { Item } from "@/lib/hooks/useItems";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = Item & {
  data?: {
    category?: string;
    priority?: TaskPriority;
    dueDate?: string;
  };
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: "text-[var(--danger)] bg-[var(--danger)]/15 border-[var(--danger)]/30",
  urgent: "text-[var(--danger)] bg-[var(--danger)]/15 border-[var(--danger)]/30",
  medium: "text-[var(--warning)] bg-[var(--warning)]/15 border-[var(--warning)]/30",
  low: "text-[var(--info)] bg-[var(--info)]/15 border-[var(--info)]/30",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "Haute",
  urgent: "Urgente",
  medium: "Moyenne",
  low: "Basse",
};

function formatDueDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  }
  return value;
}

export type TasksCardProps = {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
};

const TasksCard = memo(function TasksCard({ task, onToggle, onDelete }: TasksCardProps) {
  const priority = task.data?.priority || "medium";
  const due = formatDueDate(task.data?.dueDate);

  const handleToggle = useCallback(() => {
    if (!task.done) hapticSuccessPattern();
    onToggle(task.id, !task.done);
  }, [task.done, task.id, onToggle]);

  const handleDelete = useCallback(
    (e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      hapticRigidImpact();
      onDelete(task.id);
    },
    [task.id, onDelete]
  );

  return (
    <div
      className="group relative flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all duration-200 hover:border-[var(--panel-border)] hover:bg-[var(--inset-bg)]"
      onClick={handleToggle}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
            task.done
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-[0_0_10px_var(--glow-color)]"
              : "border-[var(--text-primary)]/20 hover:border-[var(--accent-primary)]"
          }`}
          aria-label={task.done ? "Marquer non terminée" : "Marquer terminée"}
        >
          {task.done && <Icon name="check" className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-medium transition-colors ${
              task.done
                ? "text-[var(--text-muted)] line-through opacity-60"
                : "text-[var(--text-primary)] group-hover:text-[var(--text-primary)]"
            }`}
          >
            {task.title}
          </p>
          {due && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)]">
              <Icon name="calendar" className="h-3 w-3" />
              {due}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-mono ${PRIORITY_STYLES[priority]}`}
        >
          {PRIORITY_LABELS[priority]}
        </span>

        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] group-hover:opacity-100"
          aria-label="Supprimer"
        >
          <Icon name="trash-2" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

export default TasksCard;
