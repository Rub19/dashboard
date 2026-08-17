"use client";

import { motion } from "framer-motion";
import { Check, Calendar, Trash2 } from "lucide-react";
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
  high: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  urgent: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  medium: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  low: "text-blue-400 bg-blue-500/15 border-blue-500/30",
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

export default function TasksCard({ task, onToggle, onDelete }: TasksCardProps) {
  const priority = task.data?.priority || "medium";
  const due = formatDueDate(task.data?.dueDate);

  return (
    <div
      className="group relative flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.05]"
      onClick={() => onToggle(task.id, !!task.done)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id, !!task.done);
          }}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
            task.done
              ? "border-emerald-400 bg-emerald-500 text-zinc-950 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
              : "border-white/20 hover:border-emerald-400"
          }`}
          aria-label={task.done ? "Marquer non terminée" : "Marquer terminée"}
        >
          {task.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-medium transition-colors ${
              task.done
                ? "text-zinc-500 line-through opacity-60"
                : "text-zinc-200 group-hover:text-white"
            }`}
          >
            {task.title}
          </p>
          {due && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-zinc-400">
              <Calendar className="h-3 w-3" />
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

        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </motion.button>
      </div>
    </div>
  );
}
