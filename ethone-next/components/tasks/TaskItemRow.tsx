"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, Calendar, Tag, Target, Edit2 } from "lucide-react";
import { type Task, type TaskPriority } from "@/components/TasksWidget";
import { hapticSuccessPattern, hapticRigidImpact } from "@/lib/haptics";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const PRIORITY_THEMES: Record<
  TaskPriority,
  { badge: string; text: string; bg: string; border: string; label: string }
> = {
  urgent: {
    badge: "Urgent",
    text: "text-[var(--danger)]",
    bg: "bg-[var(--danger)]/10",
    border: "border-[var(--danger)]/25",
    label: "Urgente",
  },
  high: {
    badge: "Haute",
    text: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    border: "border-[var(--warning)]/25",
    label: "Haute",
  },
  medium: {
    badge: "Moyenne",
    text: "text-[var(--text-muted)]",
    bg: "bg-[var(--surface-2)]",
    border: "border-[var(--panel-border)]",
    label: "Moyenne",
  },
  low: {
    badge: "Basse",
    text: "text-[var(--text-muted)]",
    bg: "bg-[var(--surface-2)]",
    border: "border-[var(--panel-border)]",
    label: "Basse",
  },
};

interface TaskItemRowProps {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
}

export const TaskItemRow = memo(function TaskItemRow({
  task,
  onToggle,
  onDelete,
  onUpdateTitle,
}: TaskItemRowProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const priority = (task.data?.priority as TaskPriority) || "medium";
  const priorityTheme = PRIORITY_THEMES[priority] || PRIORITY_THEMES.medium;
  const category = task.data?.category || "Général";

  const handleToggle = () => {
    if (!task.done) hapticSuccessPattern();
    onToggle(task.id, !task.done);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticRigidImpact();
    onDelete(task.id);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdateTitle?.(task.id, editTitle);
    }
    setIsEditing(false);
  };

  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push("/focus");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={handleToggle}
      className={cn(
        "group relative flex items-center justify-between gap-3.5 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3.5 sm:p-4 transition-colors duration-150 cursor-pointer select-none",
        task.done ? "opacity-55" : "hover:bg-[var(--surface-2)]/50"
      )}
    >
      {/* Left: Checkbox + Content */}
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 cursor-pointer",
            task.done
              ? "border-[var(--success)] bg-[var(--success)] text-[var(--bg-main)]"
              : "border-[var(--panel-border)] bg-[var(--surface-2)] text-transparent hover:border-[var(--accent-primary)]"
          )}
        >
          <Check className={cn("h-3.5 w-3.5 stroke-[3]", task.done ? "opacity-100" : "opacity-0")} />
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-lg border border-[var(--accent-primary)] bg-[var(--surface-2)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] outline-none"
            />
          ) : (
            <p
              className={cn(
                "text-sm font-medium leading-tight transition-colors",
                task.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
              )}
            >
              {task.title}
            </p>
          )}

          {/* Sub-meta tags */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
              <Tag className="h-2.5 w-2.5" />
              {category}
            </span>

            {task.data?.dueDate && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Calendar className="h-3 w-3" />
                {new Date(task.data.dueDate).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Priority Badge + Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-medium",
            priorityTheme.bg,
            priorityTheme.border,
            priorityTheme.text
          )}
        >
          {priorityTheme.badge}
        </span>

        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!task.done && (
            <button
              type="button"
              onClick={handleStartFocus}
              title="Lancer en Mode Focus"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <Target className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Modifier le titre"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            title="Supprimer la tâche"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
