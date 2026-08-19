"use client";

import { useMemo, useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { type Item } from "@/lib/hooks/useItems";
import { useCloudTasks } from "@/lib/hooks/useCloudTasks";
import { useToast } from "@/components/ToastProvider";
import BentoCard from "@/components/BentoCard";
import TodoList from "./TodoList";
import { cn } from "@/lib/utils";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = Item & {
  data?: {
    category?: string;
    priority?: TaskPriority;
    dueDate?: string;
  };
};

export type TasksData = {
  items: Item[];
  loading: boolean;
  error: Error | null;
  create: (input: Omit<Item, "id">) => Promise<unknown>;
  update: (id: string, input: Partial<Omit<Item, "id">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export type TasksWidgetProps = {
  className?: string;
  data?: TasksData;
  scrollable?: boolean;
};

export default function TasksWidget({ className = "", data, scrollable = true }: TasksWidgetProps) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const own = useCloudTasks();

  const { items, loading, create, update, remove } = data ?? own;

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((t) => t.done).length;
    const open = total - done;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, open, percentage };
  }, [items]);

  async function addTask(title: string) {
    if (!title.trim()) return;
    try {
      await create({
        title,
        body: "",
        done: false,
        data: { category: "Général", priority: "medium" as TaskPriority },
      });
      setNewTaskTitle("");
      success(i18n("added", "Ajouté"));
    } catch {
      showError(i18n("error", "Erreur"));
    }
  }

  async function toggleTask(id: string, done: boolean) {
    try {
      await update(id, { done: !done });
    } catch {
      showError(i18n("error", "Erreur"));
    }
  }

  async function deleteTask(id: string) {
    try {
      await remove(id);
      success(i18n("deleted", "Supprimé"));
    } catch {
      showError(i18n("error", "Erreur"));
    }
  }

  const badge = (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400">
      {stats.done} / {stats.total} {i18n("done", "terminées")}
    </span>
  );

  return (
    <BentoCard className={cn("h-full", className)} noHeader scrollable={scrollable}>
      <div className={cn("flex flex-col gap-4", scrollable ? "h-full min-h-0 overflow-hidden" : "h-full justify-between")}>
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
              <CheckSquare className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold tracking-wide text-white">
              {i18n("myTasks", "Mes Tâches")}
            </h3>
          </div>
          {badge}
        </div>

        <div className="shrink-0 w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Quick add */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask(newTaskTitle);
          }}
          className="relative flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 pl-3 transition-all duration-200 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/15 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
        >
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={i18n("tasksPlaceholder", "Ajouter une tâche...")}
            data-testid="new-task-input"
            className="w-full flex-1 bg-transparent text-xs font-medium text-white placeholder-zinc-500 outline-none"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || loading}
            className={`flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-950 font-bold transition-all active:scale-95 ${
              newTaskTitle.trim()
                ? "bg-emerald-500 hover:bg-emerald-400 shadow-md"
                : "cursor-not-allowed bg-zinc-700 text-zinc-500"
            }`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {/* List */}
        <TodoList
          className={scrollable ? "min-h-0 flex-1 overflow-hidden" : "h-auto overflow-visible"}
          tasks={items as Task[]}
          loading={loading}
          onToggle={toggleTask}
          onDelete={deleteTask}
          scrollable={scrollable}
        />
      </div>
    </BentoCard>
  );
}
