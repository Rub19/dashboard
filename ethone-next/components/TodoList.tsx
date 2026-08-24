"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useListKeyboard } from "@/lib/hooks/useListKeyboard";
import { cn } from "@/lib/utils";
import TasksCard, { type Task } from "./TasksCard";

type Filter = "all" | "open" | "done" | "priority";

export type TodoListProps = {
  tasks: Task[];
  loading: boolean;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  className?: string;
  scrollable?: boolean;
};

export default function TodoList({ tasks, loading, onToggle, onDelete, className = "", scrollable = true }: TodoListProps) {
  const i18n = useI18n();
  const [filter, setFilter] = useState<Filter>("all");

  const tabs: { id: Filter; label: string; count: number }[] = useMemo(() => {
    const all = tasks.length;
    const open = tasks.filter((t) => !t.done).length;
    const done = tasks.filter((t) => t.done).length;
    const priority = tasks.filter((t) => t.done ? false : ["high", "urgent"].includes(t.data?.priority || "")).length;
    return [
      { id: "all", label: i18n("all", "Toutes"), count: all },
      { id: "open", label: i18n("open", "En cours"), count: open },
      { id: "done", label: i18n("done", "Terminées"), count: done },
      { id: "priority", label: i18n("priorities", "Prioritaires"), count: priority },
    ];
  }, [tasks, i18n]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "open") return tasks.filter((t) => !t.done);
    if (filter === "done") return tasks.filter((t) => t.done);
    if (filter === "priority") return tasks.filter((t) => !t.done && ["high", "urgent"].includes(t.data?.priority || ""));
    return tasks;
  }, [tasks, filter]);

  const { activeIndex, handleKeyDown } = useListKeyboard({
    items: filtered,
    onSelect: (task) => onToggle(task.id, !!task.done),
    onDelete: (task) => onDelete(task.id),
    selectMessage: null,
    deleteMessage: null,
  });

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-[var(--text-muted)]">
        {i18n("loading", "Chargement...")}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-3",
      scrollable ? "h-full min-h-0 overflow-hidden" : "h-auto overflow-visible",
      className
    )}>
      <div className="shrink-0 flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] p-1 text-[11px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-lg px-3 py-1 transition-all ${
              filter === tab.id
                ? "border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.08] font-bold text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}{" "}
            <span className="opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex flex-col outline-none",
          scrollable ? "min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden" : "h-auto overflow-visible"
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <CheckCircle2 className="mb-2 h-10 w-10 text-[var(--text-muted)]/30" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {i18n("noTasks", "Votre journée est libre.")}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {i18n(
                  "tasksEmptyHint",
                  "Ajoutez un objectif dès que vous êtes prêt."
                )}
              </p>
            </motion.div>
          ) : (
            filtered.map((task, index) => (
              <motion.div
                key={task.id}
                data-context-menu="task"
                data-context-id={task.id}
                data-active={index === activeIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className={cn(
                  "rounded-xl",
                  index === activeIndex && "ring-1 ring-[var(--accent-primary)]/50"
                )}
              >
                <TasksCard task={task} onToggle={onToggle} onDelete={onDelete} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
