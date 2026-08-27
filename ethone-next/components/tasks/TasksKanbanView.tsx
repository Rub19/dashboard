"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, Clock, Flame, Check } from "lucide-react";
import { type Task } from "@/components/TasksWidget";
import { TaskItemRow } from "./TaskItemRow";
import { cn } from "@/lib/utils";

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
    {
      id: "focus",
      title: "Prioritaire & Focus",
      icon: Flame,
      color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      items: focusTasks,
    },
    {
      id: "todo",
      title: "À Faire",
      icon: Clock,
      color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
      items: todoTasks,
    },
    {
      id: "done",
      title: "Terminées",
      icon: CheckCircle2,
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      items: doneTasks,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 h-full min-h-0 overflow-y-auto os-scroll pb-6">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex flex-col rounded-3xl border border-white/10 bg-[#0c0d14]/70 p-4 backdrop-blur-2xl min-h-[350px]"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-xl border", col.color)}>
                <col.icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">{col.title}</span>
            </div>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-400">
              {col.items.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 space-y-2.5 overflow-y-auto os-scroll pr-1">
            <AnimatePresence mode="popLayout">
              {col.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
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
