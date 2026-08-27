"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, Calendar, Clock, Sparkles, Tag, Target, MoreVertical, Edit2 } from "lucide-react";
import { type Task, type TaskPriority } from "@/components/TasksWidget";
import { hapticSuccessPattern, hapticRigidImpact } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const PRIORITY_THEMES: Record<
  TaskPriority,
  { badge: string; text: string; bg: string; border: string; glow: string; label: string }
> = {
  urgent: {
    badge: "URGENT",
    text: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_8px_rgba(244,63,94,0.4)]",
    label: "Urgente",
  },
  high: {
    badge: "HAUTE",
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    label: "Haute",
  },
  medium: {
    badge: "MOYENNE",
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_8px_rgba(6,182,212,0.4)]",
    label: "Moyenne",
  },
  low: {
    badge: "BASSE",
    text: "text-zinc-400",
    bg: "bg-zinc-500/15",
    border: "border-zinc-500/30",
    glow: "",
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
  const { notify } = useToast();
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
        "group relative flex items-center justify-between gap-3.5 rounded-2xl border p-3.5 sm:p-4 backdrop-blur-xl transition-all duration-200 cursor-pointer select-none",
        task.done
          ? "border-white/5 bg-white/[0.02] opacity-60"
          : "border-white/10 bg-[#0e1017]/80 hover:border-white/20 hover:bg-[#12141e]/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
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
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer",
            task.done
              ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "border-white/25 bg-white/5 text-transparent hover:border-purple-400 hover:bg-purple-500/10"
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
              className="w-full rounded-lg border border-purple-500/50 bg-white/10 px-2 py-1 text-sm font-semibold text-white outline-none"
            />
          ) : (
            <p
              className={cn(
                "text-sm font-medium leading-tight transition-colors",
                task.done ? "text-zinc-500 line-through" : "text-zinc-100 group-hover:text-white"
              )}
            >
              {task.title}
            </p>
          )}

          {/* Sub-meta tags */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              <Tag className="h-2.5 w-2.5" />
              {category}
            </span>

            {task.data?.dueDate && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <Calendar className="h-3 w-3 text-zinc-500" />
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
            "rounded-lg border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase",
            priorityTheme.bg,
            priorityTheme.border,
            priorityTheme.text,
            priorityTheme.glow
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
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
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
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            title="Supprimer la tâche"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
