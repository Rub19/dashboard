"use client";

import { memo } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Flame } from "lucide-react";
import { type Task } from "@/components/TasksWidget";
import { TaskItemRow } from "./TaskItemRow";

interface TasksKanbanViewProps {
  tasks: Task[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onNewTask: () => void;
}

export const TasksKanbanView = memo(function TasksKanbanView({
  tasks,
  onToggle,
  onDelete,
  onNewTask,
}: TasksKanbanViewProps) {
  const todoTasks = tasks.filter((t) => !t.done && !["urgent", "high"].includes(t.data?.priority || ""));
  const focusTasks = tasks.filter((t) => !t.done && ["urgent", "high"].includes(t.data?.priority || ""));
  const doneTasks = tasks.filter((t) => t.done);

  const columns = [
    { id: "focus", title: "Prioritaire & Focus", icon: Flame, items: focusTasks },
    { id: "todo", title: "À faire", icon: Clock, items: todoTasks },
    { id: "done", title: "Terminées", icon: CheckCircle2, items: doneTasks },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 h-full min-h-0 overflow-y-auto os-scroll pb-6">
      {columns.map((col) => (
        <div key={col.id} className="v8-panel flex min-h-[350px] flex-col p-3">
          {/* Column Header */}
          <div className="mb-3 flex items-center justify-between border-b border-[var(--panel-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
                <col.icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-primary)]">{col.title}</span>
            </div>
            <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{col.items.length}</span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-2 overflow-y-auto os-scroll pr-1">
            <AnimatePresence mode="popLayout">
              {col.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
                  <p className="text-xs">Aucune tâche</p>
                </div>
              ) : (
                col.items.map((task) => (
                  <TaskItemRow
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
});
